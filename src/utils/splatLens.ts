export interface SplatLensMetadata {
  defaultFov?: number;
  originalFov?: number;
  focalLength?: number;
  width?: number;
  height?: number;
  viewerCalibration?: {
    boundsMin?: [number, number, number];
    boundsMax?: [number, number, number];
    center?: [number, number, number];
    focusDepth?: number;
    cameraSpace?: boolean;
    frontBeta?: number;
    parallaxBeta?: number;
  };
}

// ── Math helpers ──
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const toDegrees = (radians: number) => (radians * 180) / Math.PI;
const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

const isFiniteTuple3 = (value?: [number, number, number]): value is [number, number, number] =>
  Array.isArray(value) &&
  value.length === 3 &&
  value.every((entry) => Number.isFinite(entry));

// ── FOV from metadata ──

/**
 * Compute the *horizontal* FOV from the model's training-camera intrinsics.
 *   FOV = 2 * atan( width / (2 * focalLength) )
 *
 * If metadata is missing, returns `fallback` (default 60°).
 */
export const computeOriginalFov = (
  metadata?: Pick<SplatLensMetadata, 'originalFov' | 'focalLength' | 'width'>,
  fallback: number = 60,
) => {
  if (typeof metadata?.originalFov === 'number' && Number.isFinite(metadata.originalFov)) {
    return metadata.originalFov;
  }
  if (
    typeof metadata?.focalLength === 'number' &&
    Number.isFinite(metadata.focalLength) &&
    typeof metadata?.width === 'number' &&
    Number.isFinite(metadata.width) &&
    metadata.focalLength > 0 &&
    metadata.width > 0
  ) {
    return toDegrees(2 * Math.atan(metadata.width / (2 * metadata.focalLength)));
  }
  return fallback;
};

/**
 * Compute the correct FOV for the *canvas* size using pinhole-camera intrinsics
 * from the model metadata (Radia Gallery approach).
 *
 *   Horizontal FOV = 2 * atan( canvasWidth / (2 * scaled_fx) )
 *
 * where `scaled_fx` = metadata.focalLength * (canvasWidth / metadata.width)
 *
 * This ensures the model renders with the same perspective as the original
 * training camera, regardless of canvas size.
 */
export const computeIntrinsicFov = (
  metadata?: SplatLensMetadata,
  canvasWidth?: number,
  canvasHeight?: number,
  fallback: number = 60,
): number => {
  if (
    typeof metadata?.focalLength === 'number' &&
    metadata.focalLength > 0 &&
    typeof metadata?.width === 'number' &&
    metadata.width > 0 &&
    typeof canvasWidth === 'number' &&
    canvasWidth > 0
  ) {
    // Scale the focal length proportionally to the canvas width
    const scaledFx = metadata.focalLength * (canvasWidth / metadata.width);
    return toDegrees(2 * Math.atan(canvasWidth / (2 * scaledFx)));
  }
  // Fallback to originalFov if available
  return computeOriginalFov(metadata, fallback);
};

/**
 * Compute the focal-length in pixels for a given canvas width and horizontal FOV.
 */
export const fovToFocalPx = (fovDeg: number, canvasWidth: number): number => {
  const fovRad = toRadians(clamp(fovDeg, 5, 170));
  return canvasWidth / (2 * Math.tan(fovRad / 2));
};

// ── Camera calibration helpers ──

export const getFrontBeta = (metadata?: SplatLensMetadata) =>
  metadata?.viewerCalibration?.frontBeta ?? (metadata?.viewerCalibration?.cameraSpace ? 0.025 : 0.15);

export const getParallaxBeta = (metadata?: SplatLensMetadata) =>
  metadata?.viewerCalibration?.parallaxBeta ?? (metadata?.viewerCalibration?.cameraSpace ? 0.065 : 0.18);

export const getCalibrationCenter = (metadata?: SplatLensMetadata): [number, number, number] =>
  metadata?.viewerCalibration?.center ?? [0, 0, 0];

export const computeCameraSpaceTarget = (
  metadata?: SplatLensMetadata,
  beta: number = getFrontBeta(metadata),
) => {
  const focusDepth =
    metadata?.viewerCalibration?.focusDepth ??
    metadata?.viewerCalibration?.center?.[2] ??
    6;
  const radius = Math.max(0.5, Math.abs(focusDepth));
  return {
    radius,
    target: [
      0,
      radius * Math.sin(beta),
      radius * Math.cos(beta),
    ] as [number, number, number],
  };
};

/**
 * Compute a sensible orbit radius that fits the model's bounding box
 * within the current FOV and viewport.
 */
export const computeFitRadius = (
  metadata: SplatLensMetadata | undefined,
  fovDeg: number,
  beta: number,
  viewportWidth: number,
  viewportHeight: number,
  fallback: number = 5,
) => {
  const boundsMin = metadata?.viewerCalibration?.boundsMin;
  const boundsMax = metadata?.viewerCalibration?.boundsMax;
  if (!isFiniteTuple3(boundsMin) || !isFiniteTuple3(boundsMax) || viewportWidth <= 0 || viewportHeight <= 0) {
    return metadata?.viewerCalibration?.cameraSpace
      ? computeCameraSpaceTarget(metadata, beta).radius
      : fallback;
  }

  const halfWidth = Math.abs(boundsMax[0] - boundsMin[0]) * 0.5;
  const halfHeight = Math.abs(boundsMax[1] - boundsMin[1]) * 0.5;
  const halfDepth = Math.abs(boundsMax[2] - boundsMin[2]) * 0.5;

  const hFov = toRadians(clamp(fovDeg, 5, 120));
  const aspect = Math.max(0.1, viewportWidth / Math.max(1, viewportHeight));
  const vFov = 2 * Math.atan(Math.tan(hFov * 0.5) / aspect);
  const fitWidth = halfWidth / Math.max(0.01, Math.tan(hFov * 0.5));
  const fitHeight = halfHeight / Math.max(0.01, Math.tan(vFov * 0.5));
  const betaCompensation = 1 / Math.max(0.4, Math.cos(beta));

  return (Math.max(fitWidth, fitHeight) + halfDepth) * betaCompensation * 1.08;
};
