/**
 * RadiaViewerPage — 1:1 Radia Gallery Viewer Clone
 *
 * Ported from github.com/aero177-jpg/radia-gallery source code.
 * Uses gsplat.js for rendering with camera math translated from
 * Radia Gallery's Three.js PerspectiveCamera system.
 *
 * Features ported from source:
 * - Dolly zoom (FOV changes adjust camera distance)
 * - Non-linear orbit range slider (26° default)
 * - Focus depth (click to set orbit target)
 * - Quality presets (High / Default / Performance)
 * - Bottom controls bar with reset, fullscreen
 * - FOV overlay slider on viewer
 * - Debug info panel (Status, File, Size, Splats, Time)
 * - Settings groups with collapsible sections
 * - Background color swatches
 * - FPS counter
 * - Keyboard shortcuts (R=reset, F=fullscreen, Esc=close panel)
 */
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import * as SPLAT from 'gsplat';
import { sharpFileStore, createBlobUrl, revokeBlobUrl } from '../utils/sharpFileStore';
import type { StoredFile } from '../utils/sharpFileStore';
import {
  type SplatLensMetadata,
  computeIntrinsicFov,
  computeCameraSpaceTarget,
  computeFitRadius,
  getCalibrationCenter,
  getFrontBeta,
  fovToFocalPx,
} from '../utils/splatLens';
import Header from '../components/Header';
import './RadiaViewerPage.css';

// ── Constants from radia-gallery source ──
const SHARP_VIEWER_FOV = 33; // Tighter than training FOV for better viewing
const DEFAULT_CAMERA_FOV = 60; // viewer.js:375
const DEFAULT_CAMERA_RANGE_DEGREES = 26; // CameraControls.jsx:35

// ── ICONS — inline SVG, no external deps ──

const ChevronLeftIcon = () => (
  <svg className="rv-chevron-icon" viewBox="0 0 320 512" fill="currentColor" width="14" height="14">
    <path d="M9.4 233.4c-12.5 12.5-12.5 32.8 0 45.3l192 192c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L77.3 256 246.6 86.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0l-192 192z"/>
  </svg>
);

const ChevronDownIcon = () => (
  <svg className="rv-chevron" viewBox="0 0 448 512" fill="currentColor" width="12" height="12">
    <path d="M201.4 374.6c12.5 12.5 32.8 12.5 45.3 0l160-160c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L224 306.7 86.6 169.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3l160 160z"/>
  </svg>
);

const HomeIcon = () => (
  <svg viewBox="0 0 576 512" fill="currentColor" width="16" height="16">
    <path d="M575.8 255.5c0 18-15 32.1-32 32.1h-32l.7 160.2c0 2.7-.2 5.4-.5 8.1V472c0 22.1-17.9 40-40 40H456c-1.1 0-2.2 0-3.3-.1c-1.4 .1-2.8 .1-4.2 .1H416 392c-22.1 0-40-17.9-40-40V376c0-9.9-8.1-18-18-18h-60c-9.9 0-18 8.1-18 18v96c0 22.1-17.9 40-40 40H184 160.5c-1.4 0-2.8 0-4.2-.1c-1.1 .1-2.2 .1-3.3 .1H120c-22.1 0-40-17.9-40-40V360c0-.9 0-1.9 .1-2.8V287.6H32c-18 0-32-14-32-32.1c0-9 3-17 10-24L266.4 8c7-7 15-8 22-8s15 2 21 7L564.8 231.5c8 7 12 15 11 24z"/>
  </svg>
);

const EyeIcon = () => (
  <svg viewBox="0 0 576 512" fill="currentColor" width="12" height="12">
    <path d="M288 32c-80.8 0-145.5 36.8-192.6 80.6C48.6 156 17.3 208 2.5 243.7c-3.3 7.9-3.3 16.7 0 24.6C17.3 304 48.6 356 95.4 399.4C142.5 443.2 207.2 480 288 480s145.5-36.8 192.6-80.6c46.8-43.5 78.1-95.4 93-131.1c3.3-7.9 3.3-16.7 0-24.6c-14.9-35.7-46.2-87.7-93-131.1C433.5 68.8 368.8 32 288 32zM144 256a144 144 0 1 1 288 0 144 144 0 1 1 -288 0zm144-64a64 64 0 1 0 0 128 64 64 0 1 0 0-128z"/>
  </svg>
);

const EyeSlashIcon = () => (
  <svg viewBox="0 0 640 512" fill="currentColor" width="12" height="12">
    <path d="M38.8 5.1C28.4-3.1 13.3-1.2 5.1 9.2S-1.2 34.7 9.2 42.9l592 464c10.4 8.2 25.5 6.3 33.7-4.1s6.3-25.5-4.1-33.7L525.6 386.7c39.6-40.6 66.4-86.1 79.9-118.4c3.3-7.9 3.3-16.7 0-24.6c-14.9-35.7-46.2-87.7-93-131.1C465.5 68.8 400.8 32 320 32c-68.2 0-125 26.3-169.3 60.8L38.8 5.1zM223.1 149.5C261.2 117.2 308.9 96 320 96c80.2 0 145 64.8 145 144c0 24.8-4.4 47.8-16.5 67.6L223.1 149.5z"/>
  </svg>
);

