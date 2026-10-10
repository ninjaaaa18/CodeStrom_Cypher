import { useCallback, useEffect, useRef, useState } from 'react'
import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision'
import { ArrowRight, Camera, CircleAlert, ScanFace, ShieldCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import { CUSTOMER_PATHS } from '../../features/customer/customerPaths'
import './magicMirror.css'

const WASM_URL =
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.1.0/wasm'
const FACE_LANDMARKER_MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task'

type MirrorStatus =
  | 'waiting'
  | 'requesting'
  | 'loading'
  | 'looking'
  | 'detected'
  | 'multiple'
  | 'unavailable'
  | 'error'

type FrameStyle = 'round' | 'square' | 'catEye' | 'aviator'

type Point = { x: number; y: number }

type EyeGeometry = {
  imageLeftCenter: Point
  imageRightCenter: Point
  imageLeftInner: Point
  imageRightInner: Point
  anchor: Point
  area: number
}

type StatusCopy = {
  label: string
  detail: string
  tone: 'quiet' | 'active' | 'warning' | 'error'
}

const STATUS_COPY: Record<MirrorStatus, StatusCopy> = {
  waiting: {
    label: 'Choose a frame to begin',
    detail: 'Select a style, then start the camera when you’re ready.',
    tone: 'quiet',
  },
  requesting: {
    label: 'Camera permission requested',
    detail: 'Allow camera access in your browser to begin the live preview.',
    tone: 'active',
  },
  loading: {
    label: 'Preparing your mirror',
    detail: 'Loading face-tracking resources. A model file may be downloaded now.',
    tone: 'active',
  },
  looking: {
    label: 'Looking for you',
    detail: 'Center your face in the viewfinder and look toward the screen.',
    tone: 'active',
  },
  detected: {
    label: 'Face detected',
    detail: 'Your selected frame is following your eye position.',
    tone: 'active',
  },
  multiple: {
    label: 'Multiple faces detected',
    detail: 'Following the closest face to the previous position.',
    tone: 'active',
  },
  unavailable: {
    label: 'Tracking unavailable',
    detail: 'The camera is on, but the sunglasses preview is unavailable.',
    tone: 'warning',
  },
  error: {
    label: 'Camera unavailable',
    detail: 'Check your browser permission and camera, then try again.',
    tone: 'error',
  },
}

const FRAME_OPTIONS: { id: FrameStyle; label: string; description: string }[] = [
  { id: 'round', label: 'Classic round', description: 'Soft, rounded rims' },
  { id: 'square', label: 'Bold square', description: 'Defined squared rims' },
  { id: 'catEye', label: 'Cat-eye', description: 'Lifted outer corners' },
  { id: 'aviator', label: 'Aviator', description: 'Teardrop lenses' },
]

function connectionIndices(
  connections: ReadonlyArray<{ start: number; end: number }>,
): number[] {
  return [...new Set(connections.flatMap(({ start, end }) => [start, end]))]
}

const LEFT_EYE_INDICES = connectionIndices(FaceLandmarker.FACE_LANDMARKS_LEFT_EYE)
const RIGHT_EYE_INDICES = connectionIndices(FaceLandmarker.FACE_LANDMARKS_RIGHT_EYE)

function averagePoint(landmarks: ReturnType<FaceLandmarker['detectForVideo']>['faceLandmarks'][number], indices: number[]): Point | null {
  const points = indices
    .map((index) => landmarks[index])
    .filter((point) => point && Number.isFinite(point.x) && Number.isFinite(point.y))
  if (points.length === 0) return null
  return points.reduce(
    (sum, point) => ({ x: sum.x + point.x / points.length, y: sum.y + point.y / points.length }),
    { x: 0, y: 0 },
  )
}

function innerEyePoint(
  landmarks: ReturnType<FaceLandmarker['detectForVideo']>['faceLandmarks'][number],
  indices: number[],
  otherEye: Point,
): Point | null {
  let nearest: Point | null = null
  let nearestDistance = Number.POSITIVE_INFINITY
  indices.forEach((index) => {
    const point = landmarks[index]
    if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) return
    const distance = (point.x - otherEye.x) ** 2 + (point.y - otherEye.y) ** 2
    if (distance < nearestDistance) {
      nearest = { x: point.x, y: point.y }
      nearestDistance = distance
    }
  })
  return nearest
}

