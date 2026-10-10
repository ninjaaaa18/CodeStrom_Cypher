import type { NormalizedLandmark } from '@mediapipe/tasks-vision'

// Live AR garment preview helpers — on-device only, no uploads.
// Uses the same BlazePose 33-landmark output as the still-photo flow, but
// estimates a torso quad (shoulders + hips) each video frame and draws a
// clearly stylised garment *silhouette* that follows the user. This is an
// approximate AR overlay, never a photorealistic garment replacement.

export type ArPoint = { x: number; y: number }

export type TorsoEstimate = {
  centerX: number
  centerY: number
  width: number
  height: number
  angle: number
  confidence: number
}

// Upper-body garments only. Jeans, wide-leg trousers and the saree need
// full-body / lower-body tracking, so they are excluded from the live AR
// preview which only tracks shoulders and hips.
export const AR_SUPPORTED_GARMENT_IDS: readonly string[] = [
  'mens-cotton-oxford',
  'womens-wrap-blouse',
  'everyday-cotton-tee',
  'chanderi-kurta',
]

export function isArSupportedGarment(productId: string | null): boolean {
  return productId !== null && AR_SUPPORTED_GARMENT_IDS.includes(productId)
}

const MIN_VISIBILITY = 0.25

function usable(point: NormalizedLandmark | undefined): point is NormalizedLandmark {
  return (
    !!point &&
    Number.isFinite(point.x) &&
    Number.isFinite(point.y) &&
    (point.visibility ?? 1) >= MIN_VISIBILITY
  )
}

/**
 * Estimates a torso quad from shoulders (11/12) and hips (23/24).
 * Returns null when any of the four landmarks is missing or low-confidence
 * so the caller can hide the overlay instead of guessing.
 */
export function estimateTorso(
  landmarks: NormalizedLandmark[] | undefined | null,
): TorsoEstimate | null {
  if (!landmarks || landmarks.length < 25) return null
  const leftShoulder = landmarks[11]
  const rightShoulder = landmarks[12]
  const leftHip = landmarks[23]
  const rightHip = landmarks[24]
  if (!usable(leftShoulder) || !usable(rightShoulder) || !usable(leftHip) || !usable(rightHip)) {
    return null
  }
  const shoulderMidX = (leftShoulder.x + rightShoulder.x) / 2
  const shoulderMidY = (leftShoulder.y + rightShoulder.y) / 2
  const hipMidX = (leftHip.x + rightHip.x) / 2
  const hipMidY = (leftHip.y + rightHip.y) / 2
  const shoulderWidth = Math.hypot(rightShoulder.x - leftShoulder.x, rightShoulder.y - leftShoulder.y)
  const torsoHeight = Math.hypot(hipMidX - shoulderMidX, hipMidY - shoulderMidY)
  if (
    !Number.isFinite(shoulderWidth) ||
    !Number.isFinite(torsoHeight) ||
    shoulderWidth < 0.02 ||
    torsoHeight < 0.02
  ) {
    return null
  }
  const angle = Math.atan2(hipMidX - shoulderMidX, hipMidY - shoulderMidY)
  const confidence = Math.min(
    leftShoulder.visibility ?? 1,
    rightShoulder.visibility ?? 1,
    leftHip.visibility ?? 1,
    rightHip.visibility ?? 1,
  )
  return {
    centerX: (shoulderMidX + hipMidX) / 2,
    centerY: (shoulderMidY + hipMidY) / 2,
    width: shoulderWidth,
    height: torsoHeight,
    angle,
    confidence,
  }
}

/** Exponential moving-average smoothing to reduce frame-to-frame jitter. */
export function smoothTorso(
  previous: TorsoEstimate | null,
  next: TorsoEstimate,
  alpha = 0.35,
): TorsoEstimate {
  if (!previous) return next
  const blend = (a: number, b: number) => a + (b - a) * alpha
  const angleDelta = Math.atan2(
    Math.sin(next.angle - previous.angle),
    Math.cos(next.angle - previous.angle),
  )
  return {
    centerX: blend(previous.centerX, next.centerX),
    centerY: blend(previous.centerY, next.centerY),
    width: blend(previous.width, next.width),
    height: blend(previous.height, next.height),
    angle: previous.angle + angleDelta * alpha,
    confidence: blend(previous.confidence, next.confidence),
  }
}

type GarmentShape = {
  fill: string
  edge: string
  shoulderPad: number
  bodyStretch: number
  sleeveLength: number
  sleeveSpread: number
  neckDepth: number
}

const GARMENT_SHAPES: Record<string, GarmentShape> = {
  'mens-cotton-oxford': {
    fill: 'rgba(243, 233, 222, 0.62)',
    edge: '#b04717',
    shoulderPad: 1.32,
    bodyStretch: 1.28,
    sleeveLength: 0.42,
    sleeveSpread: 1.18,
    neckDepth: 0.1,
  },
  'womens-wrap-blouse': {
    fill: 'rgba(180, 71, 23, 0.42)',
    edge: '#7a2f10',
    shoulderPad: 1.22,
    bodyStretch: 1.18,
    sleeveLength: 0.55,
    sleeveSpread: 1.05,
    neckDepth: 0.22,
  },
  'everyday-cotton-tee': {
    fill: 'rgba(45, 18, 13, 0.5)',
    edge: '#f3e9de',
    shoulderPad: 1.28,
    bodyStretch: 1.22,
    sleeveLength: 0.34,
    sleeveSpread: 1.22,
    neckDepth: 0.12,
  },
  'chanderi-kurta': {
    fill: 'rgba(180, 107, 62, 0.5)',
    edge: '#5c2c12',
    shoulderPad: 1.26,
    bodyStretch: 1.7,
    sleeveLength: 0.72,
    sleeveSpread: 1.02,
    neckDepth: 0.14,
  },
}

