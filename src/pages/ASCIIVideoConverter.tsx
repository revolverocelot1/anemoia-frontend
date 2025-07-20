import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Upload, Play, Pause, Download, Settings, Zap, Terminal, 
  Sparkles, Code, Monitor, Cpu, Palette, Sliders, RefreshCw, 
  FileVideo, X, Image as ImageIcon, Film, Camera, Layers,
  Contrast, Aperture, Grid3x3, Activity, FileImage, ArrowLeft
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
  frameRate: 5 | 10 | 15 | 20 | 24 | 30;
  quality: 'low' | 'medium' | 'high' | 'ultra';
  outputMode: 'normal' | 'colored' | 'negative' | 'edge';
  edgeThreshold: number;
  workerCount: number;
  batchSize: number;
}

interface ProcessingMetrics {
  fps: number;
  processedFrames: number;
  totalFrames: number;
  estimatedTime: number;
  progress: number;
  cpuUsage: number;
  memoryUsage: number;
}

interface FrameData {
  frameNumber: number;
  ascii: string;
  colors: Uint8ClampedArray | null;
  width: number;
  height: number;
  timestamp: number;
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
  const navigate = useNavigate();
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
  
  // Improved frame buffer management
  const [frameBuffer, setFrameBuffer] = useState<Map<number, FrameData>>(new Map());
  const [processedColorFrames, setProcessedColorFrames] = useState<Map<number, string>>(new Map());
  const CHUNK_SIZE = 50; // Process frames in chunks to prevent memory issues
  const MAX_BUFFER_SIZE = 100; // Keep only recent frames in memory
  
  const [config, setConfig] = useState<ProcessingConfig>({
    asciiChars: ASCII_PRESETS.classic.chars,
    colorMode: 'matrix',
    brightness: 1.0,
    contrast: 1.0,
    scale: 0.15,
    fontSize: 10,
    charDensity: 1.0,
    frameRate: 15,
    quality: 'medium',
    outputMode: 'normal',
    edgeThreshold: 0.5,
    workerCount: navigator.hardwareConcurrency || 4,
    batchSize: 5
  });

  const [metrics, setMetrics] = useState<ProcessingMetrics>({
    fps: 0,
    processedFrames: 0,
    totalFrames: 0,
    estimatedTime: 0,
    progress: 0,
    cpuUsage: 0,
    memoryUsage: 0
  });
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const animationRef = useRef<number>();
  const workerPoolRef = useRef<Worker[]>([]);
  const gifRef = useRef<any>(null);
  const processingQueueRef = useRef<any[]>([]);
  const isProcessingRef = useRef(false);
  
  // Add error state
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const theme = COLOR_THEMES[selectedTheme];

  // Initialize worker pool for parallel processing
  useEffect(() => {
    const workerCount = config.workerCount;
    const workers: Worker[] = [];
    
    for (let i = 0; i < workerCount; i++) {
      const worker = new Worker(
        new URL('../workers/asciiProcessor.worker.ts', import.meta.url),
        { type: 'module' }
      );

      worker.onmessage = (e) => {
        if (e.data.type === 'frameProcessed') {
          handleFrameProcessed(e.data.data);
        } else if (e.data.type === 'performance') {
          // Update performance metrics
          setMetrics(prev => ({
            ...prev,
            cpuUsage: e.data.cpuUsage,
            memoryUsage: e.data.memoryUsage
          }));
        }
      };
      
      workers.push(worker);
    }
    
    workerPoolRef.current = workers;
    
    return () => {
      workers.forEach(worker => worker.terminate());
    };
  }, [config.workerCount]);

