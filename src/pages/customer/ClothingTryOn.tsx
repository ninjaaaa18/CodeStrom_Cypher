import { useCallback, useEffect, useRef, useState, type ChangeEvent, Fragment } from 'react'
import { Link } from 'react-router-dom'
import { FilesetResolver, PoseLandmarker, type NormalizedLandmark } from '@mediapipe/tasks-vision'
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  CircleAlert,
  RefreshCw,
  RotateCcw,
  ScanLine,
  ShieldCheck,
  Shirt,
  Upload,
  Video,
  VideoOff,
  X,
} from 'lucide-react'
import {
  PRODUCTS,
  getProductById,
  type ProductCategory,
} from '../../features/products/productCatalog'
import { CUSTOMER_PATHS } from '../../features/customer/customerPaths'
import {
  AR_SUPPORTED_GARMENT_IDS,
  drawArGarmentOverlay,
  estimateTorso,
  isArSupportedGarment,
  smoothTorso,
  type TorsoEstimate,
} from './arGarmentOverlay'
import './clothingTryOn.css'

// Same MediaPipe wasm build the sunglasses Magic Mirror already uses â€” no new
// dependency. The pose model is fetched on demand (â‰ˆ9 MB, Apache-2.0). If the
// device is offline the feature degrades to a clear "model unavailable" state
// and the photo stays private. See the report for self-hosting as a next step.
const WASM_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.1.0/wasm'
const POSE_MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task'

// Live AR status is separate from the still-photo pose status above: the
// camera is off by default and starts only when the user asks.
type ArStatus =
  | 'off'
  | 'requesting'
  | 'loading'
  | 'tracking'
  | 'no-person'
  | 'model-unavailable'
  | 'error'

const AR_STATUS_COPY: Record<ArStatus, { label: string; tone: 'quiet' | 'active' | 'warning' | 'error' }> = {
  off: { label: '', tone: 'quiet' },
  requesting: { label: 'Requesting camera access…', tone: 'active' },
  loading: { label: 'Loading the on-device pose model…', tone: 'active' },
  tracking: { label: 'Tracking your torso — the overlay follows your movement.', tone: 'active' },
  'no-person': { label: 'No person detected — step back so shoulders and hips are visible.', tone: 'warning' },
  'model-unavailable': {
    label: 'Pose model could not load (you may be offline). Camera frames stay on this device.',
    tone: 'error',
  },
  error: { label: 'The camera could not be started.', tone: 'error' },
}

function cameraErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    if (error.name === 'NotAllowedError' || error.name === 'SecurityError') {
      return 'Camera access was blocked. Allow camera access in the browser prompt, then try again.'
    }
    if (error.name === 'NotFoundError' || error.name === 'OverconstrainedError') {
      return 'No camera was found on this device.'
    }
    if (error.name === 'NotReadableError') {
      return 'The camera is already in use by another app. Close it, then try again.'
    }
    if (error.message === 'insecure-context') {
      return 'Camera access needs a secure (https or localhost) page.'
    }
    if (error.message === 'unsupported-camera-api') {
      return 'This browser does not support camera access. Try a recent Chrome, Edge, Firefox, or Safari.'
    }
    if (error.message) return error.message
  }
  return 'The camera could not be started. Check permissions and try again.'
}

// Pose analysis lifecycle for the uploaded still image (never the camera).
type PoseStatus =
  | 'idle'
  | 'loading-model'
  | 'detecting'
  | 'success'
  | 'no-person'
  | 'model-unavailable'
  | 'error'

// Live camera + on-device pose tracking lifecycle. The camera is always off
// until the shopper presses "Start camera".
type LiveStatus =
  | 'off'
  | 'starting'
  | 'loading-model'
  | 'tracking'
  | 'no-person'
  | 'model-unavailable'
  | 'error'

const LIVE_COPY: Record<LiveStatus, { label: string; tone: 'quiet' | 'active' | 'warning' | 'error' }> = {
  off: { label: '', tone: 'quiet' },
  starting: { label: 'Requesting camera access…', tone: 'active' },
  'loading-model': { label: 'Loading the on-device pose model…', tone: 'active' },
  tracking: { label: 'Tracking your torso. Move naturally — the overlay follows you.', tone: 'active' },
  'no-person': { label: 'No person detected. Step back so your shoulders and hips are visible.', tone: 'warning' },
  'model-unavailable': {
    label: 'Pose model could not load (you may be offline). No camera frames were uploaded or saved.',
    tone: 'error',
  },
  error: { label: 'The live preview could not start.', tone: 'error' },
}