/**
 * Draws a stylised garment silhouette (body + short sleeves + neckline hint)
 * over a cover-fit, mirrored video frame. `frameW/H` are canvas pixel sizes;
 * torso coordinates are normalised to the video frame.
 */
export function drawArGarmentOverlay(
  ctx: CanvasRenderingContext2D,
  torso: TorsoEstimate,
  videoW: number,
  videoH: number,
  frameW: number,
  frameH: number,
  garmentId: string,
): void {
  if (!Number.isFinite(videoW) || !Number.isFinite(videoH) || videoW <= 0 || videoH <= 0) return
  const shape: GarmentShape = GARMENT_SHAPES[garmentId] ?? GARMENT_SHAPES['everyday-cotton-tee']

  // Cover-fit mapping: video fills the frame, cropped on one axis.
  const scale = Math.max(frameW / videoW, frameH / videoH)
  const offsetX = (frameW - videoW * scale) / 2
  const offsetY = (frameH - videoH * scale) / 2
  const toPx = (point: ArPoint) => ({
    x: offsetX + point.x * videoW * scale,
    y: offsetY + point.y * videoH * scale,
  })
  const unit = Math.min(videoW, videoH) * scale
  const bodyW = torso.width * videoW * scale * shape.shoulderPad
  const bodyH = torso.height * videoH * scale * shape.bodyStretch
  if (!Number.isFinite(bodyW) || !Number.isFinite(bodyH) || bodyW < 4 || bodyH < 4) return

  const center = toPx({ x: torso.centerX, y: torso.centerY })
  const sleeveLen = bodyW * shape.sleeveLength
  const topY = -bodyH / 2
  const hemY = bodyH / 2
  const halfW = bodyW / 2

  ctx.save()
  ctx.translate(center.x, center.y)
  ctx.rotate(torso.angle)
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'
  ctx.shadowColor = 'rgba(20, 10, 6, 0.35)'
  ctx.shadowBlur = Math.max(6, unit * 0.02)
  ctx.shadowOffsetY = Math.max(2, unit * 0.006)
  ctx.fillStyle = shape.fill
  ctx.strokeStyle = shape.edge
  ctx.lineWidth = Math.max(1.5, unit * 0.004)

  for (const side of [-1, 1] as const) {
    const rootX = side * halfW * 0.92
    const tipX = side * (halfW * shape.sleeveSpread + sleeveLen * 0.55)
    ctx.beginPath()
    ctx.moveTo(rootX, topY + bodyH * 0.04)
    ctx.lineTo(tipX, topY + bodyH * 0.1 + sleeveLen * 0.32)
    ctx.lineTo(tipX - side * bodyW * 0.06, topY + bodyH * 0.16 + sleeveLen * 0.72)
    ctx.lineTo(rootX - side * bodyW * 0.02, topY + bodyH * 0.24)
    ctx.closePath()
    ctx.globalAlpha = 0.92
    ctx.fill()
    ctx.globalAlpha = 1
    ctx.stroke()
  }

  const waistInset = halfW * 0.12
  ctx.beginPath()
  ctx.moveTo(-halfW, topY + bodyH * 0.03)
  ctx.quadraticCurveTo(-halfW - bodyW * 0.03, hemY * 0.4, -halfW + waistInset * 0.4, hemY * 0.72)
  ctx.quadraticCurveTo(-halfW * 0.5, hemY + bodyH * 0.03, 0, hemY + bodyH * 0.015)
  ctx.quadraticCurveTo(halfW * 0.5, hemY + bodyH * 0.03, halfW - waistInset * 0.4, hemY * 0.72)
  ctx.quadraticCurveTo(halfW + bodyW * 0.03, hemY * 0.4, halfW, topY + bodyH * 0.03)
  ctx.quadraticCurveTo(halfW * 0.4, topY - bodyH * 0.02, halfW * 0.16, topY + bodyH * shape.neckDepth * 0.4)
  ctx.quadraticCurveTo(0, topY + bodyH * shape.neckDepth, -halfW * 0.16, topY + bodyH * shape.neckDepth * 0.4)
  ctx.quadraticCurveTo(-halfW * 0.4, topY - bodyH * 0.02, -halfW, topY + bodyH * 0.03)
  ctx.closePath()
  ctx.globalAlpha = 0.94
  ctx.fill()
  ctx.globalAlpha = 1
  ctx.stroke()

  // Neckline hint + waist seam so it reads as a garment, not a plain box.
  ctx.shadowColor = 'transparent'
  ctx.beginPath()
  ctx.moveTo(-halfW * 0.16, topY + bodyH * shape.neckDepth * 0.4)
  ctx.quadraticCurveTo(0, topY + bodyH * shape.neckDepth * 1.15, halfW * 0.16, topY + bodyH * shape.neckDepth * 0.4)
  ctx.stroke()
  ctx.globalAlpha = 0.55
  ctx.setLineDash([Math.max(3, unit * 0.008), Math.max(3, unit * 0.008)])
  ctx.beginPath()
  ctx.moveTo(-halfW + waistInset * 0.5, hemY * 0.62)
  ctx.quadraticCurveTo(0, hemY * 0.66, halfW - waistInset * 0.5, hemY * 0.62)
  ctx.stroke()
  ctx.setLineDash([])
  ctx.globalAlpha = 1
  ctx.restore()
}