  const handleFrameProcessed = useCallback((data: any) => {
    const { frameNumber, ascii, colors, width, height, timestamp } = data;
    
    // Create frame data
    const frameData: FrameData = {
      frameNumber,
      ascii,
      colors,
      width,
      height,
      timestamp
    };
    
    // Store frame with automatic cleanup
    setFrameBuffer(prev => {
      const newBuffer = new Map(prev);
      
      // Clean up old frames to prevent memory leak
      if (newBuffer.size > MAX_BUFFER_SIZE) {
        const sortedKeys = Array.from(newBuffer.keys()).sort((a, b) => a - b);
        const keysToDelete = sortedKeys.slice(0, newBuffer.size - MAX_BUFFER_SIZE);
        keysToDelete.forEach(key => newBuffer.delete(key));
      }
      
      newBuffer.set(frameNumber, frameData);
      return newBuffer;
    });
    
    // Handle colored output
    if (config.outputMode === 'colored' && colors) {
      const coloredHtml = createColoredAscii(ascii, colors, width);
      setProcessedColorFrames(prev => {
        const newMap = new Map(prev);
        
        // Clean up old colored frames
        if (newMap.size > MAX_BUFFER_SIZE) {
          const sortedKeys = Array.from(newMap.keys()).sort((a, b) => a - b);
          const keysToDelete = sortedKeys.slice(0, newMap.size - MAX_BUFFER_SIZE);
          keysToDelete.forEach(key => newMap.delete(key));
        }
        
        newMap.set(frameNumber, coloredHtml);
        return newMap;
      });
      setPreviewFrame(coloredHtml);
    } else {
      setPreviewFrame(ascii);
    }
    
    // Update processed frames array for compatibility (limited size)
    setProcessedFrames(prev => {
      const newFrames = [...prev, ascii];
      // Keep only last 100 frames for animation playback
      return newFrames.slice(-100);
    });
    
    // Add frame to GIF if we're creating one
    if (gifRef.current && exportFormat === 'gif') {
      const gifCanvas = document.createElement('canvas');
      const gifCtx = gifCanvas.getContext('2d');
      if (gifCtx) {
        renderFrameToCanvas(gifCanvas, gifCtx, ascii, colors);
        gifRef.current.addFrame(gifCanvas, { delay: 1000 / config.frameRate });
      }
    }
    
    // Update metrics and check completion
    setMetrics(prev => {
      const newProcessedFrames = prev.processedFrames + 1;
      const progress = prev.totalFrames > 0 ? (newProcessedFrames / prev.totalFrames) * 100 : 0;
      const elapsed = (performance.now() - processingStartTimeRef.current) / 1000;
      const fps = elapsed > 0 ? newProcessedFrames / elapsed : 0;
      
      const newMetrics = {
        ...prev,
        processedFrames: newProcessedFrames,
        progress,
        fps,
        estimatedTime: fps > 0 ? (prev.totalFrames - newProcessedFrames) / fps : 0
      };
      
      // Check if all frames are processed
      if (newProcessedFrames >= prev.totalFrames && prev.totalFrames > 0) {
        setTimeout(() => finishProcessing(), 100);
      }
      
      return newMetrics;
    });
  }, [config.outputMode, config.frameRate, exportFormat]);

  const createColoredAscii = (ascii: string, colors: Uint8ClampedArray, width: number): string => {
    const lines = ascii.split('\n');
    let html = '<div style="font-family: monospace; line-height: 1; white-space: pre;">';
    let colorIndex = 0;

    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const line = lines[lineIndex];
      if (lineIndex > 0) html += '\n';
      
      for (let charIndex = 0; charIndex < line.length; charIndex++) {
        const char = line[charIndex];
        
        if (colorIndex < colors.length) {
          const r = colors[colorIndex];
          const g = colors[colorIndex + 1];
          const b = colors[colorIndex + 2];
          colorIndex += 3;
          
          const safeChar = char === ' ' ? '&nbsp;' : 
                          char === '<' ? '&lt;' : 
                          char === '>' ? '&gt;' : 
                          char === '&' ? '&amp;' : char;
          
      html += `<span style="color: rgb(${r},${g},${b})">${safeChar}</span>`;
        } else {
          html += char === ' ' ? '&nbsp;' : char;
        }
      }
    }

