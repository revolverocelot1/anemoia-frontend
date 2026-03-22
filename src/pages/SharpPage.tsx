import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import * as SPLAT from 'gsplat';
import Header from '../components/Header';
import Footer from '../components/Footer';
import NavigationBreadcrumb from '../components/NavigationBreadcrumb';
import CardGlass from '../components/CardGlass';
import { sharpService, type GenerationResult, type GenerationMode } from '../services/sharp.service';
import { sharpEnhancedService, type EnhancedGenerationResult } from '../services/sharp-enhanced.service';
import { sharpFileStore, createBlobUrl, revokeBlobUrl } from '../utils/sharpFileStore';
import { detectGPU, type GPUInfo } from '../utils/gpuUtils';
import {
  type SplatLensMetadata,
  computeIntrinsicFov,
  computeCameraSpaceTarget,
  computeFitRadius,
  getCalibrationCenter,
  getFrontBeta,
} from '../utils/splatLens';
import {
  Upload, Sparkles, Download, Eye, Settings2, Zap,
  Image, Camera, Box, Loader2, AlertCircle, CheckCircle2,
  Info, ChevronDown, ExternalLink, RefreshCw, RotateCcw, Maximize2,
  FlaskConical, Wand2
} from 'lucide-react';

// Custom animated background component
const SharpBackground: React.FC = () => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Gradient base */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-indigo-950/30 to-slate-950" />
      
      {/* Animated grid */}
      <div className="absolute inset-0 opacity-20">
        <svg width="100%" height="100%" className="absolute inset-0">
          <defs>
            <pattern id="sharpGrid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(99, 102, 241, 0.3)" strokeWidth="0.5" />
            </pattern>
            <linearGradient id="gridFade" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="white" stopOpacity="0" />
              <stop offset="50%" stopColor="white" stopOpacity="1" />
              <stop offset="100%" stopColor="white" stopOpacity="0" />
            </linearGradient>
            <mask id="gridMask">
              <rect width="100%" height="100%" fill="url(#gridFade)" />
            </mask>
          </defs>
          <rect width="100%" height="100%" fill="url(#sharpGrid)" mask="url(#gridMask)" />
        </svg>
      </div>

      {/* Floating particles */}
      {Array.from({ length: 30 }, (_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 rounded-full"
          style={{
            background: `linear-gradient(135deg, ${
              ['#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd'][i % 4]
            }, transparent)`,
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
          }}
          animate={{
            y: [0, -30, 0],
            x: [0, Math.random() * 20 - 10, 0],
            opacity: [0.2, 0.8, 0.2],
            scale: [0.5, 1.5, 0.5],
          }}
          transition={{
            duration: 4 + Math.random() * 4,
            repeat: Infinity,
            delay: Math.random() * 4,
            ease: "easeInOut"
          }}
        />
      ))}

      {/* Glowing orbs */}
      <motion.div
        className="absolute w-96 h-96 rounded-full blur-3xl opacity-20"
        style={{ background: 'radial-gradient(circle, #6366f1 0%, transparent 70%)' }}
        animate={{
          x: ['-20%', '120%'],
          y: ['20%', '60%'],
        }}
        transition={{ duration: 20, repeat: Infinity, repeatType: 'reverse', ease: 'linear' }}
      />
      <motion.div
        className="absolute w-72 h-72 rounded-full blur-3xl opacity-15"
        style={{ background: 'radial-gradient(circle, #8b5cf6 0%, transparent 70%)' }}
        animate={{
          x: ['120%', '-20%'],
          y: ['60%', '20%'],
        }}
        transition={{ duration: 15, repeat: Infinity, repeatType: 'reverse', ease: 'linear' }}
      />
    </div>
  );
};

