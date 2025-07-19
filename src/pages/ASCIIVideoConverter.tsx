import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Upload, Play, Pause, Download, Settings, Zap, Terminal, 
  Sparkles, Code, Monitor, Cpu, Palette, Sliders, RefreshCw, 
  FileVideo, X, Image as ImageIcon, Film, Camera, Layers,
  Contrast, Aperture, Grid3x3, Activity, FileImage
} from 'lucide-react';
import GIF from 'gif.js';

interface ProcessingConfig {
  asciiChars: string;
  colorMode: 'mono' | 'matrix' | 'cyberpunk' | 'retro' | 'neon' | 'vaporwave';
  brightness: number;
  contrast: number;
  scale: number;
  fontSize: number;
  charDensity: number;
  frameRate: 5 | 10 | 15;
  quality: 'low' | 'medium' | 'high' | 'ultra';
  outputMode: 'normal' | 'colored' | 'negative' | 'edge';
  edgeThreshold: number;
}

interface ProcessingMetrics {
  fps: number;
  processedFrames: number;
  totalFrames: number;
  estimatedTime: number;
  progress: number;
}

// ASCII Character Presets
const ASCII_PRESETS = {
  classic: {
    name: 'Classic',
    chars: ' .:-=+*#%@',
    description: 'Traditional ASCII gradient'
  },
  minimal: {
    name: 'Minimal',
    chars: ' .·:;',
    description: 'Simple and clean'
  },
  blocks: {
    name: 'Blocks',
    chars: ' ░▒▓█',
    description: 'Block characters'
  },
  detailed: {
    name: 'Detailed',
    chars: ' .\'^:;~-_+<>i!lI?/\\|()1{}[]rcvunxzjftLCJUYXZO0Qoahkbdpqwm*WMB8&%$#@',
    description: 'Maximum detail'
  },
  matrix: {
    name: 'Matrix',
    chars: ' 01ﾊﾐﾋｰｳｼﾅﾓﾆｻﾜﾂｵﾘｱﾎﾃﾏｹﾒｴｶｷﾑﾕﾗｾﾈｽﾀﾇﾍ',
    description: 'Matrix-style with Japanese'
  },
  binary: {
    name: 'Binary',
    chars: ' 01',
    description: 'Binary aesthetic'
  },
  dots: {
    name: 'Dots',
    chars: ' ·•◦○●',
    description: 'Dot patterns'
  },
  custom: {
    name: 'Custom',
    chars: '.:-=+*#%@',
    description: 'Your own character set'
  }
};

// Color themes
const COLOR_THEMES = {
  mono: { 
    name: 'Monochrome',
    primary: '#ffffff', 
    secondary: '#cccccc',
    background: '#000000',
    glow: '#ffffff',
    text: '#888888'
  },
  matrix: { 
    name: 'Matrix',
    primary: '#00ff41', 
    secondary: '#008f11', 
    background: '#000000',
    glow: '#00ff41',
    text: '#00ff41'
  },
  cyberpunk: { 
    name: 'Cyberpunk',
    primary: '#ff00ff', 
    secondary: '#00ffff', 
    background: '#0a0014',
    glow: '#ff00ff',
    text: '#ff88ff'
  },
  retro: { 
    name: 'Retro',
    primary: '#ff6b1a',
    secondary: '#ffd700',
    background: '#1a0f0a',
    glow: '#ff6b1a',
    text: '#ffaa66'
  },
  neon: { 
    name: 'Neon',
    primary: '#00fff0',
    secondary: '#ff0099',
    background: '#0f0f1e',
    glow: '#00fff0',
    text: '#66ffff'
  },
  vaporwave: { 
    name: 'Vaporwave',
    primary: '#ff71ce', 
    secondary: '#b967ff',
    background: '#1a0033',
    glow: '#ff71ce',
    text: '#ffaadd'
  }
};