function faceArea(
  landmarks: ReturnType<FaceLandmarker['detectForVideo']>['faceLandmarks'][number],
): number {
  const xs = landmarks.map(({ x }) => x)
  const ys = landmarks.map(({ y }) => y)
  return (Math.max(...xs) - Math.min(...xs)) * (Math.max(...ys) - Math.min(...ys))
}

function getEyeGeometry(
  landmarks: ReturnType<FaceLandmarker['detectForVideo']>['faceLandmarks'][number],
): EyeGeometry | null {
  const leftCenter = averagePoint(landmarks, LEFT_EYE_INDICES)
  const rightCenter = averagePoint(landmarks, RIGHT_EYE_INDICES)
  if (!leftCenter || !rightCenter) return null
  const leftInner = innerEyePoint(landmarks, LEFT_EYE_INDICES, rightCenter)
  const rightInner = innerEyePoint(landmarks, RIGHT_EYE_INDICES, leftCenter)
  if (!leftInner || !rightInner) return null
  const eyes = [
    { center: leftCenter, inner: leftInner },
    { center: rightCenter, inner: rightInner },
  ].sort((first, second) => first.center.x - second.center.x)
  return {
    imageLeftCenter: eyes[0].center,
    imageRightCenter: eyes[1].center,
    imageLeftInner: eyes[0].inner,
    imageRightInner: eyes[1].inner,
    anchor: {
      x: (leftCenter.x + rightCenter.x) / 2,
      y: (leftCenter.y + rightCenter.y) / 2,
    },
    area: faceArea(landmarks),
  }
}

function selectPrimaryFace(
  faces: ReturnType<FaceLandmarker['detectForVideo']>['faceLandmarks'],
  previousAnchor: Point | null,
): { face: (typeof faces)[number]; geometry: EyeGeometry } | null {
  const candidates = faces.flatMap((face) => {
    const geometry = getEyeGeometry(face)
    return geometry ? [{ face, geometry }] : []
  })
  if (candidates.length === 0) return null
  if (!previousAnchor) {
    return candidates.reduce((largest, candidate) =>
      candidate.geometry.area > largest.geometry.area ? candidate : largest,
    )
  }
  return candidates.reduce((nearest, candidate) => {
    const currentDistance =
      (candidate.geometry.anchor.x - previousAnchor.x) ** 2 +
      (candidate.geometry.anchor.y - previousAnchor.y) ** 2
    const nearestDistance =
      (nearest.geometry.anchor.x - previousAnchor.x) ** 2 +
      (nearest.geometry.anchor.y - previousAnchor.y) ** 2
    return currentDistance < nearestDistance ? candidate : nearest
  })
}

type FrameAssets = {
  lens: Path2D
  lensCx: number
  outerLocalX: number
  innerEdge: number
  rimWidth: number
  tint: CanvasGradient
  rim: CanvasGradient
  bevel: string
  shadow: string
  metal: boolean
}

const frameAssetsCache = new Map<FrameStyle, FrameAssets>()

function addRoundedRect(
  path: Path2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  path.moveTo(x + radius, y)
  path.lineTo(x + width - radius, y)
  path.arcTo(x + width, y, x + width, y + radius, radius)
  path.lineTo(x + width, y + height - radius)
  path.arcTo(x + width, y + height, x + width - radius, y + height, radius)
  path.lineTo(x + radius, y + height)
  path.arcTo(x, y + height, x, y + height - radius, radius)
  path.lineTo(x, y + radius)
  path.arcTo(x, y, x + radius, y, radius)
  path.closePath()
}