function liveErrorMessage(error: unknown): string {
  if (error instanceof DOMException) {
    if (error.name === 'NotAllowedError') {
      return 'Camera access was denied. Allow camera access in your browser and try again — frames stay on this device.'
    }
    if (error.name === 'NotFoundError' || error.name === 'OverconstrainedError') {
      return 'No usable camera was found on this device.'
    }
    if (error.name === 'NotReadableError') {
      return 'The camera is busy in another app or tab. Close it and try again.'
    }
    if (error.name === 'SecurityError') {
      return 'Camera access needs a secure (HTTPS or localhost) page.'
    }
  }
  if (error instanceof Error) {
    if (error.message === 'unsupported-camera-api') {
      return 'This browser does not support camera access. Try a recent Chrome, Edge, Firefox, or Safari.'
    }
    if (error.message === 'insecure-context') {
      return 'Camera access needs a secure (HTTPS or localhost) page.'
    }
    if (typeof error.message === 'string' && error.message.length > 0) return error.message
  }
  return 'The live preview could not start. Check the camera and try again.'
}

const POSE_COPY: Record<PoseStatus, { label: string; tone: 'quiet' | 'active' | 'warning' | 'error' }> = {
  idle: { label: '', tone: 'quiet' },
  'loading-model': { label: 'Loading the body-pose modelâ€¦', tone: 'active' },
  detecting: { label: 'Analysing body pose in your photoâ€¦', tone: 'active' },
  success: { label: 'Pose detected in this photo.', tone: 'active' },
  'no-person': { label: 'No person detected in this photo.', tone: 'warning' },
  'model-unavailable': {
    label: 'Pose model could not load (you may be offline). Your photo stays private.',
    tone: 'error',
  },
  error: { label: 'Pose analysis could not run on this image.', tone: 'error' },
}

// What the pose layer does / does not do, used by the on-page note.
const POSE_NOTES = [
  {
    key: 'what',
    text: 'PoseLandmarker returns 33 body keypoints (nose, shoulders, elbows, wrists, hips, knees, ankles). It is a measurement skeleton, not a realistic garment cartoon.',
  },
  {
    key: 'no-composite',
    text: 'This milestone is intentionally a *pose-overlay* demo. It does not composite the garment onto your body â€” that is a later milestone.',
  },
  {
    key: 'local',
    text: 'All pose inference runs in-browser via MediaPipe\u2019s bundled WebAssembly runtime (Apache-2.0); the uploaded photo and the ~9 MB pose model never leave the client device.',
  },
  {
    key: 'offline',
    text: 'If the pose model cannot be fetched (offline), the page shows a clear "model unavailable" state and the photo stays untouched. It will not harm your session.',
  },
  {
    key: 'privacy',
    text: 'No camera, no microphone, and no auto-start. Activate pose analysis only by uploading a still photo, and remove it at any time.',
  },
]

// Only categories whose items are genuine body garments are offered in the
// fitting room. Fabric swatches, accessories and small essentials (e.g. socks)
// are intentionally excluded. Suitability is derived from the catalogue's own
// `category` field â€” no product IDs are invented or hard-coded here.
const TRYON_CATEGORIES: ProductCategory[] = ["Men's Wear", "Women's Wear", 'Ethnic Wear']

const TRYON_PRODUCTS = PRODUCTS.filter((product) =>
  TRYON_CATEGORIES.includes(product.category),
)

const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_PHOTO_BYTES = 12 * 1024 * 1024
const MIN_PHOTO_EDGE_PX = 256
const MAX_PHOTO_EDGE_PX = 6000

function priceLabel(price: number, unit: 'piece' | 'pair' | 'metre') {
  const suffix = unit === 'metre' ? ' / metre' : unit === 'pair' ? ' / pair' : ''
  return `â‚¹${price}${suffix}`
}