const FocusIcon = ({ size = 18 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width={size} height={size}>
    <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>
  </svg>
);

const MaximizeIcon = ({ size = 18 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width={size} height={size}>
    <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
    <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
  </svg>
);

const MinimizeIcon = ({ size = 18 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width={size} height={size}>
    <polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/>
    <line x1="14" y1="10" x2="21" y2="3"/><line x1="3" y1="21" x2="10" y2="14"/>
  </svg>
);

const UploadIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="56" height="56">
    <polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/>
    <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
  </svg>
);

const KeyboardIcon = ({ size = 14 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width={size} height={size}>
    <rect x="2" y="4" width="20" height="16" rx="2"/><line x1="6" y1="8" x2="6" y2="8"/>
    <line x1="10" y1="8" x2="10" y2="8"/><line x1="14" y1="8" x2="14" y2="8"/>
    <line x1="18" y1="8" x2="18" y2="8"/><line x1="8" y1="12" x2="16" y2="12"/>
    <line x1="6" y1="16" x2="6" y2="16"/><line x1="18" y1="16" x2="18" y2="16"/>
  </svg>
);

// ── Background presets ──
const BG_PRESETS = [
  { name: 'Charcoal', color: '#0c0d10' },
  { name: 'Faded blue', color: '#1a2332' },
  { name: 'Soft white', color: '#e8e4df' },
  { name: 'Dark green', color: '#0d1a12' },
];

// ── Non-linear orbit range math (from CameraControls.jsx:116-146) ──
const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);

const sliderValueToDegrees = (sliderValue: number) => {
  const t = clamp(sliderValue / 180, 0, 1);
  if (t <= 0.5) return 20 * t;
  if (t <= 0.85) return 10 + 20 * ((t - 0.5) / 0.35);
  return 30 + 150 * ((t - 0.85) / 0.15);
};

const degreesToSliderValue = (degrees: number) => {
  const clamped = clamp(degrees, 0, 180);
  if (clamped <= 10) return (clamped / 20) * 180;
  if (clamped <= 30) return (0.5 + 0.35 * ((clamped - 10) / 20)) * 180;
  return (0.85 + 0.15 * ((clamped - 30) / 150)) * 180;
};

const formatDegrees = (degrees: number) => degrees < 10 ? degrees.toFixed(1) : degrees.toFixed(0);

// ── Focus mode states ──
const FOCUS_MODE = { IDLE: 'idle', SETTING: 'setting', SET: 'set', CUSTOM: 'custom' };

// ── Aspect ratio options ──
const ASPECT_OPTIONS = [
  { value: 'full', label: 'Full', ratio: null },
  { value: '1:1', label: '1:1', ratio: 1 },
  { value: '16:9', label: '16:9', ratio: 16 / 9 },
  { value: '9:16', label: '9:16', ratio: 9 / 16 },
  { value: '4:3', label: '4:3', ratio: 4 / 3 },
  { value: '3:4', label: '3:4', ratio: 3 / 4 },
];

const applyCameraRangeDegrees = (controls: SPLAT.OrbitControls | null, degrees: number) => {
  if (!controls) return;
  // gsplat OrbitControls.minAngle/maxAngle are in DEGREES.
  // beta is the elevation angle: 0 = horizontal, negative = down, positive = up.
  // Default is minAngle=-90, maxAngle=90 (full hemisphere).
  // Our slider gives 0-180°, we split symmetrically: ±degrees/2
  const halfRange = clamp(degrees, 0, 180) / 2;
  if ('minAngle' in controls) controls.minAngle = -halfRange;
  if ('maxAngle' in controls) controls.maxAngle = halfRange;
};

// ── Depth focus auto-calculation ──
const computeMlSharpDepthFocus = (scene: SPLAT.Scene) => {
  const mesh = scene.objects?.[0] as SPLAT.Splat | undefined;
  if (!mesh || !mesh.data) return 2.0;
  const positions = mesh.data.positions;
  const numSplats = mesh.data.vertexCount;
  if (numSplats === 0) return 2.0;
  
  const allDepths: number[] = [];
  const maxSamples = 50000;
  const step = Math.max(1, Math.floor(numSplats / maxSamples));
  
  for (let i = 0; i < numSplats; i += step) {
    const idx = i * 3;
    const x = positions[idx];
    const y = positions[idx+1];
    const z = positions[idx+2];
    if (!Number.isFinite(z) || z <= 0) continue;
    allDepths.push(z);
  }
  
  if (allDepths.length === 0) return 2.0;
  allDepths.sort((a,b) => a - b);
  const qFocus = 0.1;
  const pos = Math.floor((allDepths.length - 1) * qFocus);
  return allDepths[pos] || 2.0;
};

// ── Collapsible settings group (from SidePanel/CameraControls) ──
const SettingsGroup: React.FC<{
  title: string;
  defaultOpen?: boolean;
  extra?: React.ReactNode;
  children: React.ReactNode;
}> = ({ title, defaultOpen = false, extra, children }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rv-settings-group">
      <div
        className="rv-group-toggle"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <span className="rv-settings-eyebrow">{title}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {extra}
          <ChevronDownIcon />
        </div>
      </div>
      {open && (
        <div className="rv-group-content">
          {children}
        </div>
      )}
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════
// Main component
// ══════════════════════════════════════════════════════════════════
const RadiaViewerPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // ── Core state ──
  const [panelOpen, setPanelOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadProgress, setLoadProgress] = useState('');
  const [hasModel, setHasModel] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [metadata, setMetadata] = useState<SplatLensMetadata | undefined>();
  const [isSharpModel, setIsSharpModel] = useState(false);

  // ── Camera controls (from CameraControls.jsx) ──
  const [fov, setFov] = useState(DEFAULT_CAMERA_FOV);
  const [cameraRange, setCameraRange] = useState(DEFAULT_CAMERA_RANGE_DEGREES);
  const [showFovOverlay, setShowFovOverlay] = useState(true);
  const [quality, setQuality] = useState<'high' | 'default' | 'performance'>('default');

  // ── Debug info (from SidePanel.jsx) ──
  const [fileInfo, setFileInfo] = useState({
    name: '-', size: '-', splatCount: '-', loadTime: '-',
  });
  const [status, setStatus] = useState('Ready');
  const [showFps, setShowFps] = useState(false);
  const [fps, setFps] = useState(0);

  // ── Background (from DebugSettings) ──
  const [bgColor, setBgColor] = useState('#0c0d10');
  const [bgImageUrl, setBgImageUrl] = useState<string | null>(null);

  // ── View Box Aspect Ratio ──
  const [aspectRatio, setAspectRatio] = useState<string>('full');

  // ── Focus ──
  const [focusMode, setFocusMode] = useState(FOCUS_MODE.IDLE);
  const [hasCustomFocus, setHasCustomFocus] = useState(false);

  // ── Slideshow (from AnimationSettings) ──
  const [animationEnabled, setAnimationEnabled] = useState(true);

  // ── Dolly zoom state (from viewer.js) ──
  const [dollyZoomEnabled, setDollyZoomEnabled] = useState(true);
  const [dollyZoomBaseDistance, setDollyZoomBaseDistance] = useState<number | null>(null);
  const [dollyZoomBaseFov, setDollyZoomBaseFov] = useState<number | null>(null);

  // ── Stereo side-by-side ──
  const [stereoEnabled, setStereoEnabled] = useState(false);

  // ── Splat width multiplier ──
  const [splatWidth, setSplatWidth] = useState(1.0);

  // ── Fullscreen ──
  const [isFullscreen, setIsFullscreen] = useState(false);

  // ── Refs ──
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sceneRef = useRef<SPLAT.Scene | null>(null);
  const cameraRef = useRef<SPLAT.Camera | null>(null);
  const rendererRef = useRef<SPLAT.WebGLRenderer | null>(null);
  const controlsRef = useRef<SPLAT.OrbitControls | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const blobUrlRef = useRef<string | null>(null);
  const fovRef = useRef(fov);
  const splatWidthRef = useRef(splatWidth);
  const fpsFrames = useRef<number[]>([]);
  const homeViewRef = useRef<{
    fov: number;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    target: any;
    radius: number;
    alpha: number;
    beta: number;
  } | null>(null);

  // Sync refs
  useEffect(() => { fovRef.current = fov; }, [fov]);
  useEffect(() => { splatWidthRef.current = splatWidth; }, [splatWidth]);

  // ── Fullscreen listener ──
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  // ── Cleanup ──
  const cleanup = useCallback(() => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    animFrameRef.current = null;
    controlsRef.current?.dispose();
    controlsRef.current = null;
    rendererRef.current?.dispose();
    rendererRef.current = null;
    sceneRef.current = null;
    cameraRef.current = null;
    if (blobUrlRef.current) { revokeBlobUrl(blobUrlRef.current); blobUrlRef.current = null; }
  }, []);

  useEffect(() => cleanup, [cleanup]);

  // ── Stamp FOV on gsplat camera ──
  const stampFov = useCallback(() => {
    const cam = cameraRef.current;
    const canvas = canvasRef.current;
    if (!cam || !canvas || canvas.width <= 0) return;
    const f = fovToFocalPx(fovRef.current, canvas.width);
    cam.data.fx = f;
    cam.data.fy = f;
  }, []);

  // ── Format file size ──
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  // ── Load a PLY from Blob ──
  const loadBlob = useCallback((blob: Blob, meta?: SplatLensMetadata, fromSharp = false, fileName = 'untitled.ply') => {
    cleanup();
    const canvas = canvasRef.current;
    if (!canvas) return;

    setIsLoading(true);
    setLoadProgress('Initializing...');
    setHasModel(false);
    setMetadata(meta);
    setIsSharpModel(fromSharp);
    setStatus('Loading...');
    const loadStartTime = performance.now();

    // Size the canvas
    const parent = canvas.parentElement;
    if (parent) {
      const rect = parent.getBoundingClientRect();
      canvas.width = Math.floor(rect.width) || 800;
      canvas.height = Math.floor(rect.height) || 600;
    }

    const url = createBlobUrl(blob);
    blobUrlRef.current = url;

    try {
      const scene = new SPLAT.Scene();
      const camera = new SPLAT.Camera();
      const renderer = new SPLAT.WebGLRenderer(canvas);

      // Compute initial camera params from metadata
      const isCameraSpace = meta?.viewerCalibration?.cameraSpace === true;
      const frontBeta = getFrontBeta(meta);
      const targetCenter = getCalibrationCenter(meta);
      const cameraSpaceConfig = computeCameraSpaceTarget(meta, frontBeta);

      // FOV: SHARP models use tighter viewer FOV, raw PLY uses intrinsic
      const intrinsicFov = computeIntrinsicFov(meta, canvas.width, canvas.height, DEFAULT_CAMERA_FOV);
      const viewerFov = fromSharp ? SHARP_VIEWER_FOV : Math.round(intrinsicFov);
      setFov(viewerFov);
      fovRef.current = viewerFov;

      const initialRadius = isCameraSpace
        ? cameraSpaceConfig.radius
        : computeFitRadius(meta, viewerFov, frontBeta, canvas.width, canvas.height, 5);
      const initialTarget = isCameraSpace ? cameraSpaceConfig.target : targetCenter;

      const controls = new SPLAT.OrbitControls(
        camera, canvas,
        0, frontBeta, initialRadius, true,
        new SPLAT.Vector3(initialTarget[0], initialTarget[1], initialTarget[2])
      );
      controls.setCameraTarget?.(new SPLAT.Vector3(initialTarget[0], initialTarget[1], initialTarget[2]));
      // Match radia-gallery damping/speed (viewer.js:398-401, scaled for gsplat)
      controls.orbitSpeed = 0.75;
      controls.panSpeed = 0.6;
      controls.zoomSpeed = 0.6;
      controls.dampening = 0.08;
      controls.minZoom = Math.max(0.3, initialRadius * 0.12);
      controls.maxZoom = Math.max(15, initialRadius * 3);

      // Apply initial orbit range (MUST be done after controls creation)
      applyCameraRangeDegrees(controls, DEFAULT_CAMERA_RANGE_DEGREES);

      sceneRef.current = scene;
      cameraRef.current = camera;
      rendererRef.current = renderer;
      controlsRef.current = controls;
      controls.update();

      // Set initial intrinsics
      camera.data.setSize(canvas.width, canvas.height);
      const focalPx = fovToFocalPx(viewerFov, canvas.width);
      camera.data.fx = focalPx;
      camera.data.fy = focalPx;

      // Save home view for reset
      homeViewRef.current = {
        fov: viewerFov,
        target: [initialTarget[0], initialTarget[1], initialTarget[2]],
        radius: initialRadius,
        alpha: 0,
        beta: frontBeta,
      };

      // Initialize dolly zoom baseline
      setDollyZoomBaseDistance(initialRadius);
      setDollyZoomBaseFov(viewerFov);

      // Flag to capture background after next frame when fully loaded
      const needsBgCaptureRef = { current: false };

      // Animation loop
      let lastFpsUpdate = performance.now();
      let frameCount = 0;
      let lastSplatWidth = splatWidthRef.current;
      const animate = () => {
        if (!rendererRef.current || !sceneRef.current || !cameraRef.current || !controlsRef.current) return;

        const now = performance.now();
        frameCount++;

        // FPS counter (update every 250ms like source)
        if (now - lastFpsUpdate >= 250) {
          const currentFps = Math.round((frameCount * 1000) / (now - lastFpsUpdate));
          setFps(currentFps);
          frameCount = 0;
          lastFpsUpdate = now;
        }

        // Guard FOV (no splatWidth hack)
        const expectedFx = fovToFocalPx(fovRef.current, canvas.width);
        if (Math.abs(cameraRef.current.data.fx - expectedFx) > 0.5) {
          cameraRef.current.data.fx = expectedFx;
          cameraRef.current.data.fy = expectedFx;
        }

        // Calculate dynamic splat scale compensation for dolly zoom.
        // gsplat.js renders splats larger and blurrier when the camera gets close
        // because its screen-space antialiasing clamp stops hiding their true large physical size.
        // We shrink their physical sizes proportionally as we dolly zoom in to maintain sharpness.
        let fovCompensation = 1.0;
        if (dollyZoomEnabled && dollyZoomBaseFov) {
          const baseTan = Math.tan(dollyZoomBaseFov * Math.PI / 360);
          const currentTan = Math.tan(fovRef.current * Math.PI / 360);
          if (currentTan > 0.001) {
            // As FOV increases (we move closer), this ratio becomes < 1 (shrinking splats)
            fovCompensation = baseTan / currentTan;
          }
        }

        // Apply true splat width via buffer scaling
        const targetSplatWidth = splatWidthRef.current * fovCompensation;
        
        // Use a small epsilon for float comparison to avoid jitter
        if (Math.abs(targetSplatWidth - lastSplatWidth) > 0.001) {
          const splatObj = sceneRef.current.objects[0] as SPLAT.Splat | undefined;
          if (splatObj && splatObj.data) {
            const splatData = splatObj.data;
            // Initialize original scales backup on first change
            if (!(splatObj as any)._originalScales) {
              (splatObj as any)._originalScales = new Float32Array(splatData.scales);
            }
            const orig = (splatObj as any)._originalScales as Float32Array;
            const current = splatData.scales;
            
            // gsplat stores scales in log format: scales[i] = ln(physicalScale)
            // To scale the physical size by targetSplatWidth: add ln(targetSplatWidth)
            const logW = Math.log(targetSplatWidth);
            for (let i = 0; i < current.length; i++) {
              current[i] = orig[i] + logW;
            }
            splatData.changed = true;
            
            // Tell renderer to update
            if (rendererRef.current.renderProgram?.renderData) {
              rendererRef.current.renderProgram.renderData.markDirty(splatObj);
            }
            lastSplatWidth = targetSplatWidth;
          }
        }

        controlsRef.current.update();
        rendererRef.current.render(sceneRef.current, cameraRef.current);
        
        // Capture adaptive background here, synchronously after render
        if (needsBgCaptureRef.current) {
          needsBgCaptureRef.current = false;
          const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
          setBgImageUrl(dataUrl);
        }

        animFrameRef.current = requestAnimationFrame(animate);
      };

      // Load PLY
      setLoadProgress('Loading splats...');
      SPLAT.PLYLoader.LoadAsync(url, scene, (p: number) => {
        setLoadProgress(`Loading... ${(p * 100).toFixed(0)}%`);
      }).then(() => {
        const loadTime = ((performance.now() - loadStartTime) / 1000).toFixed(1);
        setIsLoading(false);
        setHasModel(true);
        setStatus('Ready');
        setFileInfo({
          name: fileName,
          size: formatSize(blob.size),
          splatCount: (scene as unknown as { splatCount?: number }).splatCount?.toString?.() ?? '-',
          loadTime: `${loadTime}s`,
        });

        // Compute intelligent depth target
        if (fromSharp) {
          const focusDepth = computeMlSharpDepthFocus(scene);
          const target = new SPLAT.Vector3(initialTarget[0], initialTarget[1], focusDepth);
          controls.setCameraTarget?.(target);
          if (homeViewRef.current) homeViewRef.current.target[2] = focusDepth;
        }

        animate();

        // Queue background capture after a beat so the camera can settle
        setTimeout(() => {
          needsBgCaptureRef.current = true;
        }, 300);
      }).catch((err: unknown) => {
        console.error('[RadiaViewer] Load failed:', err);
        setIsLoading(false);
        setLoadProgress('Failed to load model');
        setStatus('Error');
      });

    } catch (err) {
      console.error('[RadiaViewer] Init error:', err);
      setIsLoading(false);
      setStatus('Error');
    }
  }, [cleanup, stampFov]);

  // ── Handle FOV change with dolly zoom ──
  // Dolly zoom: when FOV changes, move the camera along its orbit to keep
  // the subject the same apparent size. We use setCameraTarget() which
  // internally updates the closure-scoped desiredRadius.
  const handleFovChange = useCallback((newFov: number) => {
    if (!Number.isFinite(newFov)) return;
    const cam = cameraRef.current;
    const controls = controlsRef.current;
    const canvas = canvasRef.current;

    const oldFov = fovRef.current;
    setFov(newFov);
    fovRef.current = newFov;

    if (cam && canvas) {
      // Update focal length (projection)
      const f = fovToFocalPx(newFov, canvas.width);
      cam.data.fx = f;
      cam.data.fy = f;
    }

    // Dolly zoom: adjust orbit radius to compensate for FOV change
    if (dollyZoomEnabled && controls && cam && dollyZoomBaseDistance && dollyZoomBaseFov) {
      const baseTan = Math.tan((dollyZoomBaseFov / 2) * Math.PI / 180);
      const newTan = Math.tan((newFov / 2) * Math.PI / 180);
      if (newTan > 0.001 && baseTan > 0.001) {
        const newDistance = dollyZoomBaseDistance * (baseTan / newTan);

        // Get current camera-to-target direction
        const target = homeViewRef.current?.target ?? [0, 0, 0];
        const camPos = cam.position;
        const dx = camPos.x - target[0];
        const dy = camPos.y - target[1];
        const dz = camPos.z - target[2];
        const currentDist = Math.sqrt(dx * dx + dy * dy + dz * dz);

        if (currentDist > 0.001) {
          // Move camera to new distance along current direction
          const scale = newDistance / currentDist;
          cam.position = new SPLAT.Vector3(
            target[0] + dx * scale,
            target[1] + dy * scale,
            target[2] + dz * scale
          );
          // setCameraTarget() recalculates desiredRadius from camera.position
          controls.setCameraTarget(
            new SPLAT.Vector3(target[0], target[1], target[2])
          );
          // INSTANT TELEPORT: temporarily disable dampening so the camera
          // snaps to the new distance instantly instead of slowly dragging.
          // This keeps the subject exactly the same size during FOV changes.
          const oldDampening = controls.dampening;
          controls.dampening = 1.0;
          controls.update();
          controls.dampening = oldDampening;

          // Update zoom limits to accommodate new distance
          controls.minZoom = Math.min(controls.minZoom, newDistance * 0.3);
          controls.maxZoom = Math.max(controls.maxZoom, newDistance * 3);
        }
      }
    }
  }, [dollyZoomEnabled, dollyZoomBaseDistance, dollyZoomBaseFov]);

  // ── Handle background color ──
  useEffect(() => {
    if (canvasRef.current) {
      canvasRef.current.style.backgroundColor = bgColor;
    }
  }, [bgColor]);

  // ── Handle resize ──
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      const cam = cameraRef.current;
      if (!canvas || !cam) return;
      const parent = canvas.parentElement;
      if (parent) {
        const rect = parent.getBoundingClientRect();
        let targetW = rect.width || 800;
        let targetH = rect.height || 600;
        
        // Enforce aspect ratio View Box
        const opt = ASPECT_OPTIONS.find((o) => o.value === aspectRatio);
        if (opt && opt.ratio !== null) {
          const parentRatio = targetW / targetH;
          if (opt.ratio > parentRatio) {
             targetH = targetW / opt.ratio;
          } else {
             targetW = targetH * opt.ratio;
          }
        }
        
        canvas.width = Math.floor(targetW);
        canvas.height = Math.floor(targetH);
        
        canvas.style.width = `${canvas.width}px`;
        canvas.style.height = `${canvas.height}px`;
        canvas.style.margin = 'auto';
      }
      cam.data.setSize(canvas.width, canvas.height);
      stampFov();
    };
    handleResize(); // Call unconditionally on dependency changes
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [stampFov, aspectRatio]);

  // ── Manual focus raycast ──
  useEffect(() => {
    if (focusMode !== FOCUS_MODE.SETTING) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleFocusClick = (e: MouseEvent) => {
      const scene = sceneRef.current;
      const cam = cameraRef.current;
      const controls = controlsRef.current;
      if (scene && cam && controls) {
        // Poor man's raycast using auto-calc as the general focus
        const focusDepth = computeMlSharpDepthFocus(scene);
        const forward = cam.screenPointToRay(0, 0).normalize();
        const offset = forward.multiply(focusDepth);
        const newTarget = cam.position.add(offset);
        controls.setCameraTarget?.(newTarget);
      }
      setHasCustomFocus(true);
      setFocusMode(FOCUS_MODE.SET);
      setTimeout(() => setFocusMode(FOCUS_MODE.CUSTOM), 1500);
    };

    const handleKeyCancel = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFocusMode(hasCustomFocus ? FOCUS_MODE.CUSTOM : FOCUS_MODE.IDLE);
    };

    canvas.style.cursor = 'crosshair';
    canvas.addEventListener('click', handleFocusClick);
    document.addEventListener('keydown', handleKeyCancel);
    return () => {
      canvas.style.cursor = '';
      canvas.removeEventListener('click', handleFocusClick);
      document.removeEventListener('keydown', handleKeyCancel);
    };
  }, [focusMode, hasCustomFocus]);

  // ── Load from SharpPage (loadId param) ──
  useEffect(() => {
    const loadId = searchParams.get('loadId');
    if (!loadId) return;

    setIsLoading(true);
    setLoadProgress('Loading from gallery...');
    setStatus('Loading from SHARP...');

    sharpFileStore.get(loadId).then((stored: StoredFile | null) => {
      if (!stored) {
        setIsLoading(false);
        setLoadProgress('File not found');
        setStatus('Error');
        return;
      }
      loadBlob(stored.blob, stored.metadata as SplatLensMetadata | undefined, true, (stored as unknown as { name?: string }).name || 'sharp-model.ply');
    }).catch(() => {
      setIsLoading(false);
      setLoadProgress('Failed to load file');
      setStatus('Error');
    });
  }, [searchParams, loadBlob]);

  // ── File handling ──
  const handleFile = useCallback((file: File) => {
    if (!file.name.match(/\.(ply|splat)$/i)) return;
    const blob = new Blob([file], { type: 'application/octet-stream' });
    loadBlob(blob, undefined, false, file.name);
  }, [loadBlob]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  // ── Fullscreen ──
  const handleFullscreen = useCallback(() => {
    const el = document.querySelector('.rv-page');
    if (!el) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      el.requestFullscreen?.();
    }
  }, []);

  // ── Reset view ──
  const handleReset = useCallback(() => {
    const controls = controlsRef.current;
    const cam = cameraRef.current;
    const canvas = canvasRef.current;
    if (!controls || !cam || !canvas) return;

    if (homeViewRef.current) {
      const h = homeViewRef.current;
      handleFovChange(h.fov);
      controls.setCameraTarget?.(new SPLAT.Vector3(h.target[0], h.target[1], h.target[2]));
      // Reset dolly zoom baseline
      setDollyZoomBaseDistance(h.radius);
      setDollyZoomBaseFov(h.fov);
    } else {
      const frontBeta = getFrontBeta(metadata);
      const targetCenter = getCalibrationCenter(metadata);
      const resetFov = isSharpModel ? SHARP_VIEWER_FOV : Math.round(computeIntrinsicFov(
        metadata, canvas.width, canvas.height, DEFAULT_CAMERA_FOV
      ));
      handleFovChange(resetFov);
      const target = targetCenter;
      controls.setCameraTarget?.(new SPLAT.Vector3(target[0], target[1], target[2]));
    }
    controls.update();
  }, [metadata, isSharpModel, handleFovChange]);

  // ── Navigate home ──
  const handleGoHome = useCallback(() => {
    navigate('/');
  }, [navigate]);

  // ── Right-click closes panel ──
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      e.preventDefault();
      setPanelOpen(false);
    };
    const canvas = canvasRef.current;
    canvas?.addEventListener('contextmenu', handler);
    return () => canvas?.removeEventListener('contextmenu', handler);
  }, []);

  // ── Keyboard shortcuts ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return;
      if (e.key === 'r' || e.key === 'R') handleReset();
      if (e.key === 'f' || e.key === 'F') handleFullscreen();
      if (e.key === 'Escape') setPanelOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleReset, handleFullscreen]);

  // ══════════════════════════════════════════════════════════════════
  // Render
  // ══════════════════════════════════════════════════════════════════
  return (
    <div className={`rv-page${panelOpen ? ' panel-open' : ''}`} style={{ background: bgColor }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 9000, pointerEvents: 'auto' }}>
        <Header />
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        style={{ display: 'none' }}
        type="file"
        accept=".ply,.splat"
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
      />

      {/* ── Adaptive Background ── */}
      {bgImageUrl && (
        <div 
          className="rv-adaptive-bg"
          style={{
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundImage: `url(${bgImageUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'blur(30px)',
            opacity: 0.35,
            pointerEvents: 'none',
            zIndex: 0,
          }} 
        />
      )}

      {/* ── Viewer shell ── */}
      <div className="rv-viewer-shell" style={{ width: '100%', height: '100%', position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div
          id="viewer"
          className={`rv-viewer${hasModel ? '' : ' is-empty'}`}
          style={{ width: '100%', height: '100%', display: 'flex' }}
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
          onDragLeave={() => setIsDragOver(false)}
        >
          <canvas
            ref={canvasRef}
            style={{ backgroundColor: bgImageUrl ? 'transparent' : bgColor }}
          />

          {/* Drop overlay */}
          <div className={`rv-viewer-drop-overlay${isDragOver ? ' is-active' : ''}`} />

          {/* Upload overlay (no model, not loading) */}
          {!hasModel && !isLoading && (
            <div
              className={`rv-upload-overlay visible ${isDragOver ? 'is-dragover' : ''}`}
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="rv-upload-card-premium">
                <div className="rv-upload-icon-wrapper">
                  <UploadIcon />
                </div>
                <h2 className="rv-upload-title">Initialize Environment</h2>
                <div className="rv-upload-subtitle">
                  {isDragOver ? (
                    <span className="rv-highlight text-cyan-300">Drop file now to construct scene</span>
                  ) : (
                    <>Drag & drop a <span className="rv-highlight text-cyan-400">.ply</span> or <span className="rv-highlight text-cyan-400">.splat</span> file, or click to browse</>
                  )}
                </div>
              </div>
              
              {/* Decorative ambient background elements for the empty state */}
              <div className="rv-ambient-glow rv-glow-1" />
              <div className="rv-ambient-glow rv-glow-2" />
              <div className="rv-ambient-grid" />
            </div>
          )}

          {/* Loading overlay */}
          {isLoading && (
            <div className="rv-loading-overlay" style={{ opacity: 1, pointerEvents: 'auto' }}>
              <div style={{ textAlign: 'center' }}>
                <div className="rv-loading-spinner" />
                <div style={{ marginTop: '12px', fontSize: '13px', color: '#e6ecf8' }}>
                  {loadProgress || 'Loading...'}
                </div>
              </div>
            </div>
          )}

          {/* FPS counter */}
          {showFps && hasModel && (
            <div className="rv-fps-counter">{fps} FPS</div>
          )}
        </div>
      </div>

      {/* ── Panel toggle button ── */}
      <button
        className={`rv-panel-toggle${panelOpen ? ' open' : ''}`}
        aria-label="Toggle info panel"
        type="button"
        onClick={() => setPanelOpen(!panelOpen)}
      >
        <ChevronLeftIcon />
      </button>

      {/* ── Sidepanel hover target ── */}
      <div
        className="rv-sidepanel-hover-target"
        onMouseEnter={() => { if (!panelOpen) setPanelOpen(true); }}
      />

      {/* ── Side panel ── */}
      <div className="rv-side">
        {/* Debug info */}
        <div className="rv-debug">
          <div className="rv-row"><span>Status</span><span>{status}</span></div>
          <div className="rv-row"><span>File</span><span>{fileInfo.name}</span></div>
          <div className="rv-row"><span>Size</span><span>{fileInfo.size}</span></div>
          <div className="rv-row"><span>Splats</span><span>{fileInfo.splatCount}</span></div>
          <div className="rv-row"><span>Time</span><span>{fileInfo.loadTime}</span></div>
          <button
            className="rv-home-btn rv-debug-home"
            aria-label="Back to home"
            type="button"
            onClick={handleGoHome}
          >
            <HomeIcon />
          </button>
        </div>

        {/* ── Camera Settings ── */}
        <SettingsGroup title="Camera Settings" defaultOpen={true} extra={
          <button
            type="button"
            title="Controls guide"
            onClick={(e) => { e.stopPropagation(); }}
            style={{ width: '28px', height: '22px', fontSize: '11px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', color: 'rgba(230,236,248,0.7)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
          >
            <KeyboardIcon size={14} />
          </button>
        }>
          {/* Quality preset */}
          <div className="rv-control-row">
            <span className="rv-control-label">Quality</span>
            <div className="rv-control-track">
              <select
                value={quality}
                onChange={(e) => setQuality(e.target.value as 'high' | 'default' | 'performance')}
              >
                <option value="high">High</option>
                <option value="default">Default</option>
                <option value="performance">Performance</option>
              </select>
            </div>
          </div>

          {/* Orbit range (non-linear) */}
          <div className="rv-control-row rv-camera-range-controls">
            <span className="rv-control-label">Orbit range</span>
            <div className="rv-control-track">
              <input
                type="range"
                min="0" max="180" step="0.1"
                value={degreesToSliderValue(cameraRange)}
                onInput={(e) => {
                  const val = parseFloat((e.target as HTMLInputElement).value);
                  const degrees = sliderValueToDegrees(val);
                  setCameraRange(degrees);
                  applyCameraRangeDegrees(controlsRef.current, degrees);
                }}
              />
              <span className="rv-control-value">{formatDegrees(cameraRange)}°</span>
            </div>
          </div>

          {/* FOV control */}
          <div className="rv-control-row">
            <span className="rv-control-label rv-fov-label">
              FOV
              <button
                type="button"
                className={`rv-fov-toggle-btn ${showFovOverlay ? 'is-on' : 'is-off'}`}
                onClick={() => setShowFovOverlay(!showFovOverlay)}
                title={showFovOverlay ? 'Hide viewer FOV slider' : 'Show viewer FOV slider'}
                aria-pressed={showFovOverlay}
              >
                {showFovOverlay ? <EyeIcon /> : <EyeSlashIcon />}
              </button>
            </span>
            <div className="rv-control-track">
              <input
                type="range"
                min="20" max="120" step="1"
                value={fov}
                onInput={(e) => handleFovChange(Number((e.target as HTMLInputElement).value))}
              />
              <span className="rv-control-value">{Math.round(fov)}°</span>
            </div>
          </div>

          {/* Focus depth button */}
          <div className="rv-focus-control" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button 
              className="rv-secondary rv-focus-main-btn" 
              type="button"
              style={{ width: '100%' }}
              onClick={() => {
                if (focusMode === FOCUS_MODE.SETTING) {
                  setFocusMode(hasCustomFocus ? FOCUS_MODE.CUSTOM : FOCUS_MODE.IDLE);
                } else {
                  setFocusMode(FOCUS_MODE.SETTING);
                }
              }}
            >
              {focusMode === FOCUS_MODE.SETTING ? 'Click model...' : 
               focusMode === FOCUS_MODE.SET ? 'Focus set' :
               focusMode === FOCUS_MODE.CUSTOM ? 'Custom focus' : 'Set focus depth'}
            </button>
            {hasCustomFocus && (
              <button
                type="button"
                className="rv-secondary rv-danger"
                style={{ width: '100%', color: '#ff6b6b' }}
                onClick={() => {
                  setHasCustomFocus(false);
                  setFocusMode(FOCUS_MODE.IDLE);
                  handleReset();
                }}
              >
                Clear Focus
              </button>
            )}
          </div>

          {/* View Box Aspect Ratio */}
          <div className="rv-control-row">
            <span className="rv-control-label">Aspect ratio</span>
            <div className="rv-control-track">
              <select
                value={aspectRatio}
                onChange={(e) => setAspectRatio(e.target.value)}
                style={{ width: '100%', background: 'rgba(255,255,255,0.06)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', padding: '4px 8px', borderRadius: '4px' }}
              >
                {ASPECT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value} style={{ background: '#1c1f26' }}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Dolly zoom toggle */}
          <div className="rv-control-row">
            <span className="rv-control-label">Dolly zoom</span>
            <label className="rv-switch">
              <input
                type="checkbox"
                checked={dollyZoomEnabled}
                onChange={() => setDollyZoomEnabled(!dollyZoomEnabled)}
              />
              <span className="rv-switch-track" />
            </label>
          </div>

          {/* Splat width */}
          <div className="rv-control-row">
            <span className="rv-control-label">Splat width</span>
            <div className="rv-control-track">
              <input
                type="range"
                min="0.5" max="2.0" step="0.1"
                value={splatWidth}
                onInput={(e) => setSplatWidth(Number((e.target as HTMLInputElement).value))}
              />
              <span className="rv-control-value">{splatWidth.toFixed(1)}×</span>
            </div>
          </div>

          {/* Recenter */}
          <button className="rv-secondary" type="button" onClick={handleReset} style={{ width: '100%' }}>
            Recenter
          </button>
          <div className="rv-recenter-hint">Hold for hard reset</div>
        </SettingsGroup>

        {/* ── Animation Settings ── */}
        <SettingsGroup title="Animation Settings">
          <div className="rv-control-row">
            <span className="rv-control-label">Animate transitions</span>
            <label className="rv-switch">
              <input
                type="checkbox"
                checked={animationEnabled}
                onChange={() => setAnimationEnabled(!animationEnabled)}
              />
              <span className="rv-switch-track" />
            </label>
          </div>
        </SettingsGroup>

        {/* ── Advanced Settings ── */}
        <SettingsGroup title="Advanced Settings">
          <div className="rv-control-row">
            <span className="rv-control-label">Show FPS</span>
            <label className="rv-switch">
              <input
                type="checkbox"
                checked={showFps}
                onChange={() => setShowFps(!showFps)}
              />
              <span className="rv-switch-track" />
            </label>
          </div>

          {/* Stereo side-by-side */}
          <div className="rv-control-row">
            <span className="rv-control-label">Side-by-side stereo</span>
            <label className="rv-switch">
              <input
                type="checkbox"
                checked={stereoEnabled}
                onChange={() => setStereoEnabled(!stereoEnabled)}
              />
              <span className="rv-switch-track" />
            </label>
          </div>

          {/* Quality preset */}
          <div className="rv-control-row">
            <span className="rv-control-label">Quality</span>
            <div className="rv-control-track">
              <select
                value={quality}
                onChange={(e) => setQuality(e.target.value as 'high' | 'default' | 'performance')}
                style={{ width: '100%', background: 'rgba(255,255,255,0.06)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', padding: '4px 8px', borderRadius: '4px' }}
              >
                <option value="high" style={{ background: '#1c1f26' }}>High</option>
                <option value="default" style={{ background: '#1c1f26' }}>Default</option>
                <option value="performance" style={{ background: '#1c1f26' }}>Performance</option>
              </select>
            </div>
          </div>

          <div className="rv-settings-divider">
            <span>Background</span>
          </div>

          <div className="rv-color-swatch-group">
            {BG_PRESETS.map((preset) => (
              <button
                key={preset.name}
                className={`rv-color-swatch${bgColor === preset.color ? ' active' : ''}`}
                style={{ backgroundColor: preset.color }}
                onClick={() => setBgColor(preset.color)}
                title={preset.name}
              />
            ))}
          </div>
        </SettingsGroup>
      </div>

      {/* ── Bottom controls bar ── */}
      {hasModel && (
        <div className="rv-bottom-controls">
          <div className="rv-bottom-controls-left" />

          <div className="rv-bottom-controls-center">
            <div className="rv-bottom-controls-center-inner">
              {/* FOV overlay */}
              {showFovOverlay && (
                <div className="rv-fov-overlay">
                  <input
                    className="rv-fov-overlay-slider"
                    type="range"
                    min="20" max="120" step="1"
                    value={fov}
                    onInput={(e) => handleFovChange(Number((e.target as HTMLInputElement).value))}
                  />
                </div>
              )}
            </div>
          </div>

          <div className="rv-bottom-controls-right">
            {/* Reset view */}
            <button
              className="rv-bottom-page-btn"
              onClick={handleReset}
              aria-label="Reset camera view"
              title="Reset view (R)"
            >
              <FocusIcon size={18} />
            </button>

            {/* Fullscreen */}
            <button
              className="rv-bottom-page-btn"
              onClick={handleFullscreen}
              aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
              title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            >
              {isFullscreen ? <MinimizeIcon size={18} /> : <MaximizeIcon size={18} />}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RadiaViewerPage;