// Local lens silhouettes are centred at the origin, outer edge toward +x.
function buildLensPath(style: FrameStyle): { path: Path2D; outerLocalX: number } {
  const path = new Path2D()
  if (style === 'round') {
    path.ellipse(0, 0, 0.42, 0.4, 0, 0, Math.PI * 2)
    return { path, outerLocalX: 0.42 }
  }
  if (style === 'square') {
    addRoundedRect(path, -0.46, -0.35, 0.92, 0.7, 0.15)
    return { path, outerLocalX: 0.46 }
  }
  if (style === 'catEye') {
    path.moveTo(-0.4, -0.26)
    path.bezierCurveTo(-0.16, -0.38, 0.14, -0.38, 0.32, -0.33)
    path.quadraticCurveTo(0.52, -0.49, 0.56, -0.28)
    path.bezierCurveTo(0.53, -0.02, 0.4, 0.26, 0.08, 0.3)
    path.bezierCurveTo(-0.14, 0.33, -0.34, 0.26, -0.4, 0.08)
    path.quadraticCurveTo(-0.46, -0.1, -0.4, -0.26)
    path.closePath()
    return { path, outerLocalX: 0.56 }
  }
  path.moveTo(-0.44, -0.24)
  path.bezierCurveTo(-0.2, -0.38, 0.22, -0.38, 0.46, -0.26)
  path.bezierCurveTo(0.5, -0.02, 0.34, 0.28, 0.1, 0.42)
  path.bezierCurveTo(-0.1, 0.38, -0.3, 0.14, -0.4, -0.02)
  path.quadraticCurveTo(-0.48, -0.12, -0.44, -0.24)
  path.closePath()
  return { path, outerLocalX: 0.5 }
}

const FRAME_PALETTES: Record<
  FrameStyle,
  {
    rim: [string, string]
    tint: [string, string, string]
    bevel: string
    shadow: string
    rimWidth: number
    metal: boolean
  }
> = {
  round: {
    rim: ['#7a4526', '#2a1207'],
    tint: ['rgba(28,16,11,0.5)', 'rgba(52,30,20,0.3)', 'rgba(18,10,7,0.44)'],
    bevel: 'rgba(255,224,196,0.2)',
    shadow: 'rgba(20,10,6,0.18)',
    rimWidth: 0.055,
    metal: false,
  },
  square: {
    rim: ['#3f2419', '#120a06'],
    tint: ['rgba(18,12,10,0.52)', 'rgba(40,28,22,0.32)', 'rgba(10,6,5,0.48)'],
    bevel: 'rgba(255,232,210,0.16)',
    shadow: 'rgba(12,7,5,0.2)',
    rimWidth: 0.072,
    metal: false,
  },
  catEye: {
    rim: ['#5c2735', '#160810'],
    tint: ['rgba(30,14,22,0.5)', 'rgba(64,28,44,0.3)', 'rgba(16,7,13,0.44)'],
    bevel: 'rgba(255,214,224,0.2)',
    shadow: 'rgba(16,7,12,0.18)',
    rimWidth: 0.05,
    metal: false,
  },
  aviator: {
    rim: ['#e6bf83', '#7c4a22'],
    tint: ['rgba(22,26,22,0.48)', 'rgba(52,58,46,0.28)', 'rgba(14,18,14,0.44)'],
    bevel: 'rgba(255,240,205,0.35)',
    shadow: 'rgba(12,14,10,0.18)',
    rimWidth: 0.03,
    metal: true,
  },
}

function getFrameAssets(style: FrameStyle, context: CanvasRenderingContext2D): FrameAssets {
  const cached = frameAssetsCache.get(style)
  if (cached) return cached
  const palette = FRAME_PALETTES[style]
  const { path, outerLocalX } = buildLensPath(style)
  const lensCx = style === 'square' ? 0.55 : style === 'aviator' ? 0.53 : 0.52
  const innerExtent =
    style === 'round' ? 0.42 : style === 'square' ? 0.46 : style === 'catEye' ? 0.44 : 0.46
  const innerEdge = lensCx - innerExtent

  const tint = context.createLinearGradient(0, -0.42, 0, 0.42)
  tint.addColorStop(0, palette.tint[0])
  tint.addColorStop(0.5, palette.tint[1])
  tint.addColorStop(1, palette.tint[2])

  const rim = context.createLinearGradient(0, -0.42, 0, 0.42)
  rim.addColorStop(0, palette.rim[0])
  rim.addColorStop(1, palette.rim[1])

  const assets: FrameAssets = {
    lens: path,
    lensCx,
    outerLocalX,
    innerEdge,
    rimWidth: palette.rimWidth,
    tint,
    rim,
    bevel: palette.bevel,
    shadow: palette.shadow,
    metal: palette.metal,
  }
  frameAssetsCache.set(style, assets)
  return assets
}