const ASCIIVideoConverter: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [isImage, setIsImage] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [videoDuration, setVideoDuration] = useState<number>(0);
  const [previewFrame, setPreviewFrame] = useState<string>('');
  const [processedFrames, setProcessedFrames] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState('classic');
  const [selectedTheme, setSelectedTheme] = useState<keyof typeof COLOR_THEMES>('matrix');
  const [exportFormat, setExportFormat] = useState<'video' | 'gif' | 'text'>('video');
  
  const [config, setConfig] = useState<ProcessingConfig>({
    asciiChars: ASCII_PRESETS.classic.chars,
    colorMode: 'matrix',
    brightness: 1.0,
    contrast: 1.0,
    scale: 0.15,
    fontSize: 10,
    charDensity: 1.0,
    frameRate: 10,
    quality: 'medium',
    outputMode: 'normal',
    edgeThreshold: 0.5
  });

  const [metrics, setMetrics] = useState<ProcessingMetrics>({
    fps: 0,
    processedFrames: 0,
    totalFrames: 0,
    estimatedTime: 0,
    progress: 0
  });
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const animationRef = useRef<number>();
  const workerRef = useRef<Worker | null>(null);
  const gifRef = useRef<any>(null);
  
  const theme = COLOR_THEMES[selectedTheme];

  useEffect(() => {
    // Initialize worker
    workerRef.current = new Worker(
      new URL('../workers/asciiProcessor.worker.ts', import.meta.url),
      { type: 'module' }
    );

    workerRef.current.onmessage = (e) => {
      if (e.data.type === 'frameProcessed') {
        const asciiFrame = e.data.data.ascii;
        const colors = e.data.data.colors;
        const { width: asciiWidth, height: asciiHeight } = e.data.data;
        
        // Create colored ASCII if needed
        let finalFrame = asciiFrame;
        if (config.outputMode === 'colored' && colors) {
          finalFrame = createColoredAscii(asciiFrame, colors);
        }
        
        setProcessedFrames(prev => [...prev, finalFrame]);
        setPreviewFrame(finalFrame);
        
        setMetrics(prev => ({
          ...prev,
          processedFrames: prev.processedFrames + 1,
          progress: ((prev.processedFrames + 1) / prev.totalFrames) * 100
        }));
      }
    };

    return () => {
      workerRef.current?.terminate();
    };
  }, [config.outputMode]);

  const createColoredAscii = (ascii: string, colors: Uint8ClampedArray) => {
    // This would be rendered in a canvas or HTML with color spans
    // For now, returning plain ASCII
    return ascii;
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      processFile(droppedFile);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      processFile(selectedFile);
    }
  };

  const processFile = (file: File) => {
    const fileType = file.type;
    const isImageFile = fileType.startsWith('image/');
    const isVideoFile = fileType.startsWith('video/');
    
    if (!isImageFile && !isVideoFile) {
      alert('Please upload a valid image or video file');
      return;
    }
    
    setFile(file);
    setIsImage(isImageFile);
    setProcessedFrames([]);
    setMetrics({
      fps: 0,
      processedFrames: 0,
      totalFrames: isImageFile ? 1 : 0,
      estimatedTime: 0,
      progress: 0
    });
    
    if (isImageFile) {
      // Handle image
      const img = new Image();
      img.onload = () => {
        processImage(img);
      };
      img.src = URL.createObjectURL(file);
    } else {
      // Handle video
    if (videoRef.current) {
      videoRef.current.src = URL.createObjectURL(file);
      videoRef.current.load();
    }
    }
  };

  const processImage = async (img: HTMLImageElement) => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Calculate dimensions maintaining aspect ratio with better scaling
    const maxWidth = 800; // Fixed processing width for consistency
    const maxHeight = 600; // Fixed processing height for consistency
    
    const imageAspectRatio = img.width / img.height;
    let processWidth, processHeight;
    
    if (imageAspectRatio > maxWidth / maxHeight) {
      // Image is wider than target aspect ratio
      processWidth = maxWidth;
      processHeight = maxWidth / imageAspectRatio;
    } else {
      // Image is taller than target aspect ratio
      processHeight = maxHeight;
      processWidth = maxHeight * imageAspectRatio;
    }
    
    // Apply scale factor
    canvas.width = processWidth * config.scale;
    canvas.height = processHeight * config.scale;
    
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    if (workerRef.current) {
      workerRef.current.postMessage({
        type: 'processFrame',
        data: {
          frameData: {
            frameNumber: 0,
            timestamp: 0,
            width: canvas.width,
            height: canvas.height,
            pixels: imageData.data
          },
          config: {
            asciiChars: config.asciiChars,
            colorMode: config.colorMode,
            brightness: config.brightness,
            contrast: config.contrast,
            edgeDetection: config.outputMode === 'edge',
            edgeThreshold: config.edgeThreshold,
            negative: config.outputMode === 'negative',
            fontSize: config.fontSize,
            charDensity: config.charDensity
          }
        }
      });
    }
    
    setVideoLoaded(true);
  };

  const handleVideoLoaded = () => {
    if (!videoRef.current) return;
    
    setVideoLoaded(true);
    setVideoDuration(videoRef.current.duration);
    
    // Extract first frame for preview
    extractFrame(0);
  };

  const extractFrame = async (time: number) => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    video.currentTime = time;
    
    return new Promise<void>((resolve) => {
      video.onseeked = () => {
        // Calculate dimensions maintaining aspect ratio with better scaling
        const maxWidth = 800; // Fixed processing width for consistency
        const maxHeight = 600; // Fixed processing height for consistency
        
        const videoAspectRatio = video.videoWidth / video.videoHeight;
        let processWidth, processHeight;
        
        if (videoAspectRatio > maxWidth / maxHeight) {
          // Video is wider than target aspect ratio
          processWidth = maxWidth;
          processHeight = maxWidth / videoAspectRatio;
        } else {
          // Video is taller than target aspect ratio
          processHeight = maxHeight;
          processWidth = maxHeight * videoAspectRatio;
        }
        
        // Apply scale factor
        canvas.width = processWidth * config.scale;
        canvas.height = processHeight * config.scale;
        
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        
        // Process this frame
        if (workerRef.current) {
          workerRef.current.postMessage({
            type: 'processFrame',
            data: {
              frameData: {
                frameNumber: 0,
                timestamp: time,
                width: canvas.width,
                height: canvas.height,
                pixels: imageData.data
              },
              config: {
                asciiChars: config.asciiChars,
                colorMode: config.colorMode,
                brightness: config.brightness,
                contrast: config.contrast,
                edgeDetection: config.outputMode === 'edge',
                edgeThreshold: config.edgeThreshold,
                negative: config.outputMode === 'negative',
                fontSize: config.fontSize,
                charDensity: config.charDensity
              }
            }
          });
        }
        
        resolve();
      };
    });
  };

  const processVideo = async () => {
    if (!videoRef.current || !canvasRef.current || !videoDuration) return;
    
    setIsProcessing(true);
    setIsPaused(false);
    setProcessedFrames([]);
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const fps = config.frameRate;
    const totalFrames = Math.floor(videoDuration * fps);
    
    // Calculate dimensions maintaining aspect ratio with better scaling
    const maxWidth = 800; // Fixed processing width for consistency
    const maxHeight = 600; // Fixed processing height for consistency
    
    const videoAspectRatio = video.videoWidth / video.videoHeight;
    let processWidth, processHeight;
    
    if (videoAspectRatio > maxWidth / maxHeight) {
      // Video is wider than target aspect ratio
      processWidth = maxWidth;
      processHeight = maxWidth / videoAspectRatio;
    } else {
      // Video is taller than target aspect ratio
      processHeight = maxHeight;
      processWidth = maxHeight * videoAspectRatio;
    }
    
    setMetrics(prev => ({
      ...prev,
      totalFrames,
      estimatedTime: totalFrames / fps
    }));

    canvas.width = processWidth * config.scale;
    canvas.height = processHeight * config.scale;

    const startTime = performance.now();
    
    // Initialize GIF if needed
    if (exportFormat === 'gif') {
      // Calculate proper dimensions for GIF based on ASCII output
      const estimatedCharWidth = 120 * config.charDensity;
      const estimatedCharHeight = Math.floor(estimatedCharWidth / (canvas.width / canvas.height) / 2);
      
      gifRef.current = new GIF({
        workers: 4,
        quality: 10,
        width: estimatedCharWidth * config.fontSize * 0.6,
        height: estimatedCharHeight * config.fontSize,
        workerScript: '/gif.worker.js'
      });
    }
    
    for (let frame = 0; frame < totalFrames; frame++) {
      if (isPaused) {
        await new Promise(resolve => {
          const checkPause = setInterval(() => {
            if (!isPaused) {
              clearInterval(checkPause);
              resolve(undefined);
            }
          }, 100);
        });
      }

      const time = frame / fps;
      video.currentTime = time;
      
      await new Promise<void>((resolve) => {
        video.onseeked = () => {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          
          if (workerRef.current) {
            workerRef.current.postMessage({
              type: 'processFrame',
              data: {
                frameData: {
                  frameNumber: frame,
                  timestamp: time,
                  width: canvas.width,
                  height: canvas.height,
                  pixels: imageData.data
                },
                config: {
                  asciiChars: config.asciiChars,
                  colorMode: config.colorMode,
                  brightness: config.brightness,
                  contrast: config.contrast,
                  edgeDetection: config.outputMode === 'edge',
                  edgeThreshold: config.edgeThreshold,
                  negative: config.outputMode === 'negative',
                  fontSize: config.fontSize,
                  charDensity: config.charDensity
                }
              }
            });
          }
          
          const elapsed = (performance.now() - startTime) / 1000;
          const currentFps = frame / elapsed;
          setMetrics(prev => ({
            ...prev,
            fps: currentFps
          }));
          
          resolve();
        };
      });
    }
    
    setIsProcessing(false);
  };

  const playAnimation = useCallback(() => {
    if (!isPlaying || processedFrames.length === 0) return;
    
    const fps = config.frameRate;
    const frameTime = 1000 / fps;
    let lastTime = performance.now();
    
    const animate = (currentTime: number) => {
      if (!isPlaying) return;
      
      const deltaTime = currentTime - lastTime;
      
      if (deltaTime >= frameTime) {
        setCurrentFrame(prev => {
          const next = (prev + 1) % processedFrames.length;
          if (processedFrames[next]) {
            setPreviewFrame(processedFrames[next]);
          }
          return next;
        });
        lastTime = currentTime;
      }
      
      animationRef.current = requestAnimationFrame(animate);
    };
    
    animationRef.current = requestAnimationFrame(animate);
  }, [isPlaying, processedFrames, config.frameRate]);

  useEffect(() => {
    if (isPlaying && processedFrames.length > 0) {
      playAnimation();
    } else if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
  }, [isPlaying, playAnimation, processedFrames.length]);

  const handleExportVideo = async () => {
    if (processedFrames.length === 0) return;
    
    // Create a canvas for rendering ASCII frames
    const exportCanvas = document.createElement('canvas');
    const ctx = exportCanvas.getContext('2d');
    if (!ctx) return;
    
    // Calculate optimal export dimensions based on ASCII frame
    const sampleFrame = processedFrames[0];
    const lines = sampleFrame.split('\n');
    const maxLineLength = Math.max(...lines.map(line => line.length));
    const lineCount = lines.length;
    
    // Set canvas size based on font size and frame dimensions with proper aspect ratio
    const charWidth = config.fontSize * 0.6; // Approximate character width
    const charHeight = config.fontSize;
    
    exportCanvas.width = maxLineLength * charWidth;
    exportCanvas.height = lineCount * charHeight;
    
    // Configure MediaRecorder
    const stream = exportCanvas.captureStream(config.frameRate);
    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: 'video/webm',
      videoBitsPerSecond: 5000000
    });
    
    const chunks: Blob[] = [];
    mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
    mediaRecorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'ascii-video.webm';
      a.click();
      URL.revokeObjectURL(url);
    };
    
    // Start recording
    mediaRecorder.start();
    
    // Render each frame
    ctx.fillStyle = theme.background;
    ctx.font = `${config.fontSize}px monospace`;
    
    for (let i = 0; i < processedFrames.length; i++) {
      ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
      
      const lines = processedFrames[i].split('\n');
      lines.forEach((line, lineIndex) => {
        ctx.fillStyle = theme.text;
        ctx.fillText(line, 0, (lineIndex + 1) * charHeight);
      });
      
      await new Promise(resolve => setTimeout(resolve, 1000 / config.frameRate));
    }
    
    mediaRecorder.stop();
  };

  const handleExportGIF = () => {
    if (!gifRef.current || processedFrames.length === 0) return;
    
    // Calculate proper dimensions for GIF
    const sampleFrame = processedFrames[0];
    const lines = sampleFrame.split('\n');
    const maxLineLength = Math.max(...lines.map(line => line.length));
    const lineCount = lines.length;
    
    const charWidth = config.fontSize * 0.6;
    const charHeight = config.fontSize;
    
    // Update GIF dimensions
    gifRef.current.setOption('width', maxLineLength * charWidth);
    gifRef.current.setOption('height', lineCount * charHeight);
    
    gifRef.current.on('finished', (blob: Blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'ascii-animation.gif';
      a.click();
      URL.revokeObjectURL(url);
    });
    
    gifRef.current.render();
  };

  const handleExport = () => {
    if (processedFrames.length === 0) return;
    
    switch (exportFormat) {
      case 'video':
        handleExportVideo();
        break;
      case 'gif':
        handleExportGIF();
        break;
      case 'text':
    const text = processedFrames.join('\n\n' + '='.repeat(80) + '\n\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
        a.download = 'ascii-frames.txt';
    a.click();
    URL.revokeObjectURL(url);
        break;
    }
  };

  const handlePresetChange = (presetKey: string) => {
    setSelectedPreset(presetKey);
    if (presetKey !== 'custom') {
      setConfig(prev => ({
        ...prev,
        asciiChars: ASCII_PRESETS[presetKey as keyof typeof ASCII_PRESETS].chars
      }));
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ 
      background: `linear-gradient(135deg, ${theme.background} 0%, ${theme.background}ee 100%)`
    }}>
      {/* Dynamic Animated Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0" style={{
          background: `radial-gradient(circle at 20% 50%, ${theme.glow}22 0%, transparent 50%),
                       radial-gradient(circle at 80% 80%, ${theme.secondary}22 0%, transparent 50%),
                       radial-gradient(circle at 40% 20%, ${theme.primary}11 0%, transparent 50%)`
        }} />
        
        {/* Animated ASCII Characters floating */}
        {[...Array(30)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute font-mono text-2xl opacity-20"
            style={{
              color: theme.primary,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              textShadow: `0 0 20px ${theme.glow}`
            }}
            animate={{
              y: [-20, -window.innerHeight - 20],
              rotate: [0, 360],
              opacity: [0, 0.3, 0]
            }}
            transition={{
              duration: 10 + Math.random() * 20,
              repeat: Infinity,
              delay: Math.random() * 10
            }}
          >
            {ASCII_PRESETS.classic.chars[Math.floor(Math.random() * ASCII_PRESETS.classic.chars.length)]}
          </motion.div>
        ))}
        
        {/* Glitch Effect Lines */}
        {[...Array(5)].map((_, i) => (
          <motion.div
            key={`glitch-${i}`}
            className="absolute w-full h-px"
            style={{
              background: `linear-gradient(90deg, transparent, ${theme.primary}, transparent)`,
              top: `${Math.random() * 100}%`
            }}
            animate={{
              x: [-window.innerWidth, window.innerWidth],
              opacity: [0, 1, 0]
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              delay: Math.random() * 5
            }}
          />
        ))}
      </div>

      {/* Main Content */}
      <div className="relative z-10 container mx-auto px-4 py-8">
        {/* Header */}
        <motion.div 
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="text-center mb-8"
        >
          <h1 className="text-6xl font-bold mb-4 flex items-center justify-center gap-4">
            <Terminal className="w-12 h-12" style={{ color: theme.primary }} />
            <span style={{
              background: `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              ASCII Art Studio
            </span>
          </h1>
          <p className="text-xl opacity-80" style={{ color: theme.text }}>
            Transform videos & images into mesmerizing terminal art
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Controls Panel */}
          <motion.div 
            initial={{ x: -50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="space-y-6"
          >
            {/* File Upload */}
            <div className="bg-black/40 backdrop-blur-lg rounded-xl p-6 border border-white/10">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2" style={{ color: theme.primary }}>
                <Upload className="w-5 h-5" />
                Upload Media
              </h2>
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                onChange={handleFileSelect}
                className="hidden"
              />
              
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => fileInputRef.current?.click()}
                onDrop={handleFileDrop}
                onDragOver={(e) => e.preventDefault()}
                className="w-full h-32 rounded-lg border-2 border-dashed transition-all flex flex-col items-center justify-center gap-2"
                style={{
                  borderColor: theme.primary + '66',
                  background: theme.primary + '11'
                }}
              >
                {isImage ? <ImageIcon className="w-8 h-8" /> : <FileVideo className="w-8 h-8" />}
                <p className="font-semibold">Click or drop {isImage ? 'image' : 'video'} here</p>
                <p className="text-sm opacity-60">Images: JPG, PNG | Videos: MP4, WebM, AVI</p>
              </motion.button>
              
              {file && (
                <div className="mt-4 p-3 rounded-lg bg-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {isImage ? <FileImage className="w-4 h-4" /> : <Film className="w-4 h-4" />}
                    <span className="text-sm">{file.name}</span>
                  </div>
                  <button
                    onClick={() => {
                      setFile(null);
                      setVideoLoaded(false);
                      setProcessedFrames([]);
                      setPreviewFrame('');
                    }}
                    className="text-red-400 hover:text-red-300"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Output Mode Selection */}
            <div className="bg-black/40 backdrop-blur-lg rounded-xl p-6 border border-white/10">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2" style={{ color: theme.primary }}>
                <Layers className="w-5 h-5" />
                Output Mode
              </h2>
              
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: 'normal', name: 'Normal', icon: Grid3x3 },
                  { key: 'colored', name: 'Full Color', icon: Palette },
                  { key: 'negative', name: 'Negative', icon: Contrast },
                  { key: 'edge', name: 'Edge Detection', icon: Aperture }
                ].map((mode) => (
                  <motion.button
                    key={mode.key}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setConfig(prev => ({ ...prev, outputMode: mode.key as any }))}
                    className={`p-3 rounded-lg border transition-all flex items-center gap-2 ${
                      config.outputMode === mode.key ? 'border-opacity-100' : 'border-opacity-30'
                    }`}
                    style={{
                      borderColor: theme.primary,
                      background: config.outputMode === mode.key ? theme.primary + '33' : theme.primary + '11'
                    }}
                  >
                    <mode.icon className="w-4 h-4" />
                    <span className="text-sm font-medium">{mode.name}</span>
                  </motion.button>
                ))}
              </div>
            </div>

            {/* ASCII Presets */}
            <div className="bg-black/40 backdrop-blur-lg rounded-xl p-6 border border-white/10">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2" style={{ color: theme.primary }}>
                <Code className="w-5 h-5" />
                ASCII Presets
              </h2>
              
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(ASCII_PRESETS).map(([key, preset]) => (
                  <motion.button
                    key={key}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handlePresetChange(key)}
                    className={`p-3 rounded-lg border transition-all text-left ${
                      selectedPreset === key ? 'border-opacity-100' : 'border-opacity-30'
                    }`}
                    style={{
                      borderColor: theme.primary,
                      background: selectedPreset === key ? theme.primary + '33' : theme.primary + '11'
                    }}
                  >
                    <div className="font-semibold">{preset.name}</div>
                    <div className="text-xs opacity-60">{preset.description}</div>
                  </motion.button>
                ))}
              </div>
              
              {selectedPreset === 'custom' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mt-4"
                >
                <input
                  type="text"
                  value={config.asciiChars}
                  onChange={(e) => setConfig(prev => ({ ...prev, asciiChars: e.target.value }))}
                  placeholder="Enter custom characters..."
                    className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 focus:border-white/40 outline-none"
                    style={{ color: theme.text }}
                />
                </motion.div>
              )}
            </div>

            {/* Color Theme */}
            <div className="bg-black/40 backdrop-blur-lg rounded-xl p-6 border border-white/10">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2" style={{ color: theme.primary }}>
                <Palette className="w-5 h-5" />
                Color Theme
              </h2>
              
              <div className="grid grid-cols-3 gap-3">
                {Object.entries(COLOR_THEMES).map(([key, colorTheme]) => (
                  <motion.button
                    key={key}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      setSelectedTheme(key as keyof typeof COLOR_THEMES);
                      setConfig(prev => ({ ...prev, colorMode: key as any }));
                    }}
                    className={`p-4 rounded-lg border transition-all ${
                      selectedTheme === key ? 'border-opacity-100' : 'border-opacity-30'
                    }`}
                    style={{
                      borderColor: colorTheme.primary,
                      background: `linear-gradient(135deg, ${colorTheme.primary}22, ${colorTheme.secondary}22)`,
                      boxShadow: selectedTheme === key ? `0 0 20px ${colorTheme.glow}44` : 'none'
                    }}
                  >
                    <div 
                      className="w-full h-8 rounded mb-2" 
                      style={{
                        background: `linear-gradient(135deg, ${colorTheme.primary}, ${colorTheme.secondary})`
                      }}
                    />
                    <div className="text-xs font-semibold">{colorTheme.name}</div>
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Advanced Settings */}
              <motion.button
                onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full"
              >
              <h2 className="text-xl font-bold flex items-center justify-between p-6 bg-black/40 backdrop-blur-lg rounded-xl border border-white/10" style={{ color: theme.primary }}>
                <span className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Advanced Settings
                </span>
                <span className="text-2xl">{showAdvanced ? '▲' : '▼'}</span>
                </h2>
              </motion.button>
              
              <AnimatePresence>
                {showAdvanced && (
                  <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-black/40 backdrop-blur-lg rounded-xl p-6 border border-white/10 space-y-4"
                  >
                  {/* Frame Rate Selection */}
                    <div>
                    <label className="block text-sm font-medium mb-2">Frame Rate (FPS)</label>
                    <div className="flex gap-2">
                      {[5, 10, 15].map((fps) => (
                        <motion.button
                          key={fps}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setConfig(prev => ({ ...prev, frameRate: fps as any }))}
                          className={`px-4 py-2 rounded-lg border transition-all ${
                            config.frameRate === fps ? 'border-opacity-100' : 'border-opacity-30'
                          }`}
                          style={{
                            borderColor: theme.primary,
                            background: config.frameRate === fps ? theme.primary + '33' : theme.primary + '11'
                          }}
                        >
                          {fps} FPS
                        </motion.button>
                      ))}
                    </div>
                  </div>

                  {/* Export Format */}
                  <div>
                    <label className="block text-sm font-medium mb-2">Export Format</label>
                    <div className="flex gap-2">
                      {[
                        { key: 'video', name: 'Video', icon: Film },
                        { key: 'gif', name: 'GIF', icon: ImageIcon },
                        { key: 'text', name: 'Text', icon: FileVideo }
                      ].map((format) => (
                        <motion.button
                          key={format.key}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setExportFormat(format.key as any)}
                          className={`px-4 py-2 rounded-lg border transition-all flex items-center gap-2 ${
                            exportFormat === format.key ? 'border-opacity-100' : 'border-opacity-30'
                          }`}
                          style={{
                            borderColor: theme.primary,
                            background: exportFormat === format.key ? theme.primary + '33' : theme.primary + '11'
                          }}
                        >
                          <format.icon className="w-4 h-4" />
                          {format.name}
                        </motion.button>
                      ))}
                    </div>
                  </div>

                  {/* Quality */}
                  <div>
                    <label className="block text-sm font-medium mb-2">Quality</label>
                      <select
                        value={config.quality}
                      onChange={(e) => setConfig(prev => ({ ...prev, quality: e.target.value as any }))}
                      className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20"
                      style={{ color: theme.text }}
                      >
                        <option value="low">Low (Fast)</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="ultra">Ultra (Slow)</option>
                      </select>
                    </div>

                  {/* Brightness */}
                    <div>
                    <label className="block text-sm font-medium mb-2">
                      Brightness: {config.brightness.toFixed(2)}
                    </label>
                      <input
                        type="range"
                        min="0.5"
                        max="2"
                        step="0.1"
                        value={config.brightness}
                        onChange={(e) => setConfig(prev => ({ ...prev, brightness: parseFloat(e.target.value) }))}
                        className="w-full"
                      style={{ accentColor: theme.primary }}
                      />
                    </div>

                  {/* Contrast */}
                    <div>
                    <label className="block text-sm font-medium mb-2">
                      Contrast: {config.contrast.toFixed(2)}
                    </label>
                      <input
                        type="range"
                        min="0.5"
                        max="2"
                        step="0.1"
                        value={config.contrast}
                        onChange={(e) => setConfig(prev => ({ ...prev, contrast: parseFloat(e.target.value) }))}
                        className="w-full"
                      style={{ accentColor: theme.primary }}
                      />
                    </div>

                  {/* Font Size */}
                    <div>
                    <label className="block text-sm font-medium mb-2">
                      Font Size: {config.fontSize}px
                    </label>
                      <input
                        type="range"
                      min="6"
                      max="20"
                      step="1"
                        value={config.fontSize}
                        onChange={(e) => setConfig(prev => ({ ...prev, fontSize: parseInt(e.target.value) }))}
                        className="w-full"
                      style={{ accentColor: theme.primary }}
                      />
                    </div>

                  {/* Scale */}
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Scale: {(config.scale * 100).toFixed(0)}%
                    </label>
                    <input
                      type="range"
                      min="0.05"
                      max="0.5"
                      step="0.05"
                      value={config.scale}
                      onChange={(e) => setConfig(prev => ({ ...prev, scale: parseFloat(e.target.value) }))}
                      className="w-full"
                      style={{ accentColor: theme.primary }}
                    />
                  </div>

                  {/* Character Density */}
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Character Density: {config.charDensity.toFixed(1)}x
                    </label>
                    <input
                      type="range"
                      min="0.5"
                      max="2.0"
                      step="0.1"
                      value={config.charDensity}
                      onChange={(e) => setConfig(prev => ({ ...prev, charDensity: parseFloat(e.target.value) }))}
                      className="w-full"
                      style={{ accentColor: theme.primary }}
                    />
                  </div>

                  {/* Edge Threshold (for edge detection mode) */}
                  {config.outputMode === 'edge' && (
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Edge Threshold: {config.edgeThreshold.toFixed(2)}
                      </label>
                      <input
                        type="range"
                        min="0.1"
                        max="0.9"
                        step="0.1"
                        value={config.edgeThreshold}
                        onChange={(e) => setConfig(prev => ({ ...prev, edgeThreshold: parseFloat(e.target.value) }))}
                        className="w-full"
                        style={{ accentColor: theme.primary }}
                      />
                    </div>
                  )}
                  </motion.div>
                )}
              </AnimatePresence>
          </motion.div>

          {/* Preview Panel */}
          <motion.div 
            initial={{ x: 50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="bg-black/40 backdrop-blur-lg rounded-xl p-6 border border-white/10"
          >
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2" style={{ color: theme.primary }}>
                <Monitor className="w-5 h-5" />
                Preview
              </h2>
              
            {/* ASCII Preview */}
              <div 
              className="relative rounded-lg overflow-hidden bg-black border border-white/20"
                style={{
                  minHeight: '400px',
                  maxHeight: '70vh',
                  overflow: 'auto',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
            >
              {/* Aspect Ratio Indicator */}
              {previewFrame && (
                <div className="absolute top-2 right-2 bg-black/50 backdrop-blur-sm rounded px-2 py-1 text-xs opacity-70">
                  {processedFrames.length > 0 && (
                    <span style={{ color: theme.primary }}>
                      {processedFrames.length} frames • {config.frameRate} FPS
                    </span>
                  )}
                </div>
              )}
              {previewFrame ? (
                <div className="w-full h-full flex items-center justify-center p-4">
                  <pre
                    className="leading-none text-center"
                    style={{ 
                      fontFamily: 'Consolas, Monaco, monospace',
                      fontSize: `${config.fontSize}px`,
                      color: theme.text,
                      whiteSpace: 'pre',
                      lineHeight: 1,
                      maxWidth: '100%',
                      maxHeight: '100%',
                      overflow: 'auto',
                      textShadow: `0 0 10px ${theme.glow}`
                    }}
                  >
                    {previewFrame}
                  </pre>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full p-8">
                    <div className="text-center">
                    <Activity className="w-16 h-16 mx-auto mb-4 opacity-30" />
                    <p className="opacity-50">Upload media to see the ASCII preview</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Progress Bar */}
              {isProcessing && (
              <div className="mt-4">
                  <div className="flex justify-between text-sm mb-2">
                  <span>Processing... {metrics.processedFrames} / {metrics.totalFrames}</span>
                    <span>{metrics.progress.toFixed(1)}%</span>
                  </div>
                <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full rounded-full"
                      style={{
                      background: `linear-gradient(90deg, ${theme.primary}, ${theme.secondary})`,
                      width: `${metrics.progress}%`
                      }}
                      initial={{ width: 0 }}
                      animate={{ width: `${metrics.progress}%` }}
                    />
                  </div>
                </div>
              )}

            {/* Action Buttons */}
            <div className="mt-6 flex gap-4">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                  if (isImage) {
                    processFile(file!);
                  } else {
                      processVideo();
                    }
                  }}
                disabled={!videoLoaded || isProcessing}
                className="flex-1 px-6 py-3 rounded-lg font-bold flex items-center justify-center gap-2 border transition-all disabled:opacity-50"
                  style={{
                  borderColor: theme.primary,
                  color: theme.primary,
                  background: theme.primary + '22'
                  }}
                >
                <Sparkles className="w-5 h-5" />
                {isImage ? 'Process Image' : 'Process Video'}
                </motion.button>

              {processedFrames.length > 1 && (
                  <>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setIsPlaying(!isPlaying)}
                      className="px-6 py-3 rounded-lg font-bold flex items-center gap-2 border transition-all"
                      style={{
                        borderColor: theme.primary,
                        color: theme.primary,
                        background: theme.primary + '22'
                      }}
                    >
                      {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                      {isPlaying ? 'Stop' : 'Play'}
                    </motion.button>

                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleExport}
                      className="px-6 py-3 rounded-lg font-bold flex items-center gap-2 border transition-all"
                      style={{
                        borderColor: theme.primary,
                        color: theme.primary,
                        background: theme.primary + '22'
                      }}
                    >
                      <Download className="w-5 h-5" />
                      Export
                    </motion.button>
                  </>
                )}
            </div>

            {/* Stats */}
            {metrics.processedFrames > 0 && (
              <div className="grid grid-cols-4 gap-4 mt-6">
                {[
                  { icon: Cpu, label: 'FPS', value: metrics.fps.toFixed(2) },
                  { icon: FileVideo, label: 'Frames', value: metrics.processedFrames },
                  { icon: Zap, label: 'Progress', value: `${metrics.progress.toFixed(1)}%` },
                  { icon: RefreshCw, label: 'Quality', value: config.quality }
                ].map((stat, i) => (
                  <motion.div
                    key={i}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: i * 0.1 }}
                    className="bg-black/40 backdrop-blur-lg rounded-lg p-4 border border-white/10"
                  >
                    <stat.icon className="w-5 h-5 mb-2" style={{ color: theme.primary }} />
                    <div className="text-2xl font-bold" style={{ color: theme.primary }}>
                      {stat.value}
                    </div>
                    <div className="text-xs opacity-50">{stat.label}</div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </div>

      {/* Hidden elements */}
      <video 
        ref={videoRef} 
        className="hidden" 
        onLoadedMetadata={handleVideoLoaded}
      />
      <canvas ref={canvasRef} className="hidden" />
      <canvas ref={previewCanvasRef} className="hidden" />
    </div>
  );
};

export default ASCIIVideoConverter; 