    html += '</div>';
    return html;
  };

  const renderFrameToCanvas = (canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, ascii: string, colors?: Uint8ClampedArray | null) => {
    const lines = ascii.split('\n');
    const maxLineLength = Math.max(...lines.map(line => line.length));
    const lineCount = lines.length;
    
    const charWidth = config.fontSize * 0.6;
    const charHeight = config.fontSize;
    
    canvas.width = maxLineLength * charWidth;
    canvas.height = lineCount * charHeight;
    
    // Clear canvas
    ctx.fillStyle = theme.background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Set font
    ctx.font = `${config.fontSize}px Consolas, Monaco, monospace`;
    ctx.textBaseline = 'top';
    
    if (config.outputMode === 'colored' && colors) {
      // Render colored ASCII
      let colorIndex = 0;
      lines.forEach((line, lineIndex) => {
        let x = 0;
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          if (colorIndex < colors.length) {
          const r = colors[colorIndex++];
          const g = colors[colorIndex++];
          const b = colors[colorIndex++];
          
          ctx.fillStyle = `rgb(${r},${g},${b})`;
          ctx.fillText(char, x, lineIndex * charHeight);
          }
          x += charWidth;
        }
      });
    } else {
      // Render monochrome ASCII
      ctx.fillStyle = theme.text;
      lines.forEach((line, lineIndex) => {
        ctx.fillText(line, 0, lineIndex * charHeight);
      });
    }
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
      setError('Please upload a valid image or video file');
      setTimeout(() => setError(null), 5000);
      return;
    }
    
    setFile(file);
    setIsImage(isImageFile);
    setProcessedFrames([]);
    setError(null);
    setMetrics({
      fps: 0,
      processedFrames: 0,
      totalFrames: isImageFile ? 1 : 0,
      estimatedTime: 0,
      progress: 0,
      cpuUsage: 0,
      memoryUsage: 0
    });
    
    if (isImageFile) {
      // Handle image
      const img = new Image();
      img.onerror = () => {
        setError('Failed to load image. Please try a different file.');
        setTimeout(() => setError(null), 5000);
      };
      img.onload = () => {
        processImage(img);
      };
      img.src = URL.createObjectURL(file);
    } else {
      // Handle video
      if (videoRef.current) {
        videoRef.current.onerror = () => {
          setError('Failed to load video. Please try a different file or format.');
          setTimeout(() => setError(null), 5000);
        };
        videoRef.current.src = URL.createObjectURL(file);
        videoRef.current.load();
      }
    }
  };

  const processImage = async (img: HTMLImageElement) => {
    if (!canvasRef.current) return;
    
    setIsLoading(true);
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
    
    // Send to worker
    const worker = workerPoolRef.current[0]; // Use the first worker for image processing
    worker.postMessage({
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
          charDensity: config.charDensity,
          colored: config.outputMode === 'colored'
          }
        }
      });
    
    setVideoLoaded(true);
    setIsLoading(false);
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
        
        // Send to worker
        const worker = workerPoolRef.current[0]; // Use the first worker for video processing
        worker.postMessage({
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
              charDensity: config.charDensity,
              colored: config.outputMode === 'colored'
              }
            }
          });
        
        resolve();
      };
    });
  };

  const processingStartTimeRef = useRef<number>(0);
  const processedFrameCountRef = useRef<number>(0);

  const processVideoInBatches = async () => {
    if (!videoRef.current || !canvasRef.current || !videoDuration) return;
    
    setIsProcessing(true);
    setIsPaused(false);
    isProcessingRef.current = true;
    processingStartTimeRef.current = performance.now();
    processedFrameCountRef.current = 0;
    
    // Clear previous data
    setFrameBuffer(new Map());
    setProcessedColorFrames(new Map());
    setProcessedFrames([]);
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { 
      willReadFrequently: true,
      desynchronized: true 
    });
    
    if (!ctx) return;

    const fps = config.frameRate;
    const totalFrames = Math.floor(videoDuration * fps);
    
    setMetrics(prev => ({
      ...prev,
      totalFrames,
      processedFrames: 0,
      progress: 0
    }));
    
    // Calculate dimensions
    const maxWidth = config.quality === 'ultra' ? 1200 : 
                    config.quality === 'high' ? 1000 : 
                    config.quality === 'medium' ? 800 : 600;
    const maxHeight = config.quality === 'ultra' ? 900 : 
                     config.quality === 'high' ? 750 : 
                     config.quality === 'medium' ? 600 : 450;
    
    const videoAspectRatio = video.videoWidth / video.videoHeight;
    let processWidth, processHeight;
    
    if (videoAspectRatio > maxWidth / maxHeight) {
      processWidth = maxWidth;
      processHeight = maxWidth / videoAspectRatio;
    } else {
      processHeight = maxHeight;
      processWidth = maxHeight * videoAspectRatio;
    }

    canvas.width = processWidth * config.scale;
    canvas.height = processHeight * config.scale;

    // Process frames in parallel batches
    const batchSize = config.batchSize;
    let currentWorkerIndex = 0;
    
    const processFrame = async (frameIndex: number) => {
      const time = frameIndex / fps;
      
      return new Promise<void>((resolve) => {
        video.currentTime = time;
        
        // Use seeked event as fallback for requestVideoFrameCallback
        const handleSeeked = () => {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          
          // Get next available worker
          const worker = workerPoolRef.current[currentWorkerIndex];
          currentWorkerIndex = (currentWorkerIndex + 1) % workerPoolRef.current.length;
          
          // Send to worker
          worker.postMessage({
            type: 'processFrame',
            data: {
              frameData: {
                frameNumber: frameIndex,
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
                charDensity: config.charDensity,
                colored: config.outputMode === 'colored'
              }
            }
          });
          
          video.removeEventListener('seeked', handleSeeked);
          resolve();
        };
        
        video.addEventListener('seeked', handleSeeked);
      });
    };
    
    // Process in chunks to prevent UI blocking
    for (let i = 0; i < totalFrames; i += CHUNK_SIZE) {
      if (!isProcessingRef.current) break;
      
      const chunkPromises = [];
      const chunkEnd = Math.min(i + CHUNK_SIZE, totalFrames);
      
      for (let j = i; j < chunkEnd; j += batchSize) {
        const batchPromises = [];
        const batchEnd = Math.min(j + batchSize, chunkEnd);
        
        for (let k = j; k < batchEnd; k++) {
          batchPromises.push(processFrame(k));
        }
        
        chunkPromises.push(Promise.all(batchPromises));
      }
      
      await Promise.all(chunkPromises);
      
      // Yield to UI thread
      await new Promise(resolve => setTimeout(resolve, 10));
    }
  };

  const finishProcessing = () => {
    setIsProcessing(false);
    isProcessingRef.current = false;
    
    const elapsed = (performance.now() - processingStartTimeRef.current) / 1000;
    console.log(`Processing completed: ${metrics.processedFrames} frames in ${elapsed.toFixed(2)}s`);
  };

  const handleExportVideo = async () => {
    if (frameBuffer.size === 0) return;
    
    // Sort frames by frame number
    const sortedFrames = Array.from(frameBuffer.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([_, frame]) => frame);
    
    if (sortedFrames.length === 0) return;
    
    const firstFrame = sortedFrames[0];
    const lines = firstFrame.ascii.split('\n');
    const maxLineLength = Math.max(...lines.map(line => line.length));
    const lineCount = lines.length;
    
    const charWidth = config.fontSize * 0.6;
    const charHeight = config.fontSize;
    
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = maxLineLength * charWidth;
    exportCanvas.height = lineCount * charHeight;
    const ctx = exportCanvas.getContext('2d');
    
    if (!ctx) return;
    
    // Use MP4 format only
    const stream = exportCanvas.captureStream(config.frameRate);
    const mimeType = 'video/mp4;codecs=h264';
    
    // Check if MP4 is supported, otherwise use WebM as fallback
    const supportedMimeType = MediaRecorder.isTypeSupported(mimeType) ? mimeType : 'video/webm;codecs=vp9';
    
    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: supportedMimeType,
      videoBitsPerSecond: 10000000 // 10 Mbps for good quality
    });
    
    const chunks: Blob[] = [];
    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };
    
    mediaRecorder.onstop = () => {
      const blob = new Blob(chunks, { type: supportedMimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      // Always use mp4 extension for better compatibility
      a.download = 'ascii-video.mp4';
      a.click();
      URL.revokeObjectURL(url);
    };
    
    mediaRecorder.start();
    
    // Render frames
    let frameIndex = 0;
    const frameInterval = 1000 / config.frameRate;
    
    const renderNextFrame = () => {
      if (frameIndex >= sortedFrames.length) {
        setTimeout(() => mediaRecorder.stop(), 100);
        return;
      }
      
      const frame = sortedFrames[frameIndex];
      
      // Clear canvas
      ctx.fillStyle = theme.background;
      ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
      
      // Set font
      ctx.font = `${config.fontSize}px Consolas, Monaco, monospace`;
      ctx.textBaseline = 'top';
      
      if (config.outputMode === 'colored' && frame.colors) {
        // Render colored ASCII
        const lines = frame.ascii.split('\n');
        let colorIndex = 0;
        
        lines.forEach((line, lineIndex) => {
          let x = 0;
          for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (colorIndex < frame.colors!.length) {
              const r = frame.colors![colorIndex++];
              const g = frame.colors![colorIndex++];
              const b = frame.colors![colorIndex++];
              
              ctx.fillStyle = `rgb(${r},${g},${b})`;
              ctx.fillText(char, x, lineIndex * charHeight);
            }
            x += charWidth;
          }
        });
      } else {
        // Render monochrome ASCII
        ctx.fillStyle = theme.text;
        const lines = frame.ascii.split('\n');
        lines.forEach((line, lineIndex) => {
          ctx.fillText(line, 0, lineIndex * charHeight);
        });
      }
      
      frameIndex++;
      setTimeout(renderNextFrame, frameInterval);
    };
    
    renderNextFrame();
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
          if (config.outputMode === 'colored' && processedColorFrames.has(next)) {
            setPreviewFrame(processedColorFrames.get(next)!);
          } else if (processedFrames[next]) {
            setPreviewFrame(processedFrames[next]);
          }
          return next;
        });
        lastTime = currentTime;
      }
      
      animationRef.current = requestAnimationFrame(animate);
    };
    
    animationRef.current = requestAnimationFrame(animate);
  }, [isPlaying, processedFrames, processedColorFrames, config.frameRate, config.outputMode]);

  useEffect(() => {
    if (isPlaying && processedFrames.length > 0) {
      playAnimation();
    } else if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
  }, [isPlaying, playAnimation, processedFrames.length]);

  const handleExportGIF = () => {
    if (frameBuffer.size === 0) return;
    
    // Sort frames by frame number
    const sortedFrames = Array.from(frameBuffer.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([_, frame]) => frame);
    
    if (sortedFrames.length === 0) return;
    
    const firstFrame = sortedFrames[0];
    const lines = firstFrame.ascii.split('\n');
    const maxLineLength = Math.max(...lines.map(line => line.length));
    const lineCount = lines.length;
    
    const charWidth = config.fontSize * 0.6;
    const charHeight = config.fontSize;
    
    // Initialize GIF with correct worker path
    gifRef.current = new GIF({
      workers: 4,
      quality: 10,
      width: maxLineLength * charWidth,
      height: lineCount * charHeight,
      workerScript: '/gif.worker.js' // Ensure this file exists in public folder
    });
    
    gifRef.current.on('finished', (blob: Blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'ascii-animation.gif';
      a.click();
      URL.revokeObjectURL(url);
    });
    
    // Add frames to GIF
    const gifCanvas = document.createElement('canvas');
    gifCanvas.width = maxLineLength * charWidth;
    gifCanvas.height = lineCount * charHeight;
    const ctx = gifCanvas.getContext('2d');
    
    if (ctx) {
      sortedFrames.forEach(frame => {
        renderFrameToCanvas(gifCanvas, ctx, frame.ascii, frame.colors);
        gifRef.current.addFrame(gifCanvas, { delay: 1000 / config.frameRate });
      });
      
      gifRef.current.render();
    }
  };

  const handleExport = () => {
    if (frameBuffer.size === 0 && processedFrames.length === 0) return;
    
    switch (exportFormat) {
      case 'video':
        handleExportVideo();
        break;
      case 'gif':
        handleExportGIF();
        break;
      case 'text': {
        const frames = frameBuffer.size > 0 ? 
          Array.from(frameBuffer.values()).map(f => f.ascii) : 
          processedFrames;
        const text = frames.join('\n\n' + '='.repeat(80) + '\n\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
        a.download = 'ascii-frames.txt';
    a.click();
    URL.revokeObjectURL(url);
        break;
      }
    }
  };

  const processVideo = () => {
    isProcessingRef.current = true;
    processVideoInBatches();
  };

  const stopProcessing = () => {
    isProcessingRef.current = false;
    setIsProcessing(false);
    setIsPaused(false);
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
        {/* Header with Back Button */}
        <motion.div 
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="text-center mb-8"
        >
          {/* Back Button */}
          <motion.button
            onClick={() => navigate('/')}
            className="absolute left-4 top-0 px-4 py-2 rounded-lg border transition-all flex items-center gap-2 hover:scale-105"
            style={{
              borderColor: theme.primary + '66',
              background: theme.primary + '11',
              color: theme.primary
            }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </motion.button>

          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4 flex items-center justify-center gap-4">
            <Terminal className="w-12 h-12" style={{ color: theme.primary }} />
            <span className="text-transparent bg-clip-text" style={{
              backgroundImage: `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})`,
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
              
              {/* Error Message */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="mt-4 p-3 rounded-lg bg-red-500/20 border border-red-500/50 text-red-400"
                >
                  {error}
                </motion.div>
              )}
              
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
                      {[5, 10, 15, 20, 24, 30].map((fps) => (
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

                  {/* Quality with more options */}
                  <div>
                    <label className="block text-sm font-medium mb-2">Quality & Resolution</label>
                    <select
                      value={config.quality}
                      onChange={(e) => setConfig(prev => ({ ...prev, quality: e.target.value as any }))}
                      className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20"
                      style={{ color: theme.text }}
                    >
                      <option value="low">Low (600x450 - Fast)</option>
                      <option value="medium">Medium (800x600)</option>
                      <option value="high">High (1000x750)</option>
                      <option value="ultra">Ultra (1200x900 - Slow)</option>
                    </select>
                  </div>

                  {/* Worker Count */}
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Worker Threads: {config.workerCount}
                    </label>
                    <input
                      type="range"
                      min="1"
                      max={navigator.hardwareConcurrency || 8}
                      step="1"
                      value={config.workerCount}
                      onChange={(e) => setConfig(prev => ({ ...prev, workerCount: parseInt(e.target.value) }))}
                      className="w-full"
                      style={{ accentColor: theme.primary }}
                    />
                    <div className="text-xs opacity-60 mt-1">
                      Utilize {config.workerCount} CPU cores for parallel processing
                    </div>
                  </div>

                  {/* Batch Size */}
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Batch Size: {config.batchSize} frames
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      step="1"
                      value={config.batchSize}
                      onChange={(e) => setConfig(prev => ({ ...prev, batchSize: parseInt(e.target.value) }))}
                      className="w-full"
                      style={{ accentColor: theme.primary }}
                    />
                    <div className="text-xs opacity-60 mt-1">
                      Process {config.batchSize} frames simultaneously per worker
                    </div>
                  </div>

                  {/* Export Format */}
                  <div>
                    <label className="block text-sm font-medium mb-2">Export Format</label>
                    <div className="flex gap-2">
                      {[
                        { key: 'video', name: 'MP4/WebM', icon: Film },
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
                  {config.outputMode === 'colored' && processedColorFrames.size > 0 ? (
                    <div
                      className="leading-none text-center"
                      style={{ 
                        fontFamily: 'Consolas, Monaco, monospace',
                        fontSize: `${config.fontSize}px`,
                        whiteSpace: 'pre',
                        lineHeight: 1,
                        maxWidth: '100%',
                        maxHeight: '100%',
                        overflow: 'auto',
                      }}
                      dangerouslySetInnerHTML={{ __html: previewFrame }}
                    />
                  ) : (
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
                  )}
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

              {/* Loading State */}
              {isLoading && (
                <div className="absolute inset-0 bg-black/50 backdrop-blur-sm rounded-lg flex items-center justify-center">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                  >
                    <RefreshCw className="w-8 h-8" style={{ color: theme.primary }} />
                  </motion.div>
                </div>
              )}

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
                disabled={!videoLoaded || isProcessing || isLoading}
                className="flex-1 px-6 py-3 rounded-lg font-bold flex items-center justify-center gap-2 border transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                  borderColor: theme.primary,
                  color: theme.primary,
                  background: theme.primary + '22',
                  boxShadow: !videoLoaded || isProcessing || isLoading ? 'none' : `0 0 20px ${theme.glow}44`
                  }}
                >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                <Sparkles className="w-5 h-5" />
                {isImage ? 'Process Image' : 'Process Video'}
                  </>
                )}
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
                  { icon: Activity, label: 'Parallelism', value: 'On' }
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