function drawLensHighlight(context: CanvasRenderingContext2D) {
  const sheen = context.createLinearGradient(-0.35, -0.4, 0.2, 0.25)
  sheen.addColorStop(0, 'rgba(255,250,242,0.14)')
  sheen.addColorStop(0.45, 'rgba(255,250,242,0.05)')
  sheen.addColorStop(1, 'rgba(255,250,242,0)')
  context.fillStyle = sheen
  context.fillRect(-0.6, -0.6, 1.2, 1.2)

  const spec = context.createLinearGradient(-0.15, -0.2, 0.28, 0.05)
  spec.addColorStop(0, 'rgba(255,255,255,0)')
  spec.addColorStop(0.5, 'rgba(255,255,255,0.22)')
  spec.addColorStop(1, 'rgba(255,255,255,0)')
  context.save()
  context.rotate(-0.35)
  context.fillStyle = spec
  context.fillRect(-0.2, -0.3, 0.6, 0.07)
  context.restore()
}

function drawLens(context: CanvasRenderingContext2D, assets: FrameAssets, side: 1 | -1) {
  context.save()
  context.translate(side * assets.lensCx, 0)
  if (side < 0) context.scale(-1, 1)

  context.save()
  context.translate(0, 0.035)
  context.fillStyle = assets.shadow
  context.fill(assets.lens)
  context.restore()

  context.save()
  context.clip(assets.lens)
  context.fillStyle = assets.tint
  context.fillRect(-0.6, -0.6, 1.2, 1.2)
  drawLensHighlight(context)
  context.restore()

  context.strokeStyle = assets.rim
  context.lineWidth = assets.rimWidth
  context.stroke(assets.lens)
  context.save()
  context.translate(0, -assets.rimWidth * 0.18)
  context.strokeStyle = assets.bevel
  context.lineWidth = Math.max(0.012, assets.rimWidth * 0.28)
  context.stroke(assets.lens)
  context.restore()

  context.restore()
}

function drawTemples(context: CanvasRenderingContext2D, assets: FrameAssets) {
  context.save()
  context.lineCap = 'round'
  context.strokeStyle = assets.rim
  const width = assets.metal ? 0.022 : 0.03
  for (const side of [1, -1] as const) {
    const outerX = side * (assets.lensCx + assets.outerLocalX * 0.9)
    const reach = Math.abs(outerX)
    const y = -0.12
    context.lineWidth = width
    context.beginPath()
    context.moveTo(outerX, y)
    context.quadraticCurveTo(side * (reach + 0.1), y + 0.01, side * (reach + 0.17), y + 0.07)
    context.stroke()
    context.fillStyle = assets.rim
    context.beginPath()
    context.arc(outerX, y, assets.metal ? 0.018 : 0.024, 0, Math.PI * 2)
    context.fill()
  }
  context.restore()
}

function drawBridge(
  context: CanvasRenderingContext2D,
  assets: FrameAssets,
  bridge: Point,
) {
  const centerX = bridge.x
  const y = bridge.y
  context.save()
  context.lineCap = 'round'
  context.strokeStyle = assets.rim

  context.lineWidth = assets.metal ? 0.024 : 0.038
  context.beginPath()
  context.moveTo(centerX - assets.innerEdge, y)
  context.quadraticCurveTo(centerX, y - 0.06, centerX + assets.innerEdge, y)
  context.stroke()

  if (assets.metal) {
    context.lineWidth = 0.02
    context.beginPath()
    context.moveTo(centerX - 0.3, -0.3)
    context.quadraticCurveTo(centerX, -0.36, centerX + 0.3, -0.3)
    context.stroke()
  }

  context.fillStyle = assets.metal ? 'rgba(226,190,120,0.5)' : 'rgba(120,80,55,0.35)'
  for (const side of [1, -1] as const) {
    context.save()
    context.translate(centerX + side * (assets.innerEdge + 0.03), y + 0.12)
    context.rotate(side * 0.4)
    context.beginPath()
    context.ellipse(0, 0, 0.012, 0.03, 0, 0, Math.PI * 2)
    context.fill()
    context.restore()
  }
  context.restore()
}

function drawFrameShape(
  context: CanvasRenderingContext2D,
  style: FrameStyle,
  bridge: Point,
) {
  const assets = getFrameAssets(style, context)
  context.lineJoin = 'round'
  context.lineCap = 'round'

  drawTemples(context, assets)
  drawLens(context, assets, 1)
  drawLens(context, assets, -1)
  drawBridge(context, assets, bridge)
}