// Actual 3D Gaussian Splat Viewer Component
const SplatPreview3D: React.FC<{
  blob: Blob | null;
  metadata?: SplatLensMetadata;
  onFullscreen?: () => void;
}> = ({ blob, metadata, onFullscreen }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<SPLAT.WebGLRenderer | null>(null);
  const sceneRef = useRef<SPLAT.Scene | null>(null);
  const cameraRef = useRef<SPLAT.Camera | null>(null);
  const controlsRef = useRef<SPLAT.OrbitControls | null>(null);
  const animationRef = useRef<number | null>(null);
  const blobUrlRef = useRef<string | null>(null);
  const defaultViewFov = useMemo(
    () => (metadata ? computeIntrinsicFov(metadata, 800, 600, 60) : 60),
    [metadata],
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!blob || !canvasRef.current) return;
    let disposed = false;

    // Cleanup previous resources
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    if (controlsRef.current) {
      controlsRef.current.dispose();
      controlsRef.current = null;
    }
    if (rendererRef.current) {
      rendererRef.current.dispose();
      rendererRef.current = null;
    }
    if (blobUrlRef.current) {
      revokeBlobUrl(blobUrlRef.current);
      blobUrlRef.current = null;
    }
    sceneRef.current = null;
    cameraRef.current = null;
    
    setIsLoading(true);
    setError(null);

    const canvas = canvasRef.current;
    const url = createBlobUrl(blob);
    blobUrlRef.current = url;

    // Set canvas dimensions explicitly (required for WebGL)
    const parent = canvas.parentElement;
    if (parent) {
      const rect = parent.getBoundingClientRect();
      canvas.width = Math.floor(rect.width) || 400;
      canvas.height = Math.floor(rect.height) || 300;
    } else {
      canvas.width = 400;
      canvas.height = 300;
    }

    try {
      // Initialize gsplat.js components
      const scene = new SPLAT.Scene();
      const camera = new SPLAT.Camera();
      const renderer = new SPLAT.WebGLRenderer(canvas);

      const isCameraSpace = metadata?.viewerCalibration?.cameraSpace === true;
      const frontBeta = getFrontBeta(metadata);
      const targetCenter = getCalibrationCenter(metadata);
      const initialCameraSpaceConfig = computeCameraSpaceTarget(metadata, frontBeta);
      const initialRadius = isCameraSpace
        ? initialCameraSpaceConfig.radius
        : computeFitRadius(metadata, defaultViewFov, frontBeta, canvas.width, canvas.height, 5);
      const initialTarget = isCameraSpace
        ? initialCameraSpaceConfig.target
        : targetCenter;

      const controls = new SPLAT.OrbitControls(
        camera,
        canvas,
        0,
        frontBeta,
        initialRadius,
        true,
        new SPLAT.Vector3(initialTarget[0], initialTarget[1], initialTarget[2])
      );
      controls.setCameraTarget?.(new SPLAT.Vector3(initialTarget[0], initialTarget[1], initialTarget[2]));
      
      controls.orbitSpeed = 1.5;
      controls.panSpeed = 1.0;
      controls.zoomSpeed = 2.0;
      controls.dampening = 0.08;
      controls.minZoom = Math.max(0.3, initialRadius * 0.12);
      controls.maxZoom = Math.max(15, initialRadius * 3);

      sceneRef.current = scene;
      cameraRef.current = camera;
      rendererRef.current = renderer;
      controlsRef.current = controls;

      // Force an immediate update so the camera position is set right away
      controls.update();

      // Set camera size — use metadata-driven FOV for lens intrinsics
      camera.data.setSize(canvas.width, canvas.height);
      const previewFov = defaultViewFov;
      const fovRad = (previewFov * Math.PI) / 180;
      const previewFocalPx = (canvas.width / 2) / Math.tan(fovRad / 2);
      camera.data.fx = previewFocalPx;
      camera.data.fy = previewFocalPx;

      // Kick-start dampening: tiny synthetic drag so update() detects a delta
      const syntheticNudge = () => {
        const rect = canvas.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        canvas.dispatchEvent(new MouseEvent('mousedown', { clientX: cx, clientY: cy, button: 0, bubbles: true }));
        canvas.dispatchEvent(new MouseEvent('mousemove', { clientX: cx + 0.1, clientY: cy, button: 0, bubbles: true }));
        window.dispatchEvent(new MouseEvent('mouseup', { clientX: cx + 0.1, clientY: cy, button: 0, bubbles: true }));
      };

      // Animation loop with frame counter for initial render warmup
      let frameCount = 0;
      const animate = () => {
        if (!rendererRef.current || !sceneRef.current || !cameraRef.current || !controlsRef.current) return;

        // FOV guard — enforce metadata-derived FOV if gsplat overwrites fx/fy
        if (canvas.width > 0 && cameraRef.current.data) {
          const desiredFovRad = (previewFov * Math.PI) / 180;
          const expectedFx = (canvas.width / 2) / Math.tan(desiredFovRad / 2);
          if (Math.abs(cameraRef.current.data.fx - expectedFx) > 0.5) {
            cameraRef.current.data.fx = expectedFx;
            cameraRef.current.data.fy = expectedFx;
          }
          if (cameraRef.current.data.width !== canvas.width || cameraRef.current.data.height !== canvas.height) {
            cameraRef.current.data.setSize(canvas.width, canvas.height);
            cameraRef.current.data.fx = expectedFx;
            cameraRef.current.data.fy = expectedFx;
          }
        }

        // First 5 frames: nudge controls to ensure dampening converges
        if (frameCount < 5) {
          syntheticNudge();
        }
        frameCount++;

        controlsRef.current.update();
        rendererRef.current.render(sceneRef.current, cameraRef.current);
        animationRef.current = requestAnimationFrame(animate);
      };

      // Load the PLY file
      SPLAT.PLYLoader.LoadAsync(url, scene, (progress) => {
        console.log('[SplatPreview3D] Loading progress:', (progress * 100).toFixed(0) + '%');
      }).then(() => {
        if (disposed) return;
        console.log('[SplatPreview3D] PLY loaded successfully, starting animation');
        setIsLoading(false);
        animate();
      }).catch((err) => {
        if (disposed) return;
        console.error('[SplatPreview3D] Failed to load PLY:', err);
        setError('Failed to load 3D preview');
        setIsLoading(false);
      });

    } catch (err) {
      console.error('[SplatPreview3D] Initialization error:', err);
      setError('Failed to initialize 3D viewer');
      setIsLoading(false);
    }

    // Cleanup on unmount
    return () => {
      disposed = true;
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      if (controlsRef.current) {
        controlsRef.current.dispose();
        controlsRef.current = null;
      }
      if (rendererRef.current) {
        rendererRef.current.dispose();
        rendererRef.current = null;
      }
      if (blobUrlRef.current) {
        revokeBlobUrl(blobUrlRef.current);
        blobUrlRef.current = null;
      }
      sceneRef.current = null;
      cameraRef.current = null;
    };
  }, [blob, defaultViewFov, metadata]);

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      if (!canvasRef.current || !cameraRef.current || !rendererRef.current) return;
      const canvas = canvasRef.current;
      cameraRef.current.data.setSize(canvas.clientWidth, canvas.clientHeight);
      const resizeFovRad = (defaultViewFov * Math.PI) / 180;
      const resizeFocalPx = (canvas.clientWidth / 2) / Math.tan(resizeFovRad / 2);
      cameraRef.current.data.fx = resizeFocalPx;
      cameraRef.current.data.fy = resizeFocalPx;
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black/50 border border-indigo-500/20">
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ touchAction: 'none' }}
      />
      
      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-400 mx-auto mb-2" />
            <p className="text-sm text-gray-400">Loading 3D preview...</p>
          </div>
        </div>
      )}

      {/* Error overlay */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60">
          <div className="text-center">
            <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
            <p className="text-sm text-red-400">{error}</p>
          </div>
        </div>
      )}

      {/* Controls hint */}
      {!isLoading && !error && (
        <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
          <p className="text-xs text-gray-500 bg-black/50 px-2 py-1 rounded">
            Drag to rotate • Scroll to zoom
          </p>
          {onFullscreen && (
            <button
              onClick={onFullscreen}
              className="p-1.5 bg-black/50 hover:bg-black/70 rounded transition-colors"
              title="Open in full viewer"
            >
              <Maximize2 className="w-4 h-4 text-gray-400" />
            </button>
          )}
        </div>
      )}
    </div>
  );
};

