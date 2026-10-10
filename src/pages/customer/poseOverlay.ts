import { PoseLandmarker } from '@mediapipe/tasks-vision'

// `Connection` is declared but not exported by tasks-vision 1.1.0 typings,
// so mirror its { start, end } shape locally.
type PoseConnection = { start: number; end: number }

// BlazePose (33-landmark) indices for the joints a clothing renderer cares
// about most. Used only to emphasise them visually — every detected landmark
// is still drawn.
export const KEY_JOINT_GROUPS = {
  shoulders: [11, 12],
  elbows: [13, 14],
  wrists: [15, 16],
  hips: [23, 24],
  knees: [25, 26],
} as const

const KEY_JOINTS = new Set<number>(Object.values(KEY_JOINT_GROUPS).flat())

const CONNECTIONS: PoseConnection[] = PoseLandmarker.POSE_CONNECTIONS

export type OverlayPoint = { x: number; y: number; visibility?: number }

export type OverlayColors = {
  bone: string
  joint: string
  keyJoint: string
  keyRing: string
}

// Maps normalised [0,1] pose landmarks onto the region actually occupied by an
// object-fit: contain image inside a frame, so the skeleton stays locked to the
// body regardless of the frame's aspect ratio or size.
export function containMap(
  naturalW: number,
  naturalH: number,
  frameW: number,
  frameH: number,
): { offsetX: number; offsetY: number; dispW: number; dispH: number } {
  if (!naturalW || !naturalH || !frameW || !frameH) {
    return { offsetX: 0, offsetY: 0, dispW: frameW, dispH: frameH }
  }
  const scale = Math.min(frameW / naturalW, frameH / naturalH)
  const dispW = naturalW * scale
  const dispH = naturalH * scale
  return { offsetX: (frameW - dispW) / 2, offsetY: (frameH - dispH) / 2, dispW, dispH }
}

function visibilityAlpha(visibility: number | undefined): number {
  if (visibility === undefined) return 1
  // BlazePose visibility is a 0..1 confidence. Keep low-confidence limbs faint
  // but visible so the reviewer can judge reliability for themselves.
  return Math.min(1, Math.max(0.22, visibility))
}

/**
 * Draws a single-pose skeleton (bones + joints) over an image region.
 * `landmarks` are normalised to the source image; `naturalW/H` are the source
 * image's pixel dimensions; `frameW/H` are the overlay canvas CSS dimensions.
 */
export function drawPoseOverlay(
  ctx: CanvasRenderingContext2D,
  landmarks: OverlayPoint[],
  naturalW: number,
  naturalH: number,
  frameW: number,
  frameH: number,
  colors: OverlayColors,
): void {
  const { offsetX, offsetY, dispW, dispH } = containMap(naturalW, naturalH, frameW, frameH)
  const toPixel = (point: OverlayPoint) => ({
    x: offsetX + point.x * dispW,
    y: offsetY + point.y * dispH,
  })

  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  // Bones first, under the joints.
  for (const { start, end } of CONNECTIONS) {
    const a = landmarks[start]
    const b = landmarks[end]
    if (!a || !b) continue
    const pa = toPixel(a)
    const pb = toPixel(b)
    const alpha = Math.min(visibilityAlpha(a.visibility), visibilityAlpha(b.visibility))
    ctx.globalAlpha = alpha
    ctx.strokeStyle = colors.bone
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(pa.x, pa.y)
    ctx.lineTo(pb.x, pb.y)
    ctx.stroke()
  }

  // Joints on top.
  landmarks.forEach((point, index) => {
    const p = toPixel(point)
    const isKey = KEY_JOINTS.has(index)
    const alpha = visibilityAlpha(point.visibility)
    ctx.globalAlpha = alpha

    if (isKey) {
      // Soft ring so key joints read clearly against busy photos.
      ctx.beginPath()
      ctx.fillStyle = colors.keyRing
      ctx.arc(p.x, p.y, 7, 0, Math.PI * 2)
      ctx.fill()
    }

    ctx.beginPath()
    ctx.fillStyle = isKey ? colors.keyJoint : colors.joint
    ctx.arc(p.x, p.y, isKey ? 4 : 2.6, 0, Math.PI * 2)
    ctx.fill()
  })

  ctx.globalAlpha = 1
}