function FrameGlyph({ style }: { style: FrameStyle }) {
  return (
    <svg className={`frame-glyph frame-glyph-${style}`} viewBox="0 0 64 32" aria-hidden="true">
      {style === 'round' && (
        <>
          <circle cx="16" cy="16" r="10" />
          <circle cx="48" cy="16" r="10" />
          <path d="M26 14c4-4 8-4 12 0M5 13 1 11m58 2 4-2" />
        </>
      )}
      {style === 'square' && (
        <>
          <rect x="4" y="6" width="23" height="19" rx="3" />
          <rect x="37" y="6" width="23" height="19" rx="3" />
          <path d="M27 12c3-3 7-3 10 0M4 11 1 9m62 2 1-2" />
        </>
      )}
      {style === 'catEye' && (
        <>
          <path d="m4 9 5-5 20 3-1 13c-5 9-22 8-24-3Zm56 0-5-5-20 3 1 13c5 9 22 8 24-3ZM28 10c3-3 5-3 8 0" />
        </>
      )}
      {style === 'aviator' && (
        <>
          <path d="M4 8c8-5 17-5 25 0-1 12-7 21-13 21S5 20 4 8Zm56 0c-8-5-17-5-25 0 1 12 7 21 13 21s11-9 12-21ZM27 7c3 2 7 2 10 0M4 8 1 6m62 2 1-2" />
        </>
      )}
    </svg>
  )
}

function cameraErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message === 'insecure-context') {
    return 'Camera access needs a secure page. Open Swiftora over HTTPS or on localhost, then try again.'
  }
  if (error instanceof Error && error.message === 'unsupported-camera-api') {
    return 'This browser does not support camera access. Try a current browser on a device with a camera.'
  }

  if (error instanceof DOMException) {
    if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
      return 'Camera access was not allowed. Update this site’s camera permission in your browser settings, then try again.'
    }
    if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
      return 'No camera was found. Connect or enable a camera, then try again.'
    }
    if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
      return 'Your camera could not be opened. It may already be in use by another app.'
    }
  }

  return 'The camera could not be started. Check your camera and browser permissions, then try again.'
}