export function ClothingTryOn() {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [photoError, setPhotoError] = useState<string | null>(null)
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null)
  // Pose-analysis lifecycle for the current photo (still image, never camera).
  const [poseStatus, setPoseStatus] = useState<PoseStatus>('idle')
  const [poseSummary, setPoseSummary] = useState<string | null>(null)

  const inputRef = useRef<HTMLInputElement>(null)
  // Track the live object URL in a ref so cleanup is reliable even if the
  // component unmounts between renders.
  const objectUrlRef = useRef<string | null>(null)
  // Ticket for the async dimension probe so a stale probe can never accept
  // or reject a newer photo.
  const photoTicketRef = useRef(0)

  // Pose resources & bookkeeping.
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const cameraVideoRef = useRef<HTMLVideoElement | null>(null)
  const cameraCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const cameraStreamRef = useRef<MediaStream | null>(null)
  const cameraLandmarkerRef = useRef<PoseLandmarker | null>(null)
  const cameraRafRef = useRef<number>(0)
  const cameraSessionRef = useRef(0)
  const cameraBusyRef = useRef(false)
  const cameraStartingRef = useRef(false)
  const cameraTorsoRef = useRef<TorsoEstimate | null>(null)
  const cameraMissingRef = useRef(0)
  const [cameraState, setCameraState] = useState<'off' | 'starting' | 'live'>('off')
  const [cameraNotice, setCameraNotice] = useState<string | null>(null)
  const [cameraHasPose, setCameraHasPose] = useState(false)
  const frameRef = useRef<HTMLDivElement | null>(null)
  const imageRef = useRef<HTMLImageElement | null>(null)
  const landmarkerRef = useRef<PoseLandmarker | null>(null)
  const modelPromiseRef = useRef<Promise<PoseLandmarker> | null>(null)
  const sessionRef = useRef(0) // bumped on every new photo/clear to drop stale runs
  const mountedRef = useRef(true)
  const naturalSizeRef = useRef({ width: 0, height: 0 })
  const lastLandmarksRef = useRef<OverlayPoint[] | null>(null)
  const resizeObserverRef = useRef<ResizeObserver | null>(null)

  // Live AR preview (webcam) resources. Camera is off by default; frames
  // never leave the browser and no stills are captured or stored.
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const liveCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const liveStreamRef = useRef<MediaStream | null>(null)
  const livePoseRef = useRef<PoseLandmarker | null>(null)
  const liveModelPromiseRef = useRef<Promise<PoseLandmarker> | null>(null)
  const liveRafRef = useRef<number | null>(null)
  const liveSessionRef = useRef(0)
  const liveBusyRef = useRef(false)
  const liveTorsoRef = useRef<TorsoEstimate | null>(null)
  const liveLastSeenRef = useRef(0)
  const liveStartingRef = useRef(false)
  const liveTrackListenersRef = useRef<Array<{ track: MediaStreamTrack; listener: () => void }>>([])
  const selectedProductIdRef = useRef<string | null>(null)
  const [liveStatus, setLiveStatus] = useState<LiveStatus>('off')
  const [liveError, setLiveError] = useState('')
  const [liveActive, setLiveActive] = useState(false)
  const [liveHasPerson, setLiveHasPerson] = useState(false)

  // Release resources when the fitting room unmounts.
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      sessionRef.current += 1 // invalidate any in-flight detection
      liveSessionRef.current += 1 // invalidate any in-flight live tracking
      resizeObserverRef.current?.disconnect()
      resizeObserverRef.current = null
      if (liveRafRef.current !== null) {
        cancelAnimationFrame(liveRafRef.current)
        liveRafRef.current = null
      }
      for (const { track, listener } of liveTrackListenersRef.current) {
        track.removeEventListener('ended', listener)
      }
      liveTrackListenersRef.current = []
      if (liveStreamRef.current) {
        liveStreamRef.current.getTracks().forEach((track) => track.stop())
        liveStreamRef.current = null
      }
      livePoseRef.current?.close()
      livePoseRef.current = null
      liveModelPromiseRef.current = null
      landmarkerRef.current?.close()
      landmarkerRef.current = null
      modelPromiseRef.current = null
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current)
        objectUrlRef.current = null
      }
    }
  }, [])

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (canvas && context) context.clearRect(0, 0, canvas.width, canvas.height)
  }, [])

  // Redraws the last-known skeleton at the current frame size. Kept separate
  // from inference so the overlay stays aligned when the container resizes.
  const drawOverlay = useCallback(() => {
    const canvas = canvasRef.current
    const frame = frameRef.current
    const landmarks = lastLandmarksRef.current
    const { width: naturalW, height: naturalH } = naturalSizeRef.current
    if (!canvas || !frame || !landmarks || !naturalW || !naturalH) return

    const context = canvas.getContext('2d')
    if (!context) return

    const bounds = frame.getBoundingClientRect()
    const pixelRatio = window.devicePixelRatio || 1

function cameraErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    if (error.name === 'NotAllowedError') {
      return 'Camera access was denied. Allow camera use in the browser prompt, then try again.'
    }
    if (error.name === 'NotFoundError' || error.name === 'OverconstrainedError') {
      return 'No camera was found on this device. Connect a camera or use a still photo instead.'
    }
    if (error.name === 'NotReadableError') {
      return 'The camera is busy in another app or tab. Close it and try again.'
    }
    if (error.message === 'insecure-context') {
      return 'Camera access needs a secure (https or localhost) page. Still-photo pose analysis still works.'
    }
    if (error.message === 'unsupported-camera-api') {
      return 'This browser does not support camera access. Try a recent Chrome, Edge, Firefox, or Safari.'
    }
  }
  return 'The live preview could not start. Check the camera permission and try again.'
}

    const cssW = Math.max(1, Math.round(bounds.width))
    const cssH = Math.max(1, Math.round(bounds.height))
    canvas.width = Math.round(cssW * pixelRatio)
    canvas.height = Math.round(cssH * pixelRatio)
    canvas.style.width = `${cssW}px`
    canvas.style.height = `${cssH}px`

    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
    context.clearRect(0, 0, cssW, cssH)
    drawPoseOverlay(context, landmarks, naturalW, naturalH, cssW, cssH, {
      bone: 'rgba(180, 107, 62, 0.6)',
      joint: 'rgba(251, 247, 241, 0.9)',
      keyJoint: '#b04717',
      keyRing: 'rgba(176, 71, 23, 0.22)',
    })
  }, [])

  // Lazily create the PoseLandmarker once; concurrent callers share one promise.
  const ensureLandmarker = useCallback(async (): Promise<PoseLandmarker> => {
    if (landmarkerRef.current) return landmarkerRef.current
    if (!modelPromiseRef.current) {
      modelPromiseRef.current = (async () => {
        const fileset = await FilesetResolver.forVisionTasks(WASM_URL)
        const landmarker = await PoseLandmarker.createFromOptions(fileset, {
          baseOptions: { modelAssetPath: POSE_MODEL_URL, delegate: 'CPU' },
          runningMode: 'IMAGE',
          numPoses: 1,
        })
        landmarkerRef.current = landmarker
        return landmarker
      })()
    }
    return modelPromiseRef.current
  }, [])


  function clearPhoto() {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current)
      objectUrlRef.current = null
    }
    // Invalidate any in-flight pose run so a stale detection from the removed
    // photo can never overwrite the cleared state when it resolves.
    sessionRef.current += 1
    lastLandmarksRef.current = null
    clearCanvas()
    setPhotoUrl(null)
    setPhotoError(null)
    // Reset the input so the same file can be re-selected later.
    if (inputRef.current) inputRef.current.value = ''
    // Reset pose when swapping/replacing the photo, then let the new image
    // trigger its own session via the <img> onLoad handler.
    setPoseStatus('idle')
    setPoseSummary(null)
  }

  function probePhotoDimensions(url: string): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
      const probe = new Image()
      probe.onload = () => resolve({ width: probe.naturalWidth, height: probe.naturalHeight })
      probe.onerror = () => reject(new Error(`unreadable`))
      probe.src = url
    })
  }

  async function handlePhotoChange(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget
    const file = input.files?.[0]
    if (!file) return

    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      setPhotoError('Please choose a JPEG, PNG or WebP image.')
      // Clear the input so correcting to the same filename still fires change.
      input.value = ''
      return
    }
    if (file.size > MAX_PHOTO_BYTES) {
      setPhotoError('That image is larger than 12 MB. Please choose a smaller photo.')
      input.value = ''
      return
    }

    const ticket = ++photoTicketRef.current
    // Revoke any previous photo before creating the new in-memory URL.
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
    const url = URL.createObjectURL(file)
    objectUrlRef.current = url
    // Clear the input value so picking the exact same file again (via the
    // Replace control) still fires a change event.
    input.value = ''
    // Probe dimensions before accepting: tiny or corrupt files get a clear
    // error instead of reaching pose inference. This stays fully local.
    try {
      const dims = await probePhotoDimensions(url)
      if (ticket !== photoTicketRef.current) {
        URL.revokeObjectURL(url)
        return
      }
      const shortEdge = Math.min(dims.width, dims.height)
      const longEdge = Math.max(dims.width, dims.height)
      if (!dims.width || !dims.height || shortEdge < MIN_PHOTO_EDGE_PX) {
        URL.revokeObjectURL(url)
        objectUrlRef.current = null
        setPhotoError('That photo is very small (under 256 px on its shortest side). A larger, front-facing photo works better.')
        return
      }
      if (longEdge > MAX_PHOTO_EDGE_PX) {
        URL.revokeObjectURL(url)
        objectUrlRef.current = null
        setPhotoError('That photo is extremely large (over 6000 px on an edge). Please use a smaller export.')
        return
      }
    } catch {
      if (ticket !== photoTicketRef.current) {
        URL.revokeObjectURL(url)
        return
      }
      URL.revokeObjectURL(url)
      objectUrlRef.current = null
      setPhotoError('That file could not be read as an image. Please try a different photo.')
      return
    }
    setPhotoUrl(url)
    setPhotoError(null)
    // Start a fresh pose lifecycle for this new photo (the <img> onLoad will
    // drive inference, and any stale in-flight run is invalidated). Drop any
    // previous skeleton immediately so it cannot flash over the new photo.
    lastLandmarksRef.current = null
    clearCanvas()
    setPoseStatus('idle')
    setPoseSummary(null)
    sessionRef.current += 1
  }

  // Keep the skeleton aligned to the body as the stage resizes, even though the
  // underlying photo keeps its native aspect ratio (object-fit: contain).
  useEffect(() => {
    const frame = frameRef.current
    if (!frame) return
    const observer = new ResizeObserver(() => {
      if (mountedRef.current) drawOverlay()
    })
    observer.observe(frame)
    resizeObserverRef.current = observer
    return () => {
      observer.disconnect()
      resizeObserverRef.current = null
    }
  }, [drawOverlay])

  function toggleGarment(id: string) {
    setSelectedProductId((current) => (current === id ? null : id))
  }


  // Runs pose inference on the already-loaded <img> (the uploaded blob), so the
  // pixels never leave the browser. `session` guards against stale results.
  const runPoseDetection = useCallback(
    async (session: number) => {
      setPoseStatus('detecting')
      try {
        const landmarker = await ensureLandmarker()
        if (!mountedRef.current || session !== sessionRef.current) return

        const image = imageRef.current
        if (!image || !image.complete || image.naturalWidth === 0) {
          setPoseStatus('error')
          return
        }

        // Yield a frame so the "analysingâ€¦" state paints before blocking work.

  // ---- Live AR camera (user-initiated, on-device, off by default) ----
  const liveGarmentIdRef = useRef<string | null>(null)
  useEffect(() => {
    liveGarmentIdRef.current = selectedProductId
  }, [selectedProductId])

  const releaseLiveCamera = useCallback((session: number, stopTracks: boolean) => {
    cancelAnimationFrame(cameraRafRef.current)
    cameraRafRef.current = 0
    cameraBusyRef.current = false
    if (stopTracks) {
      cameraStreamRef.current?.getTracks().forEach((track) => track.stop())
      cameraStreamRef.current = null
    }
    cameraLandmarkerRef.current?.close()
    cameraLandmarkerRef.current = null
    if (cameraSessionRef.current === session) {
      cameraTorsoRef.current = null
      cameraMissingRef.current = 0
    }
  }, [])

  const stopLiveCamera = useCallback(() => {
    const session = cameraSessionRef.current + 1
    cameraSessionRef.current = session
    releaseLiveCamera(session, true)
    if (cameraVideoRef.current) cameraVideoRef.current.srcObject = null
    cameraStartingRef.current = false
    setCameraHasPose(false)
    setCameraNotice(null)
    setCameraState('off')
  }, [releaseLiveCamera])

  const startLiveTracking = useCallback(
    (session: number, landmarker: PoseLandmarker) => {
      const video = cameraVideoRef.current
      const canvas = cameraCanvasRef.current
      if (!video || !canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      let lastVideoTime = -1

      const renderLiveOverlay = (
        ctx: CanvasRenderingContext2D,
        canvas: HTMLCanvasElement,
        vw: number,
        vh: number,
      ) => {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        const torso = cameraTorsoRef.current
        if (!torso) return
        // The preview is mirrored via CSS (selfie view); mirror the canvas
        // drawing the same way so the overlay stays aligned with the body.
        ctx.save()
        ctx.translate(canvas.width, 0)
        ctx.scale(-1, 1)
        drawArGarmentOverlay(ctx, torso, vw, vh, canvas.width, canvas.height, liveGarmentIdRef.current ?? '')
        ctx.restore()
      }

      const tick = () => {
        if (session !== cameraSessionRef.current) return
        cameraRafRef.current = requestAnimationFrame(tick)
        const vw = video.videoWidth
        const vh = video.videoHeight
        if (!vw || !vh || video.readyState < 2) return
        if (canvas.width !== vw || canvas.height !== vh) {
          canvas.width = vw
          canvas.height = vh
        }
        // Throttle: one in-flight inference max, and skip duplicate frames.
        if (cameraBusyRef.current || video.currentTime === lastVideoTime) {
          renderLiveOverlay(ctx, canvas, vw, vh)
          return
        }
        lastVideoTime = video.currentTime
        cameraBusyRef.current = true
        let result: { landmarks?: NormalizedLandmark[][] } | undefined
        try {
          result = landmarker.detectForVideo(video, performance.now())
        } catch {
          result = undefined
        }
        cameraBusyRef.current = false
        if (session !== cameraSessionRef.current) return
        const landmarks = result?.landmarks?.[0]
        const torso = estimateTorso(landmarks)
        if (torso) {
          cameraTorsoRef.current = smoothTorso(cameraTorsoRef.current, torso)
          cameraMissingRef.current = 0
          setCameraHasPose(true)
        } else {
          cameraMissingRef.current += 1
          // Hide after ~10 missed frames instead of flickering per-frame.
          if (cameraMissingRef.current > 10) {
            cameraTorsoRef.current = null
            setCameraHasPose(false)
          }
        }
        renderLiveOverlay(ctx, canvas, vw, vh)
      }

      cameraRafRef.current = requestAnimationFrame(tick)
    },
    [],
  )

  const startLiveCamera = useCallback(async () => {
    if (cameraStartingRef.current || cameraStreamRef.current) return
    cameraStartingRef.current = true
    const session = cameraSessionRef.current + 1
    cameraSessionRef.current = session
    cameraTorsoRef.current = null
    cameraMissingRef.current = 0
    setCameraHasPose(false)
    setCameraNotice(null)
    setCameraState('starting')
    setCameraNotice('Requesting camera access. Video stays in this tab.')

    try {
      if (!window.isSecureContext) throw new Error('insecure-context')
      if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== 'function') {
        throw new Error('unsupported-camera-api')
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 960 } },
      })
      if (session !== cameraSessionRef.current) {
        stream.getTracks().forEach((track) => track.stop())
        return
      }
      cameraStreamRef.current = stream
      stream.getTracks().forEach((track) => {
        track.addEventListener('ended', () => {
          if (session !== cameraSessionRef.current) return
          releaseLiveCamera(session, false)
          cameraStreamRef.current = null
          setCameraHasPose(false)
          setCameraState('off')
          setCameraNotice('The camera connection ended. Start the preview again when ready.')
        })
      })
      const video = cameraVideoRef.current
      if (!video) throw new Error('preview-unavailable')
      video.srcObject = stream
      await video.play()
      if (session !== cameraSessionRef.current) return
      setCameraNotice('Loading the on-device pose model. Frames never leave this tab.')
      const fileset = await FilesetResolver.forVisionTasks(WASM_URL)
      if (session !== cameraSessionRef.current) return
      const landmarker = await PoseLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: POSE_MODEL_URL },
        runningMode: 'VIDEO',
        numPoses: 1,
        minPoseDetectionConfidence: 0.5,
        minPosePresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
      })
      if (session !== cameraSessionRef.current) {
        landmarker.close()
        return
      }
      cameraLandmarkerRef.current = landmarker
      setCameraState('live')
      setCameraNotice('Live AR preview. Stand back so shoulders and hips are visible.')
      startLiveTracking(session, landmarker)
    } catch (error) {
      if (session !== cameraSessionRef.current) return
      releaseLiveCamera(session, true)
      cameraStreamRef.current = null
      if (cameraVideoRef.current) cameraVideoRef.current.srcObject = null
      setCameraHasPose(false)
      setCameraState('off')
      setCameraNotice(cameraErrorMessage(error))
    } finally {
      if (session === cameraSessionRef.current) cameraStartingRef.current = false
    }
  }, [releaseLiveCamera, startLiveTracking])

  // Stop tracks + landmarker + frames when leaving the page.
  useEffect(
    () => () => {
      const session = cameraSessionRef.current + 1
      cameraSessionRef.current = session
      releaseLiveCamera(session, true)
    },
    [releaseLiveCamera],
  )


        await new Promise((resolve) => setTimeout(resolve, 0))
        if (!mountedRef.current || session !== sessionRef.current) return

        const result = landmarker.detect(image)
        if (!mountedRef.current || session !== sessionRef.current) return

        const firstPose = result.landmarks[0]
        if (!firstPose || firstPose.length === 0) {
          lastLandmarksRef.current = null
          clearCanvas()
          setPoseSummary(null)
          setPoseStatus('no-person')
          return
        }

        lastLandmarksRef.current = firstPose.map((point: NormalizedLandmark) => ({
          x: point.x,
          y: point.y,
          visibility: point.visibility,
        }))
        drawOverlay()
        setPoseSummary(`${firstPose.length} landmarks Â· 1 person`)
        setPoseStatus('success')
      } catch (error) {
        if (!mountedRef.current || session !== sessionRef.current) return
        lastLandmarksRef.current = null
        clearCanvas()
        setPoseSummary(null)
        // Distinguish "model failed to load (offline/CDN)" from a bad image.
        const message = error instanceof Error ? error.message : String(error)
        setPoseStatus(/fetch|network|load|wasm| Failed to|error/i.test(message) ? 'model-unavailable' : 'error')
      }
    },
    [clearCanvas, drawOverlay, ensureLandmarker],
  )

  // Kick off a fresh pose session for the current photo.
  const startPoseSession = useCallback(() => {
    sessionRef.current += 1
    const session = sessionRef.current
    lastLandmarksRef.current = null
    clearCanvas()
    setPoseSummary(null)
    setPoseStatus('loading-model')
    void runPoseDetection(session)
  }, [clearCanvas, runPoseDetection])

  function retryPose() {
    if (!photoUrl) return
    startPoseSession()
  }

  const selectedProduct = getProductById(selectedProductId ?? undefined)

  return (
    <section className="clothing-tryon-page" aria-labelledby="clothing-tryon-title">
      <header className="clothing-tryon-heading">
        <div>
          <p className="clothing-tryon-kicker">
            <span>SWIFTORA / STUDIO 02</span>
            <span className="clothing-tryon-kicker-divider" aria-hidden="true" />
            <span>CLOTHING TRY-ON</span>
          </p>
          <h1 id="clothing-tryon-title">
            Step into the <em>fitting room.</em>
          </h1>
        </div>
        <p className="clothing-tryon-intro">
          Add a private photo, then browse real pieces from the collection beside
          it. Nothing you add here is ever uploaded or saved.
        </p>
      </header>

      <div className="clothing-tryon-workspace">
        <section className="tryon-stage" aria-label="Your fitting-room photo">
          <div className="tryon-stage-topline">
            <span className="tryon-stage-label">YOUR PHOTO</span>
            <span className="tryon-stage-index">FRâ€”02</span>
          </div>
          

          <div
            ref={frameRef}
            className="tryon-photo-frame"
            aria-label="Your fitting-room photo"
          >
            {photoUrl ? (
              <>
                <img
                  ref={imageRef}
                  className="tryon-photo"
                  src={photoUrl}
                  alt="The photo you added to this fitting room"
                  onLoad={() => {
                    // Capture the natural (object-fit: contain) size so pose
                    // landmarks can be mapped back onto the body regardless of
                    // the container's aspect ratio or CSS size.
                    const image = imageRef.current
                    if (image) naturalSizeRef.current = { width: image.naturalWidth, height: image.naturalHeight }
                    startPoseSession()
                  }}
                />
                <span className="tryon-photo-badge">IN-BROWSER ONLY</span>
                {/* Previously captured still-body analysis. Never the camera. */}
                <canvas
                  ref={canvasRef}
                  className="tryon-pose-overlay"
                  aria-hidden="true"
                  data-status={poseStatus}
                />
                {poseStatus === 'loading-model' || poseStatus === 'detecting' ? (
                  <span className="tryon-pose-status">{POSE_COPY[poseStatus].label}</span>
                ) : null}
                {poseStatus === 'success' || poseStatus === 'no-person' ? (
                  <span className="tryon-pose-status">
                    <ScanLine size={14} aria-hidden="true" />
                    {POSE_COPY[poseStatus].label}
                    {poseStatus === 'success' && poseSummary ? <span className="tryon-pose-count">{poseSummary}</span> : null}
                  </span>
                ) : null}
                {poseStatus === 'model-unavailable' || poseStatus === 'error' ? (
                  <span className="tryon-pose-status">
                    <CircleAlert size={14} aria-hidden="true" />
                    {POSE_COPY[poseStatus].label}
                    <button
                      className="tryon-button tryon-button-ghost"
                      type="button"
                      onClick={retryPose}
                      disabled={!photoUrl}
                    >
                      <RefreshCw size={13} aria-hidden="true" />
                      Try again
                    </button>
                  </span>
                ) : null}
              </>
            ) : (
              <div className="tryon-photo-empty">
                <span className="tryon-photo-icon" aria-hidden="true">
                  <Upload size={28} strokeWidth={1.35} />
                </span>
                <p className="tryon-photo-empty-title">Add a photo to begin.</p>
                <p className="tryon-photo-empty-copy">
                  A plain, full-length photo works best. It stays on your device.
                </p>
                <button
                  className="tryon-button tryon-button-primary"
                  type="button"
                  onClick={() => inputRef.current?.click()}
                >
                  Choose a photo <Upload size={15} aria-hidden="true" />
                </button>
              </div>
            )}
          </div>

          <input
            ref={inputRef}
            className="tryon-file-input"
            type="file"
            accept={ACCEPTED_IMAGE_TYPES.join(',')}
            onChange={handlePhotoChange}
            aria-label="Choose a photo to try clothes against"
          />

          {photoUrl && (
            <div className="tryon-photo-controls">
              <button
                className="tryon-button tryon-button-primary"
                type="button"
                onClick={() => inputRef.current?.click()}
              >
                Replace photo <Upload size={15} aria-hidden="true" />
              </button>
              <button
                className="tryon-button tryon-button-ghost"
                type="button"
                onClick={clearPhoto}
              >
                Remove photo <RotateCcw size={14} aria-hidden="true" />
              </button>
            </div>
          )}

          {photoError && (
            <p className="tryon-error" role="alert">
              <CircleAlert size={15} aria-hidden="true" />
              <span>{photoError}</span>
            </p>
          )}

          <p className="tryon-secure-note">
            <ShieldCheck size={15} aria-hidden="true" />
            <span>
              Your photo is read from your device and stays in this browser tab. It is
              never uploaded, stored, or shared.
            </span>
          </p>

          <p className="tryon-pose-note">
            <ScanLine size={15} aria-hidden="true" />
            <span>
              <strong className="tryon-pose-note-title">Body-pose analysis runs locally</strong>
              {POSE_NOTES.map((note) => (
                <Fragment key={note.key}>
                  <br />
                  {note.text}
                </Fragment>
              ))}
            </span>
          </p>

          <p className="tryon-stage-caption">
            <span>PRIVATE FITTING ROOM</span>
            <span>NO IMAGE LEAVES THIS DEVICE</span>
          </p>
        </section>
          

        <aside className="tryon-panel" aria-label="Choose a garment">
          <div className="tryon-panel-head">
            <p className="tryon-panel-eyebrow">CHOOSE A GARMENT</p>
            <h2>
              Pieces to<br />
              <em>consider.</em>
            </h2>
          </div>

          {TRYON_PRODUCTS.length > 0 ? (
            <fieldset className="tryon-garment-selector">
              <legend className="tryon-visually-hidden">
                Select a garment from the collection
              </legend>
              <div className="tryon-garment-grid">
                {TRYON_PRODUCTS.map((product) => {
                  const isSelected = selectedProductId === product.id
                  return (
                    <button
                      key={product.id}
                      className={`tryon-garment${isSelected ? ' is-selected' : ''}`}
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() => toggleGarment(product.id)}
                    >
                      <span className="tryon-garment-thumb">
                        {product.imageSrc ? (
                          <img src={product.imageSrc} alt="" loading="lazy" />
                        ) : (
                          <Shirt size={20} aria-hidden="true" />
                        )}
                      </span>
                      <span className="tryon-garment-name">{product.name}</span>
                      <span className="tryon-garment-meta">{product.category}</span>
                    </button>
                  )
                })}
              </div>
            </fieldset>
          ) : (
            <p className="tryon-panel-empty">
              No try-on garments are available in this demo edit yet.
            </p>
          )}

          {selectedProduct ? (
            <div className="tryon-selected">
              <div className="tryon-selected-head">
                <p className="tryon-selected-kicker">SELECTED GARMENT</p>
                <button
                  className="tryon-selected-clear"
                  type="button"
                  onClick={() => setSelectedProductId(null)}
                  aria-label="Clear the selected garment"
                >
                  <X size={14} aria-hidden="true" />
                </button>
              </div>
              <h3>{selectedProduct.name}</h3>
              <p className="tryon-selected-price">
                {priceLabel(selectedProduct.price, selectedProduct.sellingUnit)}
              </p>
              <dl className="tryon-selected-specs">
                <div>
                  <dt>Material</dt>
                  <dd>{selectedProduct.material}</dd>
                </div>
                <div>
                  <dt>Colour</dt>
                  <dd>{selectedProduct.color}</dd>
                </div>
                <div>
                  <dt>Sizes</dt>
                  <dd>
                    {selectedProduct.sizeOptions.length
                      ? selectedProduct.sizeOptions.join('·')
                      : 'One size'}
                  </dd>
                </div>
              </dl>
              <p className="tryon-selected-desc">{selectedProduct.description}</p>
              <Link
                className="tryon-selected-link"
                to={`/products/${selectedProduct.id}`}
              >
                View details &amp; add to cart <ArrowRight size={15} aria-hidden="true" />
              </Link>
            </div>
          ) : (
            <p className="tryon-selected-empty" role="status">
              Select a garment to see its details beside your photo.
            </p>
          )}

          <p className="tryon-disclaimer">
            <strong>Fitting-room foundation.</strong> Garments are shown beside your
            photo for now â€” they are not yet composited onto your body. This keeps the
            preview honest while a pose-aware renderer is developed. Real garment replacement is not available in this build: no try-on model weights or approved inference service are configured, so no Generate action is offered.
          </p>

          <div className="tryon-panel-links">
            <Link className="tryon-return-link" to={CUSTOMER_PATHS.products}>
              <ArrowLeft size={15} aria-hidden="true" /> Return to the collection
            </Link>
            <Link className="tryon-return-link" to={CUSTOMER_PATHS.magicMirror}>
              Try sunglasses instead <ArrowRight size={15} aria-hidden="true" />
            </Link>
          </div>
        </aside>
      </div>

      <footer className="tryon-privacy">
        <span className="tryon-privacy-mark" aria-hidden="true">S</span>
        <p>
          <strong>A private fitting room, by design.</strong> Any photo you add is read
          straight from your device into this browser tab and is never uploaded, stored,
          or shared. Removing your photo â€” or leaving this page â€” releases it from
          memory immediately.
        </p>
      </footer>
    </section>
  )
}