// Placeholder animation when no result yet
const GaussianPreviewPlaceholder: React.FC<{ isGenerating: boolean; progress: number }> = ({ isGenerating, progress }) => {
  return (
    <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-slate-900/50 border border-slate-700/50 flex items-center justify-center">
      {isGenerating ? (
        <div className="text-center">
          <div className="relative w-24 h-24 mx-auto mb-4">
            {/* Animated rings */}
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="absolute inset-0 rounded-full border-2 border-indigo-500/30"
                animate={{
                  scale: [1, 1.5, 1],
                  opacity: [0.5, 0, 0.5],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  delay: i * 0.3,
                }}
              />
            ))}
            <motion.div
              className="absolute inset-4 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600"
              animate={{ rotate: 360 }}
              transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
            >
              <div className="w-full h-full rounded-full border-4 border-transparent border-t-white/30" />
            </motion.div>
          </div>
          <p className="text-lg font-semibold text-white">{Math.round(progress)}%</p>
          <p className="text-sm text-gray-400 mt-1">Generating 3D model...</p>
        </div>
      ) : (
        <div className="text-center p-6">
          <Box className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500">Upload an image to generate 3D preview</p>
        </div>
      )}
    </div>
  );
};

const SharpPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [gpuInfo, setGpuInfo] = useState<GPUInfo | null>(null);
  
  // Settings
  const [mode, setMode] = useState<GenerationMode>('demo');
  const [focalLengthMode, setFocalLengthMode] = useState<'auto' | 'mm' | 'fov'>('auto');
  const [focalLengthMm, setFocalLengthMm] = useState(30);
  const [horizontalFov, setHorizontalFov] = useState(60);
  const [quality, setQuality] = useState<'low' | 'medium' | 'high' | 'ultra' | 'extreme2m' | 'extreme3m'>('high');
  
  // Enhanced Mode settings
  const [enhancedMode, setEnhancedMode] = useState(false);
  const [normalHdDepth, setNormalHdDepth] = useState(false);
  const [enhancedHdDepth, setEnhancedHdDepth] = useState(true);
  const hdDepth = enhancedMode ? enhancedHdDepth : normalHdDepth;
  
  // Quality presets: gridSize determines splat count (gridSize²)
  const qualityPresets = {
    low: { gridSize: 256, label: 'Low (65K)', description: 'Faster generation, lower detail', experimental: false },
    medium: { gridSize: 512, label: 'Medium (262K)', description: 'Balanced quality and speed', experimental: false },
    high: { gridSize: 768, label: 'High (590K)', description: 'Best quality for most images', experimental: false },
    ultra: { gridSize: 1024, label: 'Ultra (1M)', description: 'Maximum detail, slower', experimental: false },
    extreme2m: { gridSize: 1414, label: '2M Splats', description: '~2M gaussians from 2K images. High memory usage (~120MB). Experimental.', experimental: true },
    extreme3m: { gridSize: 1732, label: '3M Splats', description: '~3M gaussians from 2K+ images. Very high memory (~180MB). Experimental.', experimental: true },
  };

  // Initialize and SEO
  useEffect(() => {
    // Set page title and meta for SEO
    document.title = 'SHARP 3D Generator - Convert Image to 3D Gaussian Splats | Anemoia';
    
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute('content', 'Free browser-based tool to convert any image into 3D Gaussian Splats. Uses AI depth estimation for photorealistic 3D scene reconstruction. No upload to server required.');
    }
    
    // Check for loadId param (coming back from viewer)
    const loadId = searchParams.get('loadId');
    if (loadId) {
      // Could restore the result from IndexedDB
    }

    // Detect GPU capabilities
    detectGPU().then(info => {
      setGpuInfo(info);
      if (info.tier === 0 || !info.webGLSupported) {
        console.warn('[SharpPage] Low-end device detected');
      }
    });

    // Check service health
    sharpService.checkHealth().then(health => {
      console.log('[SharpPage] Service health:', health);
    });

    // Preload the neural depth model for faster generation
    // This runs in a web worker and won't block the UI
    console.log('[SharpPage] Preloading Depth Anything V2 neural network...');
    sharpService.preloadModel().then(() => {
      console.log('[SharpPage] Neural depth model preloaded');
    }).catch(err => {
      console.warn('[SharpPage] Model preload failed (will load on demand):', err);
    });

    // Cleanup old files
    sharpFileStore.cleanup(24 * 60 * 60 * 1000);

    // Cleanup worker on unmount
    return () => {
      // Note: Don't terminate worker here as it's shared across the session
      // sharpService.terminateWorker();
    };
  }, [searchParams]);

  // File handling
  const handleFileSelect = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    setSelectedFile(file);
    setError(null);
    setResult(null);

    // Create preview
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(file));
  }, [previewUrl]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  // Generation — routes to standard or enhanced pipeline based on toggle
  const handleGenerate = useCallback(async () => {
    if (!selectedFile) return;

    setIsGenerating(true);
    setProgress(0);
    setProgressMessage('Starting...');
    setError(null);
    setResult(null);

    try {
      let genResult: GenerationResult;

      if (enhancedMode) {
        // ─── Enhanced Pipeline (same splat count, better quality) ─────
        const enhancedResult = await sharpEnhancedService.generate(selectedFile, {
          focalLengthMm: focalLengthMode === 'mm' ? focalLengthMm : undefined,
          horizontalFovDeg: focalLengthMode === 'fov' ? horizontalFov : undefined,
          gridSize: qualityPresets[quality].gridSize, // Same grid as standard
          depthScale: 2.5,
          useBaseModel: hdDepth,
          onProgress: (prog, msg) => {
            setProgress(prog);
            setProgressMessage(msg);
          },
        });

        genResult = {
          success: enhancedResult.success,
          fileId: enhancedResult.fileId,
          filename: enhancedResult.filename,
          blob: enhancedResult.blob,
          metadata: enhancedResult.metadata,
          error: enhancedResult.error,
        };
      } else {
        // ─── Standard Pipeline (unchanged) ─────────────────────────────
        genResult = await sharpService.generate(selectedFile, {
          mode,
          focalLengthMm: focalLengthMode === 'mm' ? focalLengthMm : undefined,
          horizontalFovDeg: focalLengthMode === 'fov' ? horizontalFov : undefined,
          gridSize: qualityPresets[quality].gridSize,
          useBaseModel: hdDepth,
          onProgress: (prog, msg) => {
            setProgress(prog);
            setProgressMessage(msg);
          },
        });
      }

      if (genResult.success) {
        setResult(genResult);
      } else {
        setError(genResult.error || 'Generation failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsGenerating(false);
    }
  }, [selectedFile, mode, focalLengthMode, focalLengthMm, horizontalFov, quality, qualityPresets, enhancedMode, hdDepth]);

  // Download
  const handleDownload = useCallback(() => {
    if (!result?.blob || !result.filename) return;
    
    const url = createBlobUrl(result.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = result.filename;
    a.click();
    URL.revokeObjectURL(url);
  }, [result]);

  // Open in viewer
  const handleOpenInViewer = useCallback(() => {
    if (!result?.fileId) return;
    navigate(`/splat-viewer?loadId=${result.fileId}`);
  }, [navigate, result]);

  // Reset
  const handleReset = useCallback(() => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(null);
    setPreviewUrl(null);
    setResult(null);
    setError(null);
    setProgress(0);
    setProgressMessage('');
  }, [previewUrl]);

  // Format bytes
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  return (
    <div className="relative min-h-screen flex flex-col text-white overflow-hidden">
      <SharpBackground />
      
      <div className="relative z-10 flex flex-col min-h-screen">
        <Header />
        <NavigationBreadcrumb />
        
        <main className="flex-1 px-4 md:px-8 py-8">
          <div className="max-w-6xl mx-auto">
            {/* Hero Header */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center mb-10"
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 mb-4">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                <span className="text-sm font-medium text-indigo-300">AI-Powered 3D Generation</span>
              </div>
              
              <h1 className="text-4xl md:text-6xl font-bold mb-4">
                <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                  SHARP
                </span>
                <span className="text-white/80"> 3D</span>
              </h1>
              
              <p className="text-lg text-gray-400 max-w-2xl mx-auto">
                Transform any image into a 3D Gaussian Splat scene. 
                Powered by Apple's SHARP neural network for instant 3D reconstruction.
              </p>
            </motion.div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left: Upload & Preview */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
              >
                <CardGlass className="p-6 bg-gradient-to-br from-slate-900/90 to-slate-800/90 border border-indigo-500/10">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                      <Image className="w-5 h-5 text-indigo-400" />
                      Input Image
                    </h2>
                    {selectedFile && (
                      <button
                        onClick={handleReset}
                        className="text-sm text-gray-400 hover:text-white transition-colors flex items-center gap-1"
                      >
                        <RefreshCw className="w-4 h-4" />
                        Reset
                      </button>
                    )}
                  </div>

                  {/* Dropzone */}
                  <div
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onClick={() => !selectedFile && fileInputRef.current?.click()}
                    className={`relative aspect-video rounded-xl border-2 border-dashed transition-all cursor-pointer overflow-hidden ${
                      isDragging
                        ? 'border-indigo-400 bg-indigo-500/10'
                        : selectedFile
                        ? 'border-transparent'
                        : 'border-gray-600 hover:border-indigo-500/50 hover:bg-slate-800/50'
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                      className="hidden"
                    />

                    {selectedFile && previewUrl ? (
                      <div className="relative w-full h-full">
                        <img
                          src={previewUrl}
                          alt="Selected"
                          className="w-full h-full object-contain bg-black/50"
                        />
                        <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
                          <p className="text-sm font-medium truncate">{selectedFile.name}</p>
                          <p className="text-xs text-gray-400">{formatBytes(selectedFile.size)}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                        <motion.div
                          animate={{ y: isDragging ? -5 : [0, -5, 0] }}
                          transition={{ duration: isDragging ? 0.2 : 2, repeat: isDragging ? 0 : Infinity }}
                        >
                          <Upload className={`w-12 h-12 ${isDragging ? 'text-indigo-400' : 'text-gray-500'}`} />
                        </motion.div>
                        <div className="text-center">
                          <p className="text-gray-300 font-medium">
                            {isDragging ? 'Drop to upload' : 'Drop image or click to browse'}
                          </p>
                          <p className="text-sm text-gray-500 mt-1">JPG, PNG, WebP, HEIC supported</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Settings Panel */}
                  <div className="mt-4">
                    <button
                      onClick={() => setShowSettings(!showSettings)}
                      className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
                    >
                      <Settings2 className="w-4 h-4" />
                      Advanced Settings
                      <ChevronDown className={`w-4 h-4 transition-transform ${showSettings ? 'rotate-180' : ''}`} />
                    </button>

                    <AnimatePresence>
                      {showSettings && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="pt-4 space-y-4">
                            {/* Enhanced Quality Card */}
                            <div className={`rounded-2xl border overflow-hidden transition-all duration-300 ${
                              enhancedMode
                                ? 'border-indigo-400/40 bg-gradient-to-br from-indigo-950/70 via-slate-900/95 to-fuchsia-950/50 shadow-lg shadow-indigo-900/20'
                                : 'border-slate-700/50 bg-gradient-to-br from-slate-900/80 to-slate-800/70'
                            }`}>
                              <button
                                onClick={() => setEnhancedMode(!enhancedMode)}
                                className="w-full p-4 text-left"
                              >
                                <div className="flex items-start justify-between gap-4">
                                  <div className="flex gap-3">
                                    <div className={`mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl transition-all ${
                                      enhancedMode
                                        ? 'bg-gradient-to-br from-indigo-500/25 to-fuchsia-500/25 text-indigo-200 ring-1 ring-indigo-400/30'
                                        : 'bg-slate-800 text-slate-500'
                                    }`}>
                                      <Wand2 className="w-5 h-5" />
                                    </div>
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <span className={`text-sm font-semibold ${enhancedMode ? 'text-white' : 'text-gray-300'}`}>
                                          Enhanced Quality
                                        </span>
                                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                                          enhancedMode
                                            ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-400/20'
                                            : 'bg-slate-800 text-slate-500 border border-slate-700'
                                        }`}>
                                          {enhancedMode ? 'Active' : 'Optional'}
                                        </span>
                                      </div>
                                      <p className={`mt-1 text-xs leading-relaxed ${enhancedMode ? 'text-indigo-100/80' : 'text-gray-500'}`}>
                                        Enhanced adds viewer-aware calibration and alternate camera logic. The HD depth switch below can also be used with normal mode.
                                      </p>
                                    </div>
                                  </div>
                                  <div className={`relative mt-1 h-6 w-12 rounded-full transition-all duration-300 ${
                                    enhancedMode ? 'bg-gradient-to-r from-indigo-500 to-fuchsia-500' : 'bg-slate-700'
                                  }`}>
                                    <div className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-lg transition-all duration-300 ${
                                      enhancedMode ? 'left-[26px]' : 'left-[2px]'
                                    }`} />
                                  </div>
                                </div>
                              </button>

                              <div className="px-4 pb-4">
                                <div className="flex flex-wrap gap-2">
                                  {[
                                    'Original-lens aware',
                                    'Edge-aware depth',
                                    'Gamma-preserved color',
                                    'Viewer calibration',
                                  ].map((tag) => (
                                    <span
                                      key={tag}
                                      className={`rounded-full px-2.5 py-1 text-[10px] font-medium ${
                                        enhancedMode
                                          ? 'bg-white/5 text-indigo-100/80 border border-white/10'
                                          : 'bg-slate-800 text-slate-500 border border-slate-700'
                                      }`}
                                    >
                                      {tag}
                                    </span>
                                  ))}
                                </div>

                                <div className={`mt-4 rounded-xl border p-3 transition-all ${
                                  hdDepth
                                    ? 'border-amber-400/20 bg-amber-500/8'
                                    : 'border-slate-700/60 bg-slate-900/40'
                                }`}>
                                  <div className="flex items-center justify-between gap-3">
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${
                                          hdDepth ? 'bg-amber-400/15 text-amber-300' : 'bg-slate-800 text-slate-400'
                                        }`}>HD</span>
                                        <span className={`text-xs font-semibold ${hdDepth ? 'text-amber-100' : 'text-gray-300'}`}>
                                          Depth Anything V2 Base
                                        </span>
                                      </div>
                                      <p className={`mt-1 text-xs ${hdDepth ? 'text-amber-200/70' : 'text-gray-500'}`}>
                                        Works for both normal and enhanced generation. Better edges and placement, slower first run.
                                      </p>
                                    </div>
                                    <button
                                      onClick={() => enhancedMode ? setEnhancedHdDepth(!enhancedHdDepth) : setNormalHdDepth(!normalHdDepth)}
                                      className={`relative flex-shrink-0 h-6 w-11 rounded-full transition-all duration-200 ${
                                        hdDepth ? 'bg-amber-500' : 'bg-slate-700'
                                      }`}
                                    >
                                      <div
                                        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all duration-200 ${
                                          hdDepth ? 'left-[22px]' : 'left-[2px]'
                                        }`}
                                      />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            {/* Quality Setting */}
                            <div>
                              <label className="text-sm text-gray-400 block mb-2">Output Quality</label>
                              <div className="grid grid-cols-2 gap-2">
                                {(Object.keys(qualityPresets) as Array<keyof typeof qualityPresets>)
                                  .filter((q) => !qualityPresets[q].experimental)
                                  .map((q) => (
                                  <button
                                    key={q}
                                    onClick={() => setQuality(q)}
                                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all text-left ${
                                      quality === q
                                        ? 'bg-indigo-600 text-white ring-2 ring-indigo-400'
                                        : 'bg-slate-700 text-gray-400 hover:bg-slate-600'
                                    }`}
                                  >
                                    <div className="font-semibold">{qualityPresets[q].label}</div>
                                  </button>
                                ))}
                              </div>

                              {/* Experimental Presets */}
                              <div className="mt-3">
                                <div className="flex items-center gap-1.5 mb-2">
                                  <FlaskConical className="w-3.5 h-3.5 text-amber-400" />
                                  <span className="text-xs font-medium text-amber-400 uppercase tracking-wider">Experimental</span>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                  {(Object.keys(qualityPresets) as Array<keyof typeof qualityPresets>)
                                    .filter((q) => qualityPresets[q].experimental)
                                    .map((q) => (
                                    <button
                                      key={q}
                                      onClick={() => setQuality(q)}
                                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-all text-left relative overflow-hidden ${
                                        quality === q
                                          ? 'bg-gradient-to-br from-amber-600 to-orange-600 text-white ring-2 ring-amber-400'
                                          : 'bg-slate-700/80 text-gray-400 hover:bg-slate-600 border border-amber-500/20'
                                      }`}
                                    >
                                      <div className="font-semibold flex items-center gap-1.5">
                                        {qualityPresets[q].label}
                                        <FlaskConical className="w-3 h-3 text-amber-300 opacity-70" />
                                      </div>
                                    </button>
                                  ))}
                                </div>
                              </div>

                              <p className="text-xs text-gray-500 mt-2">{qualityPresets[quality].description}</p>

                              {/* Memory warning for experimental presets */}
                              {qualityPresets[quality].experimental && (
                                <motion.div
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: 'auto' }}
                                  className="mt-2 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20"
                                >
                                  <div className="flex items-start gap-2">
                                    <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                                    <div className="text-xs text-amber-300/80">
                                      <strong className="text-amber-300">High Memory Mode:</strong> This option generates {
                                        quality === 'extreme2m' ? '~2 million' : '~3 million'
                                      } gaussians and uses significantly more RAM. Best suited for devices with 8GB+ memory and a dedicated GPU. Processing may take 30-60+ seconds.
                                    </div>
                                  </div>
                                </motion.div>
                              )}
                            </div>

                            {/* Focal Length */}
                            <div>
                              <label className="text-sm text-gray-400 block mb-2">Focal Length</label>
                              <div className="flex gap-2 mb-2">
                                {(['auto', 'mm', 'fov'] as const).map((fl) => (
                                  <button
                                    key={fl}
                                    onClick={() => setFocalLengthMode(fl)}
                                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                                      focalLengthMode === fl
                                        ? 'bg-indigo-600 text-white'
                                        : 'bg-slate-700 text-gray-400 hover:bg-slate-600'
                                    }`}
                                  >
                                    {fl === 'auto' ? 'Auto (EXIF)' : fl === 'mm' ? 'mm (35mm)' : 'FOV°'}
                                  </button>
                                ))}
                              </div>

                              {focalLengthMode === 'mm' && (
                                <div className="flex items-center gap-3">
                                  <input
                                    type="range"
                                    min="12"
                                    max="200"
                                    value={focalLengthMm}
                                    onChange={(e) => setFocalLengthMm(parseInt(e.target.value))}
                                    className="flex-1 accent-indigo-500"
                                  />
                                  <span className="text-sm font-mono w-16 text-right">{focalLengthMm}mm</span>
                                </div>
                              )}

                              {focalLengthMode === 'fov' && (
                                <div className="flex items-center gap-3">
                                  <input
                                    type="range"
                                    min="20"
                                    max="120"
                                    value={horizontalFov}
                                    onChange={(e) => setHorizontalFov(parseInt(e.target.value))}
                                    className="flex-1 accent-indigo-500"
                                  />
                                  <span className="text-sm font-mono w-16 text-right">{horizontalFov}°</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Generate Button */}
                  <motion.button
                    onClick={handleGenerate}
                    disabled={!selectedFile || isGenerating}
                    whileHover={{ scale: selectedFile && !isGenerating ? 1.02 : 1 }}
                    whileTap={{ scale: selectedFile && !isGenerating ? 0.98 : 1 }}
                    className={`w-full mt-6 py-4 rounded-xl font-semibold text-lg flex items-center justify-center gap-3 transition-all ${
                      !selectedFile || isGenerating
                        ? 'bg-slate-700 text-gray-500 cursor-not-allowed'
                        : 'bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:via-purple-500 hover:to-pink-500 text-white shadow-lg shadow-indigo-500/25'
                    }`}
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Generating... {Math.round(progress)}%
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5" />
                        Generate 3D Gaussian Splats
                      </>
                    )}
                  </motion.button>
                </CardGlass>
              </motion.div>

              {/* Right: Preview & Results */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
              >
                <CardGlass className="p-6 bg-gradient-to-br from-slate-900/90 to-slate-800/90 border border-indigo-500/10 h-full">
                  <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
                    <Box className="w-5 h-5 text-indigo-400" />
                    3D Preview
                  </h2>

                  {/* Show actual 3D viewer when result is available, otherwise show placeholder */}
                  {result?.success && result.blob ? (
                    <SplatPreview3D 
                      blob={result.blob}
                      metadata={result.metadata as any}
                      onFullscreen={handleOpenInViewer}
                    />
                  ) : (
                    <GaussianPreviewPlaceholder isGenerating={isGenerating} progress={progress} />
                  )}

                  {/* Progress Message */}
                  {isGenerating && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="mt-4 p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/20"
                    >
                      <p className="text-sm text-indigo-300">{progressMessage}</p>
                      <div className="mt-2 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-gradient-to-r from-indigo-500 to-purple-500"
                          initial={{ width: 0 }}
                          animate={{ width: `${progress}%` }}
                          transition={{ duration: 0.3 }}
                        />
                      </div>
                    </motion.div>
                  )}

                  {/* Error Display */}
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-4 p-4 rounded-lg bg-red-500/10 border border-red-500/20"
                    >
                      <div className="flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium text-red-400">Generation Failed</p>
                          <p className="text-sm text-red-300/80 mt-1">{error}</p>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Success Result */}
                  {result?.success && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-4 space-y-4"
                    >
                      {/* Success Banner */}
                      <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                        <div className="flex items-center gap-3">
                          <CheckCircle2 className="w-5 h-5 text-green-400" />
                          <p className="font-medium text-green-400">Generation Complete!</p>
                        </div>
                      </div>

                      {/* Metadata */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 rounded-lg bg-slate-800/50">
                          <p className="text-xs text-gray-500 uppercase tracking-wider">Gaussians</p>
                          <p className="text-lg font-semibold text-white">
                            {result.metadata?.gaussianCount?.toLocaleString() || 'N/A'}
                          </p>
                        </div>
                        <div className="p-3 rounded-lg bg-slate-800/50">
                          <p className="text-xs text-gray-500 uppercase tracking-wider">File Size</p>
                          <p className="text-lg font-semibold text-white">
                            {result.metadata?.fileSize ? formatBytes(result.metadata.fileSize) : result.blob ? formatBytes(result.blob.size) : 'N/A'}
                          </p>
                        </div>
                        <div className="p-3 rounded-lg bg-slate-800/50">
                          <p className="text-xs text-gray-500 uppercase tracking-wider">Processing Time</p>
                          <p className="text-lg font-semibold text-white">
                            {result.metadata?.processingTimeMs ? `${(result.metadata.processingTimeMs / 1000).toFixed(1)}s` : 'N/A'}
                          </p>
                        </div>
                        <div className="p-3 rounded-lg bg-slate-800/50">
                          <p className="text-xs text-gray-500 uppercase tracking-wider">Focal Length</p>
                          <p className="text-lg font-semibold text-white">
                            {result.metadata?.focalLength ? `${Math.round(result.metadata.focalLength)}px` : 'Auto'}
                          </p>
                        </div>
                      </div>
                      
                      {/* Enhanced Quality indicator */}
                      {enhancedMode && (
                        <div className="p-2.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center gap-2">
                          <Wand2 className="w-3.5 h-3.5 text-indigo-400" />
                          <span className="text-xs text-indigo-300">
                            Enhanced Quality · perspective-correct 3D · gamma-accurate colors
                          </span>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex gap-3">
                        <motion.button
                          onClick={handleOpenInViewer}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          className="flex-1 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20"
                        >
                          <Eye className="w-5 h-5" />
                          Open in 3D Viewer
                        </motion.button>
                        <motion.button
                          onClick={handleDownload}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          className="py-3 px-5 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-semibold flex items-center gap-2"
                        >
                          <Download className="w-5 h-5" />
                        </motion.button>
                      </div>
                    </motion.div>
                  )}

                  {/* Info Panel when idle */}
                  {!isGenerating && !result && !error && (
                    <div className="mt-4 p-4 rounded-lg bg-slate-800/30 border border-slate-700/50">
                      <div className="flex items-start gap-3">
                        <Info className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-gray-400 space-y-2">
                          <p>
                            <strong className="text-white">SHARP</strong> transforms single images into 3D Gaussian Splats 
                            that can be viewed from multiple angles.
                          </p>
                          <p>
                            Upload an image and click generate to create your 3D scene. The output 
                            can be downloaded as a <code className="text-indigo-400">.ply</code> file 
                            or viewed directly in our 3D viewer.
                          </p>
                          <a 
                            href="https://apple.github.io/ml-sharp/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-indigo-400 hover:text-indigo-300"
                          >
                            Learn more about SHARP
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      </div>
                    </div>
                  )}
                </CardGlass>
              </motion.div>
            </div>

            {/* Feature Cards */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8"
            >
              {[
                {
                  icon: <Zap className="w-6 h-6" />,
                  title: 'Neural 3D Reconstruction',
                  description: 'State-of-the-art AI model for single-image to 3D conversion',
                  color: 'from-yellow-500 to-orange-500'
                },
                {
                  icon: <Camera className="w-6 h-6" />,
                  title: 'Metric Scale',
                  description: 'Produces absolute-scale 3D scenes using camera focal length',
                  color: 'from-blue-500 to-cyan-500'
                },
                {
                  icon: <Eye className="w-6 h-6" />,
                  title: 'Instant Preview',
                  description: 'View generated Gaussian Splats in real-time WebGL viewer',
                  color: 'from-purple-500 to-pink-500'
                }
              ].map((feature, i) => (
                <CardGlass
                  key={i}
                  className="p-5 bg-gradient-to-br from-slate-900/80 to-slate-800/80 border border-indigo-500/10 hover:border-indigo-500/20 transition-all"
                >
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center text-white mb-3`}>
                    {feature.icon}
                  </div>
                  <h3 className="font-semibold text-white mb-1">{feature.title}</h3>
                  <p className="text-sm text-gray-400">{feature.description}</p>
                </CardGlass>
              ))}
            </motion.div>

            {/* GPU Info Banner */}
            {gpuInfo && gpuInfo.tier < 2 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="mt-6 p-4 rounded-lg bg-amber-500/10 border border-amber-500/20"
              >
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-400" />
                  <p className="text-sm text-amber-300">
                    <strong>Low-end GPU detected.</strong> Large 3D scenes may render slowly. 
                    Consider using a device with a dedicated GPU for best performance.
                  </p>
                </div>
              </motion.div>
            )}
          </div>
        </main>

        <Footer />
      </div>
    </div>
  );
};

export default SharpPage;