export function MagicMirror() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const landmarkerRef = useRef<FaceLandmarker | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const streamTrackListenersRef = useRef<
    { track: MediaStreamTrack; listener: () => void }[]
  >([])
  const generationRef = useRef(0)
  const startingRef = useRef(false)
  const mountedRef = useRef(false)
  const faceCountRef = useRef(0)
  const previousFaceAnchorRef = useRef<Point | null>(null)
  const selectedFrameRef = useRef<FrameStyle>('round')
  const [cameraActive, setCameraActive] = useState(false)
  const [selectedFrame, setSelectedFrame] = useState<FrameStyle>('round')
  const [status, setStatus] = useState<MirrorStatus>('waiting')
  const [statusDetail, setStatusDetail] = useState(STATUS_COPY.waiting.detail)

  const updateStatus = useCallback((nextStatus: MirrorStatus, detail?: string) => {
    if (!mountedRef.current) return
    setStatus(nextStatus)
    setStatusDetail(detail ?? STATUS_COPY[nextStatus].detail)
  }, [])

  const releaseSession = useCallback((updateUi: boolean) => {
    generationRef.current += 1
    startingRef.current = false
    faceCountRef.current = 0
    previousFaceAnchorRef.current = null

    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }

    landmarkerRef.current?.close()
    landmarkerRef.current = null
    streamTrackListenersRef.current.forEach(({ track, listener }) => {
      track.removeEventListener('ended', listener)
    })
    streamTrackListenersRef.current = []
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null

    const video = videoRef.current
    if (video) {
      video.pause()
      video.srcObject = null
    }

    const canvas = canvasRef.current
    if (canvas) {
      const context = canvas.getContext('2d')
      context?.clearRect(0, 0, canvas.width, canvas.height)
    }

    if (updateUi && mountedRef.current) {
      setCameraActive(false)
      setStatus('waiting')
      setStatusDetail(STATUS_COPY.waiting.detail)
    }
  }, [])

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      releaseSession(false)
    }
  }, [releaseSession])

  const drawOverlay = useCallback(
    (
      face: ReturnType<FaceLandmarker['detectForVideo']>['faceLandmarks'][number] | null,
      geometry: EyeGeometry | null,
    ) => {
      const video = videoRef.current
      const canvas = canvasRef.current
      if (!canvas) return

      const bounds = canvas.getBoundingClientRect()
      const pixelRatio = window.devicePixelRatio || 1
      const canvasWidth = Math.max(1, Math.round(bounds.width * pixelRatio))
      const canvasHeight = Math.max(1, Math.round(bounds.height * pixelRatio))
      if (canvas.width !== canvasWidth || canvas.height !== canvasHeight) {
        canvas.width = canvasWidth
        canvas.height = canvasHeight
      }

      const context = canvas.getContext('2d')
      if (!context) return
      context.clearRect(0, 0, canvas.width, canvas.height)
      if (!video || video.videoWidth === 0 || video.videoHeight === 0 || !face || !geometry) return

      const scale = Math.max(
        canvas.width / video.videoWidth,
        canvas.height / video.videoHeight,
      )
      const offsetX = (canvas.width - video.videoWidth * scale) / 2
      const offsetY = (canvas.height - video.videoHeight * scale) / 2
      const mapPoint = (point: Point): Point => ({
        x: offsetX + point.x * video.videoWidth * scale,
        y: offsetY + point.y * video.videoHeight * scale,
      })
      const leftCenter = mapPoint(geometry.imageLeftCenter)
      const rightCenter = mapPoint(geometry.imageRightCenter)
      const midpoint = {
        x: (leftCenter.x + rightCenter.x) / 2,
        y: (leftCenter.y + rightCenter.y) / 2,
      }
      const eyeDistance = Math.hypot(rightCenter.x - leftCenter.x, rightCenter.y - leftCenter.y)
      if (!Number.isFinite(eyeDistance) || eyeDistance < 2) return
      const angle = Math.atan2(
        rightCenter.y - leftCenter.y,
        rightCenter.x - leftCenter.x,
      )
      const innerMidpoint = mapPoint({
        x: (geometry.imageLeftInner.x + geometry.imageRightInner.x) / 2,
        y: (geometry.imageLeftInner.y + geometry.imageRightInner.y) / 2,
      })
      const bridgeDeltaX = innerMidpoint.x - midpoint.x
      const bridgeDeltaY = innerMidpoint.y - midpoint.y
      const bridge = {
        x: (bridgeDeltaX * Math.cos(angle) + bridgeDeltaY * Math.sin(angle)) / eyeDistance,
        y: (-bridgeDeltaX * Math.sin(angle) + bridgeDeltaY * Math.cos(angle)) / eyeDistance,
      }

      context.save()
      context.translate(midpoint.x, midpoint.y)
      context.rotate(angle)
      context.scale(eyeDistance, eyeDistance)
      drawFrameShape(context, selectedFrameRef.current, bridge)
      context.restore()
    },
    [],
  )

  const startTracking = useCallback(
    (session: number, landmarker: FaceLandmarker) => {
      const trackFrame = () => {
        if (session !== generationRef.current || !mountedRef.current) return

        const video = videoRef.current
        if (!video || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
          drawOverlay(null, null)
          animationFrameRef.current = requestAnimationFrame(trackFrame)
          return
        }

        try {
          const result = landmarker.detectForVideo(video, performance.now())
          const primary = selectPrimaryFace(
            result.faceLandmarks,
            previousFaceAnchorRef.current,
          )
          if (primary) previousFaceAnchorRef.current = primary.geometry.anchor
          else previousFaceAnchorRef.current = null
          drawOverlay(primary?.face ?? null, primary?.geometry ?? null)
          const count = result.faceLandmarks.length
          if (faceCountRef.current !== count) {
            faceCountRef.current = count
            if (count === 0) updateStatus('looking')
            else if (count === 1) updateStatus('detected')
            else updateStatus('multiple')
          }
          animationFrameRef.current = requestAnimationFrame(trackFrame)
        } catch {
          if (session !== generationRef.current) return
          landmarkerRef.current?.close()
          landmarkerRef.current = null
          previousFaceAnchorRef.current = null
          animationFrameRef.current = null
          const canvas = canvasRef.current
          const context = canvas?.getContext('2d')
          if (canvas && context) context.clearRect(0, 0, canvas.width, canvas.height)
          updateStatus(
            'unavailable',
            'The camera remains on for preview, but face tracking stopped after an error. No sunglasses are shown.',
          )
        }
      }

      animationFrameRef.current = requestAnimationFrame(trackFrame)
    },
    [drawOverlay, updateStatus],
  )

  async function startCamera() {
    if (startingRef.current || streamRef.current) return
    startingRef.current = true
    const session = generationRef.current + 1
    generationRef.current = session
    updateStatus('requesting')

    try {
      if (!window.isSecureContext) throw new Error('insecure-context')
      if (
        !navigator.mediaDevices ||
        typeof navigator.mediaDevices.getUserMedia !== 'function'
      ) {
        throw new Error('unsupported-camera-api')
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 960 },
        },
      })

      if (session !== generationRef.current || !mountedRef.current) {
        stream.getTracks().forEach((track) => track.stop())
        return
      }

      streamRef.current = stream
      stream.getTracks().forEach((track) => {
        const listener = () => {
          if (session !== generationRef.current || !mountedRef.current) return
          releaseSession(false)
          setCameraActive(false)
          updateStatus('error', 'The camera connection ended. Start the preview again when you’re ready.')
        }
        track.addEventListener('ended', listener)
        streamTrackListenersRef.current.push({ track, listener })
      })
      const video = videoRef.current
      if (!video) throw new Error('The camera preview could not be prepared.')
      video.srcObject = stream
      await video.play()
      if (session !== generationRef.current || !mountedRef.current) return
      setCameraActive(true)
      updateStatus('loading')
      previousFaceAnchorRef.current = null
      faceCountRef.current = 0

      try {
        const fileset = await FilesetResolver.forVisionTasks(WASM_URL)
        if (session !== generationRef.current || !mountedRef.current) return

        const landmarker = await FaceLandmarker.createFromOptions(fileset, {
          baseOptions: { modelAssetPath: FACE_LANDMARKER_MODEL_URL },
          runningMode: 'VIDEO',
          numFaces: 2,
          minFaceDetectionConfidence: 0.5,
          minFacePresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
        })

        if (session !== generationRef.current || !mountedRef.current) {
          landmarker.close()
          return
        }
        landmarkerRef.current = landmarker
        updateStatus('looking')
        startTracking(session, landmarker)
      } catch {
        if (session !== generationRef.current || !mountedRef.current) return
        updateStatus(
          'unavailable',
          'The camera remains on for preview. Face tracking could not load; no camera frames are uploaded or saved.',
        )
      }
    } catch (error) {
      if (session !== generationRef.current || !mountedRef.current) return
      releaseSession(false)
      setCameraActive(false)
      updateStatus('error', cameraErrorMessage(error))
    } finally {
      if (session === generationRef.current) startingRef.current = false
    }
  }

  function stopCamera() {
    releaseSession(true)
  }

  function chooseFrame(frame: FrameStyle) {
    selectedFrameRef.current = frame
    setSelectedFrame(frame)
  }

  const statusCopy = STATUS_COPY[status]
  const cameraIsStarting = status === 'requesting' || status === 'loading'

  return (
    <section className="magic-mirror-page" aria-labelledby="magic-mirror-title">
      <header className="magic-mirror-heading">
        <div>
          <p className="magic-mirror-kicker">
            <span>SWIFTORA / STUDIO 01</span>
            <span className="magic-mirror-kicker-divider" aria-hidden="true" />
            <span>MAGIC MIRROR</span>
          </p>
          <h1 id="magic-mirror-title">Find your <em>frame.</em></h1>
        </div>
        <p className="magic-mirror-intro">
          A quiet, private way to explore four distinct silhouettes before you
          return to the collection.
        </p>
      </header>

      <div className="magic-mirror-workspace">
        <section className="mirror-stage" aria-label="Sunglasses try-on preview">
          <div className="mirror-stage-topline">
            <span className="mirror-stage-label">
              <span className="mirror-live-dot" aria-hidden="true" />
              LIVE PREVIEW
            </span>
            <span className="mirror-stage-index">MM—01</span>
          </div>

          <div className={`mirror-viewfinder${cameraActive ? ' is-active' : ''}`}>
            <video
              ref={videoRef}
              className="mirror-video"
              autoPlay
              muted
              playsInline
              aria-label="Mirrored live camera preview"
            />
            <canvas
              ref={canvasRef}
              className="mirror-landmarks"
              aria-hidden="true"
            />
            {!cameraActive && (
              <div className="mirror-empty-state">
                <span className="mirror-camera-icon" aria-hidden="true">
                  <Camera size={30} strokeWidth={1.4} />
                </span>
                <p className="mirror-empty-title">Your reflection, on your terms.</p>
                <p className="mirror-empty-copy">
                  {status === 'error'
                    ? 'Check your camera permission or connection, then try again.'
                    : 'Nothing starts until you choose to begin.'}
                </p>
                {cameraIsStarting && (
                  <span className="mirror-loading-line" aria-hidden="true" />
                )}
              </div>
            )}
            {cameraActive && status === 'unavailable' && (
              <div className="mirror-preview-note">
                <ScanFace size={16} aria-hidden="true" />
                <span>Preview only</span>
              </div>
            )}
          </div>

          <fieldset className="mirror-frame-selector">
            <legend>Choose a frame</legend>
            <div className="mirror-frame-options">
              {FRAME_OPTIONS.map((frame) => (
                <button
                  key={frame.id}
                  className={`mirror-frame-option${selectedFrame === frame.id ? ' is-selected' : ''}`}
                  type="button"
                  aria-pressed={selectedFrame === frame.id}
                  onClick={() => chooseFrame(frame.id)}
                >
                  <FrameGlyph style={frame.id} />
                  <span className="mirror-frame-option-label">{frame.label}</span>
                  <span className="mirror-frame-option-detail">{frame.description}</span>
                </button>
              ))}
            </div>
          </fieldset>
          <p className="mirror-alignment-note">
            Center your face, look toward the screen, and leave a little room around
            your temples.
          </p>
          <p className="mirror-disclaimer">
            <strong>Visual preview only.</strong> This is not an optical, fit, or
            sizing guarantee.
          </p>

          <div className="mirror-stage-caption">
            <span>FRAME PREVIEW</span>
            <span>CAMERA FRAMES STAY IN THIS BROWSER</span>
          </div>
        </section>

        <aside className="mirror-guide" aria-label="Mirror instructions and controls">
          <p className="mirror-guide-eyebrow">YOUR PRIVATE FITTING ROOM</p>
          <h2>Try a new<br /><em>point of view.</em></h2>
          <ol className="mirror-steps">
            <li>
              <span className="mirror-step-number">01</span>
              <span>Choose a silhouette that catches your eye.</span>
            </li>
            <li>
              <span className="mirror-step-number">02</span>
              <span>Start the camera and center your face in the frame.</span>
            </li>
            <li>
              <span className="mirror-step-number">03</span>
              <span>Compare styles, then stop whenever you’re ready.</span>
            </li>
          </ol>

          <div className={`mirror-status mirror-status-${statusCopy.tone}`} role="status" aria-live="polite" aria-atomic="true">
            {status === 'error' ? (
              <CircleAlert size={18} aria-hidden="true" />
            ) : (
              <ScanFace size={18} aria-hidden="true" />
            )}
            <div>
              <strong>{statusCopy.label}</strong>
              <p>{statusDetail}</p>
            </div>
          </div>

          {cameraActive ? (
            <button className="mirror-action mirror-action-stop" type="button" onClick={stopCamera}>
              Stop camera
              <span aria-hidden="true">×</span>
            </button>
          ) : (
            <button
              className="mirror-action"
              type="button"
              onClick={startCamera}
              disabled={cameraIsStarting}
            >
              {cameraIsStarting ? 'Starting your mirror…' : 'Start camera'}
              {!cameraIsStarting && <ArrowRight size={17} aria-hidden="true" />}
            </button>
          )}
          <p className="mirror-secure-note">
            <ShieldCheck size={15} aria-hidden="true" />
            <span>Camera access is optional. No microphone, uploads, or saved images.</span>
          </p>

          <Link className="mirror-return-link" to={CUSTOMER_PATHS.products}>
            Return to the collection <ArrowRight size={15} aria-hidden="true" />
          </Link>
        </aside>
      </div>

      <footer className="mirror-privacy">
        <span className="mirror-privacy-mark" aria-hidden="true">S</span>
        <p>
          <strong>A private preview, by design.</strong> Live camera frames are
          processed in your browser and are never uploaded, stored, or shared.
          Starting the mirror may download a face-tracking model from MediaPipe;
          that download does not include camera video. Your camera stops when
          you stop the preview or leave this page.
        </p>
      </footer>
    </section>
  )
}
