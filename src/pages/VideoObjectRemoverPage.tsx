import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { editImageWithGemini } from '../services/gemini.service';
import { FFmpegService } from '../services/ffmpegService';

type ProcessingStep = 'upload' | 'configure' | 'processing' | 'complete';

interface ProcessingFrame {
  frameNumber: number;
  originalDataUrl: string;
  processedDataUrl?: string;
  status: 'pending' | 'processing' | 'complete' | 'error';
  error?: string;
}

// Custom SVG icons
const IconVideo = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="2"/>
    <path d="M3 9H21" stroke="currentColor" strokeWidth="2"/>
    <circle cx="7" cy="7" r="1" fill="currentColor"/>
    <circle cx="12" cy="7" r="1" fill="currentColor"/>
    <circle cx="17" cy="7" r="1" fill="currentColor"/>
    <path d="M10 12V16L14 14L10 12Z" fill="currentColor" fillOpacity="0.3" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
  </svg>
);

const IconRemove = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeDasharray="3 3"/>
    <path d="M8 8L16 16M16 8L8 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

const IconMagic = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M15 4V2M15 16V14M9 9L10.5 7.5M16.5 16.5L18 15M3 21L12 12M12 4L14 2M4 14L2 12M12 12L21 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M20 7L19 8M5 18L4 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

const IconInterpolate = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="3" y="8" width="4" height="8" rx="1" stroke="currentColor" strokeWidth="2"/>
    <rect x="10" y="8" width="4" height="8" rx="1" stroke="currentColor" strokeWidth="1" strokeDasharray="2 2" opacity="0.5"/>
    <rect x="17" y="8" width="4" height="8" rx="1" stroke="currentColor" strokeWidth="2"/>
    <path d="M7 12H10M14 12H17" stroke="currentColor" strokeWidth="1" strokeDasharray="2 2"/>
  </svg>
);

const IconUpload = () => (
  <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <motion.path 
      d="M24 32V16M24 16L18 22M24 16L30 22" 
      stroke="currentColor" 
      strokeWidth="3" 
      strokeLinecap="round" 
      strokeLinejoin="round"
      initial={{ pathLength: 0 }}
      animate={{ pathLength: 1 }}
      transition={{ duration: 1, repeat: Infinity, repeatDelay: 1 }}
    />
    <motion.rect 
      x="8" y="8" width="32" height="32" rx="8" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeDasharray="5 5"
      initial={{ rotate: 0 }}
      animate={{ rotate: 360 }}
      transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
    />
  </svg>
);

function VideoObjectRemoverPage() {
  const [currentStep, setCurrentStep] = useState<ProcessingStep>('upload');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoDuration, setVideoDuration] = useState<number>(0);
  const [effectiveDuration, setEffectiveDuration] = useState<number>(0);
  const [objectToRemove, setObjectToRemove] = useState<string>('');
  const [frames, setFrames] = useState<ProcessingFrame[]>([]);
  const [currentProcessingFrame, setCurrentProcessingFrame] = useState<number | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [finalVideoUrl, setFinalVideoUrl] = useState<string | null>(null);
  const [allFrames, setAllFrames] = useState<{type: 'edited' | 'interpolated', url: string, index: number}[]>([]);
  const [showFrameSidebar, setShowFrameSidebar] = useState(false);
  const [showDisclaimer, setShowDisclaimer] = useState(true);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const interpolationWorkerRef = useRef<Worker | null>(null);

  // Initialize FILM interpolation worker
  useEffect(() => {
    const worker = new Worker('/film-interpolation.worker.js');
    
    worker.onmessage = (e) => {
      const message = e.data;
      
      if (message.type === 'ready') {
        console.log('FILM interpolation worker ready');
      } else if (message.type === 'progress' && message.progress !== undefined) {
        // Update interpolation progress
        const interpolationProgress = 50 + (message.progress / 100) * 50;
        setProgress(interpolationProgress);
      } else if (message.type === 'complete' && message.frames) {
        console.log('Interpolation complete', message.frames);
      } else if (message.type === 'error' && message.error) {
        console.error('Interpolation error:', message.error);
        setError(`Interpolation failed: ${message.error}`);
      }
    };
    
    interpolationWorkerRef.current = worker;
    
    return () => {
      if (interpolationWorkerRef.current) {
        interpolationWorkerRef.current.terminate();
      }
    };
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('video/')) {
      handleVideoSelect(file);
    }
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('video/')) {
      handleVideoSelect(file);
    }
  }, []);

  const handleVideoSelect = async (file: File) => {
    setVideoFile(file);
    const url = URL.createObjectURL(file);
    setVideoUrl(url);
    setError(null);
    
    // Get video duration
    const video = document.createElement('video');
    video.src = url;
    video.onloadedmetadata = () => {
      setVideoDuration(video.duration);
      setEffectiveDuration(Math.min(video.duration, 6));
    };
  };

  const extractFrames = async () => {
    if (!videoFile || !videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    console.log('Video dimensions:', video.videoWidth, 'x', video.videoHeight);

    const fps = 25; // Target FPS
    const frameInterval = 5; // Extract every 5th frame for processing
    const framesToExtract: number[] = [];
    
    // Calculate total frames based on duration and FPS
    const totalFrames = Math.floor(effectiveDuration * fps);
    
    // Extract frames at regular intervals
    for (let i = 0; i < totalFrames; i += frameInterval) {
      framesToExtract.push(i);
    }
    
    // Always include the last frame if not already included
    const lastFrame = totalFrames - 1;
    if (framesToExtract[framesToExtract.length - 1] !== lastFrame && lastFrame > 0) {
      framesToExtract.push(lastFrame);
    }

    console.log('Frames to extract:', framesToExtract);

    const extractedFrames: ProcessingFrame[] = [];

    for (const frameNumber of framesToExtract) {
      video.currentTime = frameNumber / fps;
      await new Promise(resolve => {
        video.onseeked = resolve;
      });

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0);
      
      const dataUrl = canvas.toDataURL('image/png');
      extractedFrames.push({
        frameNumber,
        originalDataUrl: dataUrl,
        status: 'pending'
      });
    }

    console.log('Extracted frames:', extractedFrames.length);
    setFrames(extractedFrames);
    return extractedFrames; // Return frames for immediate use
  };

  const processFramesWithData = async (framesToProcess: ProcessingFrame[]) => {
    if (!framesToProcess.length || !objectToRemove) return;

    setCurrentStep('processing');
    
    // Use the specified prompt template
    const prompt = `Analyze the image and remove the ${objectToRemove}. Reconstruct the background with seamless, photorealistic detail, ensuring no artifacts or traces of the object remain.`;

    // Track processed frames locally
    const processedFramesData: ProcessingFrame[] = [...framesToProcess];
    let successCount = 0;

    // Parallel processing with bounded concurrency
    const maxConcurrent = 4; // adjustable based on free tier limits
    let completed = 0;

    const queue = [...framesToProcess.keys()];

    const runNext = async (): Promise<void> => {
      const idx = queue.shift();
      if (idx === undefined) return;
      const frame = framesToProcess[idx];

      setCurrentProcessingFrame(idx);
      setFrames(prev => prev.map((f, i) => (i === idx ? { ...f, status: 'processing' } : f)));

      try {
        console.log(`Processing frame ${idx} (frame number ${frame.frameNumber})`);
        const response = await fetch(frame.originalDataUrl);
        const blob = await response.blob();
        const file = new File([blob], `frame_${frame.frameNumber}.png`, { type: 'image/png' });

        console.log(`Frame ${idx} file size:`, file.size, 'bytes');

        // Stateless per-frame session
        const result = await editImageWithGemini({
          prompt,
          file,
          inputMimeType: 'image/png',
          outputMimeType: 'image/png',
        });

        console.log(`Frame ${idx} processed successfully`);
        
        // Update local tracking
        processedFramesData[idx] = {
          ...processedFramesData[idx],
          processedDataUrl: `data:image/png;base64,${result.imageBase64}`,
          status: 'complete'
        };
        successCount++;

        setFrames(prev => prev.map((f, i) => (
          i === idx
            ? { ...f, processedDataUrl: `data:image/png;base64,${result.imageBase64}`, status: 'complete' }
            : f
        )));
      } catch (err: any) {
        console.error(`Frame ${idx} failed:`, err);
        processedFramesData[idx] = { ...processedFramesData[idx], status: 'error', error: err.message || 'Failed' };
        setFrames(prev => prev.map((f, i) => (i === idx ? { ...f, status: 'error', error: err.message || 'Failed' } : f)));
      } finally {
        completed += 1;
        setProgress((completed / framesToProcess.length) * 50);
        // Launch next in queue
        await runNext();
      }
    };

    // Start workers
    await Promise.all(Array(Math.min(maxConcurrent, framesToProcess.length)).fill(0).map(() => runNext()));

    setCurrentProcessingFrame(null);
    
    console.log(`Processing complete. ${successCount} frames processed successfully.`);
    
    if (successCount === 0) {
      setError('No frames were successfully processed');
      setCurrentStep('complete');
      return;
    }
    
    // Update frames one more time to ensure all processed frames are set
    setFrames(processedFramesData);
    
    // Pass the processed frames directly instead of relying on state
    const composed = await interpolateFramesWithData(processedFramesData);
    await reconstructVideo(composed);
  };

  const processFrames = async () => {
    return processFramesWithData(frames);
  };

  const interpolateFramesWithData = async (framesToInterpolate: ProcessingFrame[]): Promise<string[]> => {
    console.log('Starting frame interpolation...');
    if (!interpolationWorkerRef.current || framesToInterpolate.length < 2) {
      console.log('Skipping interpolation - no worker or not enough frames');
      // Return processed frames as-is without interpolation
      const editedFrames = framesToInterpolate.filter(f => f.processedDataUrl).sort((a, b) => a.frameNumber - b.frameNumber);
      setAllFrames(editedFrames.map((f, i) => ({ type: 'edited', url: f.processedDataUrl!, index: i })));
      return editedFrames.map(f => f.processedDataUrl!);
    }

    const processedFrames = framesToInterpolate.filter(f => f.processedDataUrl).sort((a, b) => a.frameNumber - b.frameNumber);
    console.log(`Found ${processedFrames.length} processed frames for interpolation`);
    
    if (processedFrames.length < 2) {
      console.log('Not enough processed frames for interpolation, returning as-is');
      return processedFrames.map(f => f.processedDataUrl!);
    }

    // Calculate how many frames we need between each pair
    const framePairs: Array<{frame1: ProcessingFrame, frame2: ProcessingFrame, numIntermediate: number}> = [];
    
    for (let i = 0; i < processedFrames.length - 1; i++) {
      const frame1 = processedFrames[i];
      const frame2 = processedFrames[i + 1];
      const frameGap = frame2.frameNumber - frame1.frameNumber;
      // We need to fill in the missing frames between the two keyframes
      const numIntermediate = Math.max(0, frameGap - 1);
      
      console.log(`Frames ${frame1.frameNumber} -> ${frame2.frameNumber}: need ${numIntermediate} intermediate frames`);
      framePairs.push({ frame1, frame2, numIntermediate });
    }

    // Process each pair
    let totalInterpolated = 0;
    const totalToInterpolate = framePairs.reduce((sum, pair) => sum + pair.numIntermediate, 0);
    
    const pairInterpolations: string[][] = [];
    for (const pair of framePairs) {
      if (pair.numIntermediate > 0) {
        const pairFrames: string[] = await new Promise<string[]>((resolve, reject) => {
          interpolationWorkerRef.current!.postMessage({
            type: 'interpolate',
            data: {
              frame1: pair.frame1.processedDataUrl,
              frame2: pair.frame2.processedDataUrl,
              numIntermediateFrames: pair.numIntermediate
            }
          });

          const handler = (e: MessageEvent) => {
            if (e.data.type === 'complete') {
              totalInterpolated += pair.numIntermediate;
              setProgress(50 + (totalInterpolated / totalToInterpolate) * 45);
              interpolationWorkerRef.current!.removeEventListener('message', handler);
              resolve(e.data.frames as string[]);
            } else if (e.data.type === 'error') {
              interpolationWorkerRef.current!.removeEventListener('message', handler);
              reject(new Error(e.data.error));
            }
          };

          interpolationWorkerRef.current!.addEventListener('message', handler);
        });
        pairInterpolations.push(pairFrames);
      } else {
        pairInterpolations.push([]);
      }
    }

    // Compose final ordered frames: processed + interpolated between
    console.log(`Total interpolated frames: ${totalInterpolated}`);
    const processedFramesSorted = processedFrames.sort((a, b) => a.frameNumber - b.frameNumber);
    const composed: string[] = [];
    const allFramesList: {type: 'edited' | 'interpolated', url: string, index: number}[] = [];
    
    // Build the complete frame sequence
    let frameIndex = 0;
    for (let i = 0; i < processedFramesSorted.length - 1; i++) {
      // Add the keyframe
      composed.push(processedFramesSorted[i].processedDataUrl!);
      allFramesList.push({ type: 'edited', url: processedFramesSorted[i].processedDataUrl!, index: frameIndex++ });
      
      // Add interpolated frames between this keyframe and the next
      const interpolatedFrames = pairInterpolations[i] || [];
      console.log(`Adding ${interpolatedFrames.length} interpolated frames after frame ${processedFramesSorted[i].frameNumber}`);
      for (const frame of interpolatedFrames) {
        composed.push(frame);
        allFramesList.push({ type: 'interpolated', url: frame, index: frameIndex++ });
      }
    }
    
    // Add the last keyframe
    composed.push(processedFramesSorted[processedFramesSorted.length - 1].processedDataUrl!);
    allFramesList.push({ type: 'edited', url: processedFramesSorted[processedFramesSorted.length - 1].processedDataUrl!, index: frameIndex });
    
    setAllFrames(allFramesList);
    console.log(`Final composed sequence: ${composed.length} frames total (${processedFrames.length} keyframes + ${totalInterpolated} interpolated)`);
    return composed;
  };

  const interpolateFrames = async (): Promise<string[]> => {
    return interpolateFramesWithData(frames);
  };
  
  const reconstructVideo = async (composedFrames?: string[]) => {
    try {
      console.log('Starting video reconstruction...');
      console.log('Composed frames available:', composedFrames?.length || 0);
      console.log('Processed frames available:', frames.filter(f => f.processedDataUrl).length);
      
      // Collect frames in order: prefer composed frames (with interpolation)
      const orderedDataUrls: string[] = composedFrames && composedFrames.length > 1
        ? composedFrames
        : frames.filter(f => f.processedDataUrl).sort((a, b) => a.frameNumber - b.frameNumber).map(f => f.processedDataUrl!)

      console.log('Total frames for video:', orderedDataUrls.length);

      if (orderedDataUrls.length < 2) {
        console.error('Not enough processed frames for video reconstruction');
        setError('Not enough processed frames to create video');
        setCurrentStep('complete');
        return;
      }

      // Calculate actual FPS and timing
      const targetFps = 25;
      const totalFrames = orderedDataUrls.length;
      const targetDuration = totalFrames / targetFps; // Calculate duration from frame count
      
      console.log(`Video reconstruction: ${totalFrames} frames, ${targetDuration.toFixed(3)}s duration, ${targetFps} FPS`);

      let videoUrl: string | null = null;
      
      try {
        // Try FFmpeg first for MP4 output
        console.log('Attempting to use FFmpeg for MP4 output...');
        
        // Initialize FFmpeg service
        const ffmpegService = new FFmpegService();
        
        // Set progress callback for FFmpeg operations
        ffmpegService.onProgress((progress) => {
          const overallProgress = 95 + (progress.ratio * 5); // Map to 95-100% range
          setProgress(overallProgress);
        });

        console.log('Loading FFmpeg...');
        await ffmpegService.load();
        console.log('FFmpeg loaded successfully');

        // Convert data URLs to Blobs
        console.log('Converting frames to blobs...');
        const frameBlobs: Blob[] = await Promise.all(
          orderedDataUrls.map(async (dataUrl) => {
            const response = await fetch(dataUrl);
            return await response.blob();
          })
        );
        console.log(`Converted ${frameBlobs.length} frames to blobs`);

        // Create MP4 video from frames using FFmpeg
        console.log('Creating MP4 video with FFmpeg...');
        const videoBlob = await ffmpegService.createVideoFromFrames(frameBlobs, {
          fps: targetFps,
          format: 'mp4',
          codec: 'libx264',
          quality: 18 // Lower CRF = higher quality (18 is visually lossless)
        });
        
        console.log('Video creation complete, blob size:', videoBlob.size);
        
        // Create URL for the video
        videoUrl = URL.createObjectURL(videoBlob);
        console.log('Output format: MP4 (H.264)');
      } catch (ffmpegError) {
        console.error('FFmpeg failed, falling back to WebM:', ffmpegError);
        
        // Fallback to WebM using Canvas and MediaRecorder
        console.log('Using fallback WebM encoding...');
        
        // Create an offscreen canvas
        const canvas = document.createElement('canvas');
        const firstFrame = await loadImage(orderedDataUrls[0]);
        canvas.width = firstFrame.naturalWidth;
        canvas.height = firstFrame.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Canvas 2D unavailable');

        // Use high-quality WebM codec
        const stream = canvas.captureStream(targetFps);
        const mimeType = 'video/webm;codecs=vp9';
        const recorder = new MediaRecorder(stream, { 
          mimeType, 
          videoBitsPerSecond: 10_000_000 // 10 Mbps for high quality
        });
        
        const chunks: BlobPart[] = [];
        recorder.ondataavailable = e => { if (e.data && e.data.size > 0) chunks.push(e.data); };

        const done = new Promise<string>((resolve) => {
          recorder.onstop = () => {
            const blob = new Blob(chunks, { type: 'video/webm' });
            const url = URL.createObjectURL(blob);
            resolve(url);
          };
        });

        recorder.start();

        // Preload all images
        console.log('Preloading frames...');
        const preloadedImages = await Promise.all(
          orderedDataUrls.map(url => loadImage(url))
        );
        
        // Draw frames with precise timing
        const frameDuration = 1000 / targetFps; // ms per frame
        let frameIndex = 0;
        
        const drawFrame = () => {
          if (frameIndex >= preloadedImages.length) {
            recorder.stop();
            console.log(`WebM encoding complete. Total frames: ${frameIndex}`);
            return;
          }
          
          ctx.drawImage(preloadedImages[frameIndex], 0, 0, canvas.width, canvas.height);
          frameIndex++;
          
          setTimeout(drawFrame, frameDuration);
        };
        
        drawFrame();
        videoUrl = await done;
        console.log('Output format: WebM (VP9)');
      }
      
      // Log final video information
      console.log('Video reconstruction complete! URL:', videoUrl);
      console.log(`Output video: ${totalFrames} frames at ${targetFps} FPS = ${targetDuration.toFixed(3)}s`);
      
      setFinalVideoUrl(videoUrl);
      setProgress(100);
      setCurrentStep('complete');
    } catch (err: any) {
      console.error('Video reconstruction failed:', err);
      setError(err.message || 'Failed to reconstruct video');
      setFinalVideoUrl(null);
      setCurrentStep('complete');
    }
  };
  
  function loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }


  const startProcessing = async () => {
    if (!videoFile || !objectToRemove) return;
    
    console.log('Starting processing...', { videoFile, objectToRemove });
    setError(null);
    setProgress(0);
    
    try {
      // Extract frames
      console.log('Extracting frames...');
      const extractedFrames = await extractFrames();
      
      if (!extractedFrames || extractedFrames.length === 0) {
        throw new Error('Failed to extract frames from video');
      }
      
      // Process frames immediately
      console.log('Processing frames...');
      await processFramesWithData(extractedFrames);
    } catch (err: any) {
      console.error('Processing error:', err);
      setError(err.message || 'Processing failed');
    }
  };

  const reset = () => {
    setCurrentStep('upload');
    setVideoFile(null);
    setVideoUrl(null);
    setVideoDuration(0);
    setObjectToRemove('');
    setFrames([]);
    setCurrentProcessingFrame(null);
    setProgress(0);
    setError(null);
    setFinalVideoUrl(null);
  };

  return (
    <div className="relative z-10 min-h-screen w-full">
      {/* Hardware Performance Disclaimer Popup */}
      <AnimatePresence>
        {showDisclaimer && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black bg-opacity-80 backdrop-blur-sm flex items-center justify-center p-4"
              onClick={() => setShowDisclaimer(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                transition={{ type: "spring", duration: 0.3 }}
                className="bg-neutral-900 border border-neutral-800 rounded-2xl p-8 max-w-md w-full relative"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 mx-auto bg-amber-500/20 rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-white">Performance Notice</h3>
                  <p className="text-neutral-400 text-sm leading-relaxed">
                    Video processing speed depends on your hardware capabilities. More powerful GPUs and CPUs will provide faster generation times. Processing may take longer on lower-end devices.
                  </p>
                  <button
                    onClick={() => setShowDisclaimer(false)}
                    className="bg-white text-black font-medium px-6 py-2 rounded-lg hover:bg-neutral-200 transition-colors"
                  >
                    Got it
                  </button>
                </div>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Hidden elements for processing */}
      {videoUrl && (
        <>
          <video ref={videoRef} src={videoUrl} className="hidden" />
          <canvas ref={canvasRef} className="hidden" />
        </>
      )}
      
      {/* Futuristic Background */}
      <div className="absolute inset-0 bg-black" />

      <div className="relative px-6 py-10 max-w-7xl mx-auto">
        {/* Header - Minimal dark */}
        <div className="mb-12 text-center">
          <h1 className="text-white text-4xl md:text-5xl font-black tracking-tight">Video Object Remover</h1>
          <p className="text-neutral-400 mt-3">Powered by Nano Banana & FILM.</p>
        </div>


        {/* Main Content */}
        <AnimatePresence mode="wait">
          {currentStep === 'upload' && (
            <motion.div
              key="upload"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-2xl mx-auto space-y-6"
            >
              {/* File Upload Area */}
              <motion.div
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="relative group cursor-pointer"
              >
                <div className="absolute -inset-1 bg-black rounded-3xl opacity-50" />
                <div className="relative bg-neutral-950 rounded-3xl border border-neutral-800 p-20 text-center overflow-hidden">
                  <div className="relative z-10 flex flex-col items-center gap-8">
                    <IconUpload />
                    <div className="space-y-4">
                      <h3 className="text-3xl font-black text-white">Drop Your Video</h3>
                      <p className="text-neutral-400 text-lg max-w-md mx-auto">
                        Upload a video; we will use up to the first 6 seconds
                      </p>
                      <div className="flex justify-center gap-3 mt-6">
                        {['MP4', 'MOV', 'WEBM'].map((format) => (
                          <span key={format} className="px-3 py-1 bg-neutral-900 border border-neutral-800 rounded-full text-xs font-semibold text-neutral-300">
                            {format}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <input 
                    ref={fileInputRef} 
                    type="file" 
                    accept="video/*" 
                    className="hidden" 
                    onChange={handleFileChange} 
                  />
                </div>
              </motion.div>

              {/* Video Preview & Configure */}
              {videoFile && videoUrl && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ type: "spring", duration: 0.6 }}
                  className="relative"
                >
                  <div className="absolute -inset-1 bg-gradient-to-r from-violet-600 via-fuchsia-600 to-pink-600 rounded-3xl opacity-40 blur-lg animate-pulse"></div>
                  
                  <div className="relative bg-gradient-to-br from-gray-900/95 via-violet-900/30 to-gray-900/95 backdrop-blur-xl rounded-3xl border border-violet-500/30 p-10 overflow-hidden">
                    <h3 className="text-2xl font-black text-center mb-8 bg-gradient-to-r from-violet-300 to-fuchsia-300 bg-clip-text text-transparent">
                      Configure Removal
                    </h3>
                    
                    {/* Video Preview */}
                    <div className="mb-8">
                      <video 
                        src={videoUrl} 
                        controls 
                        className="w-full max-w-md mx-auto rounded-xl border border-neutral-800 bg-black"
                      />
                      <p className="text-center text-sm text-neutral-500 mt-2">
                        Original: {videoDuration.toFixed(1)}s • Processing: {effectiveDuration.toFixed(1)}s
                      </p>
                    </div>

                    {/* Object Input */}
                    <div className="max-w-md mx-auto space-y-4">
                      <label className="block">
                        <span className="text-sm font-semibold text-neutral-300 mb-2 block">
                          What do you want to remove?
                        </span>
                        <input
                          type="text"
                          value={objectToRemove}
                          onChange={(e) => setObjectToRemove(e.target.value)}
                          placeholder="e.g., person, car, logo, text"
                          className="w-full px-4 py-3 bg-neutral-900 border border-neutral-800 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-600 focus:bg-black transition-all"
                        />
                        <p className="text-xs text-gray-400 mt-2">
                          Be specific - the AI will remove all instances of this object
                        </p>
                      </label>

                      {/* Processing Tip */}
                      {objectToRemove && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="bg-amber-900/20 border border-amber-600/30 rounded-xl p-3"
                        >
                          <p className="text-amber-400 text-sm flex items-center gap-2">
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0">
                              <path d="M8 2v6M8 11v.01M14 8A6 6 0 112 8a6 6 0 0112 0z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                            </svg>
                            <span>Press the start button only once and be patient - processing happens in the background</span>
                          </p>
                        </motion.div>
                      )}

                      {/* Start Button */}
                      <motion.button
                        type="button"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={startProcessing}
                        disabled={!objectToRemove}
                        className={`relative group w-full overflow-hidden rounded-2xl ${
                          objectToRemove 
                            ? 'opacity-100 cursor-pointer' 
                            : 'opacity-50 cursor-not-allowed'
                        }`}
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-violet-600 via-fuchsia-600 to-pink-600 opacity-90 group-hover:opacity-100 transition-opacity duration-300"></div>
                        <div className="absolute inset-0 bg-gradient-to-r from-violet-400 via-fuchsia-400 to-pink-400 opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-300"></div>
                        
                        <div className="relative px-8 py-5 bg-gradient-to-r from-violet-500/90 via-fuchsia-500/90 to-pink-500/90 backdrop-blur-xl">
                          <div className="flex items-center justify-center gap-3">
                            <IconRemove />
                            <span className="text-white font-black text-lg tracking-wide">
                              Start Object Removal
                            </span>
                            <motion.div
                              animate={{ x: [0, 5, 0] }}
                              transition={{ duration: 1.5, repeat: Infinity }}
                            >
                              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                <path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            </motion.div>
                          </div>
                        </div>
                      </motion.button>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Error Message */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 bg-red-900/20 rounded-xl border border-red-500/30"
                >
                  <p className="text-red-300">{error}</p>
                </motion.div>
              )}
            </motion.div>
          )}

          {currentStep === 'processing' && (
            <motion.div
              key="processing"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              {/* Progress Bar */}
              <div className="max-w-4xl mx-auto">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-400">Processing Progress</span>
                  <span className="text-sm font-bold text-violet-400">{Math.round(progress)}%</span>
                </div>
                <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-pink-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
              </div>

              {/* Processing Status */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="relative"
              >
                <div className="absolute -inset-4 bg-gradient-to-r from-violet-500/20 via-fuchsia-500/20 to-pink-500/20 rounded-[2rem] blur-3xl animate-pulse"></div>
                
                <div className="relative bg-gradient-to-br from-gray-900/90 via-violet-950/50 to-gray-900/90 backdrop-blur-xl rounded-3xl border border-violet-500/30 p-10 overflow-hidden">
                  <h2 className="text-3xl font-black bg-gradient-to-r from-violet-300 via-fuchsia-300 to-pink-300 bg-clip-text text-transparent mb-8 text-center">
                    AI Processing Studio
                  </h2>

                  {/* Processing Steps */}
                  <div className="space-y-6">
                    {/* Step 1: Frame Extraction */}
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={`flex items-center gap-4 p-4 rounded-xl border ${
                        progress > 0 
                          ? 'bg-violet-900/20 border-violet-500/30' 
                          : 'bg-gray-900/50 border-gray-700/30'
                      }`}
                    >
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        progress > 0 
                          ? 'bg-gradient-to-br from-violet-500 to-fuchsia-500' 
                          : 'bg-gray-700'
                      }`}>
                        <IconVideo />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-white">Frame Extraction</h3>
                        <p className="text-sm text-gray-400">Extracting key frames from video</p>
                      </div>
                      {progress > 0 && (
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                          <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-violet-400"/>
                        </svg>
                      )}
                    </motion.div>

                    {/* Step 2: Object Removal */}
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 }}
                      className={`flex items-center gap-4 p-4 rounded-xl border ${
                        progress > 0 && progress < 50 
                          ? 'bg-fuchsia-900/20 border-fuchsia-500/30' 
                          : progress >= 50
                          ? 'bg-violet-900/20 border-violet-500/30'
                          : 'bg-gray-900/50 border-gray-700/30'
                      }`}
                    >
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        progress > 0 
                          ? 'bg-gradient-to-br from-fuchsia-500 to-pink-500' 
                          : 'bg-gray-700'
                      }`}>
                        {progress > 0 && progress < 50 ? (
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                          >
                            <IconMagic />
                          </motion.div>
                        ) : (
                          <IconMagic />
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-white">Nano Banana Processing</h3>
                        <p className="text-sm text-gray-400">
                          Removing "{objectToRemove}" from frames
                          {currentProcessingFrame !== null && ` (Frame ${frames[currentProcessingFrame]?.frameNumber || currentProcessingFrame + 1}/${frames.length})`}
                        </p>
                        {progress > 0 && progress < 50 && (
                          <p className="text-xs text-violet-300 mt-1">
                            {Math.round((progress / 50) * 100)}% of AI processing complete
                          </p>
                        )}
                      </div>
                      {progress >= 50 && (
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                          <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-fuchsia-400"/>
                        </svg>
                      )}
                    </motion.div>

                    {/* Step 3: Frame Interpolation */}
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.2 }}
                      className={`flex items-center gap-4 p-4 rounded-xl border ${
                        progress > 50 
                          ? 'bg-pink-900/20 border-pink-500/30' 
                          : 'bg-gray-900/50 border-gray-700/30'
                      }`}
                    >
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        progress > 50 
                          ? 'bg-gradient-to-br from-pink-500 to-rose-500' 
                          : 'bg-gray-700'
                      }`}>
                        {progress > 50 && progress < 100 ? (
                          <motion.div
                            animate={{ scale: [1, 1.2, 1] }}
                            transition={{ duration: 1, repeat: Infinity }}
                          >
                            <IconInterpolate />
                          </motion.div>
                        ) : (
                          <IconInterpolate />
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-white">FILM Interpolation</h3>
                        <p className="text-sm text-gray-400">Generating smooth transitions between frames</p>
                      </div>
                      {progress >= 100 && (
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                          <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-pink-400"/>
                        </svg>
                      )}
                    </motion.div>
                  </div>

                  {/* Frame Preview Grid - Show more frames */}
                  {frames.length > 0 && (
                    <div className="mt-8">
                      <h3 className="text-lg font-bold text-gray-300 mb-4">Processing Frames ({frames.filter(f => f.status === 'complete').length}/{frames.length} completed)</h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                        {frames.map((frame, index) => (
                          <motion.div
                            key={index}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: Math.min(index * 0.03, 0.5) }}
                            className="relative aspect-video rounded-lg overflow-hidden border border-violet-500/30"
                          >
                            {/* Before/After View */}
                            <div className="relative w-full h-full">
                              {frame.processedDataUrl ? (
                                <>
                                  <img 
                                    src={frame.originalDataUrl} 
                                    alt={`Original frame ${index}`}
                                    className="absolute inset-0 w-full h-full object-cover"
                                    style={{ clipPath: 'polygon(0 0, 50% 0, 50% 100%, 0 100%)' }}
                                  />
                                  <img 
                                    src={frame.processedDataUrl} 
                                    alt={`Processed frame ${index}`}
                                    className="absolute inset-0 w-full h-full object-cover"
                                    style={{ clipPath: 'polygon(50% 0, 100% 0, 100% 100%, 50% 100%)' }}
                                  />
                                  <div className="absolute inset-x-0 top-0 h-full w-px bg-white/50 left-1/2 transform -translate-x-1/2" />
                                </>
                              ) : (
                                <img 
                                  src={frame.originalDataUrl} 
                                  alt={`Original frame ${index}`}
                                  className={`w-full h-full object-cover ${frame.status === 'pending' ? 'opacity-50' : ''}`}
                                />
                              )}
                            </div>
                            
                            {/* Status overlay */}
                            <div className={`absolute inset-0 flex items-center justify-center pointer-events-none ${
                              frame.status === 'processing' ? 'bg-violet-900/30' :
                              frame.status === 'complete' ? '' :
                              frame.status === 'error' ? 'bg-red-900/50' :
                              'bg-gray-900/30'
                            }`}>
                              {frame.status === 'processing' && (
                                <motion.div
                                  animate={{ rotate: 360 }}
                                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                  className="bg-black/50 rounded-full p-2"
                                >
                                  <IconMagic />
                                </motion.div>
                              )}
                              {frame.status === 'complete' && (
                                <div className="absolute bottom-1 right-1 bg-green-500/90 rounded-full p-1">
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                                    <path d="M20 6L9 17L4 12" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                                  </svg>
                                </div>
                              )}
                              {frame.status === 'error' && (
                                <div className="absolute bottom-1 right-1 bg-red-500/90 rounded-full p-1">
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                                    <path d="M18 6L6 18M6 6L18 18" stroke="white" strokeWidth="3" strokeLinecap="round"/>
                                  </svg>
                                </div>
                              )}
                            </div>
                            
                            {/* Frame number label */}
                            <div className="absolute top-1 left-1 bg-black/70 px-1.5 py-0.5 rounded text-xs text-white font-mono">
                              #{frame.frameNumber}
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}

          {currentStep === 'complete' && (
            <motion.div
              key="complete"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="max-w-6xl mx-auto space-y-8"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", duration: 0.5 }}
                className="text-center mb-8"
              >
                <div className="inline-flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-emerald-500/20 to-green-500/20 rounded-2xl border border-emerald-500/30">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <motion.path 
                      d="M12 2L15 9L22 10L17 15L18 22L12 18L6 22L7 15L2 10L9 9L12 2Z" 
                      fill="currentColor" 
                      className="text-emerald-400"
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ delay: 0.2 }}
                    />
                  </svg>
                  <span className="text-emerald-300 font-bold text-lg">Processing Complete!</span>
                </div>
              </motion.div>

              {finalVideoUrl && (
                <div className="relative">
                  <div className="absolute -inset-2 bg-gradient-to-r from-emerald-500/20 to-green-500/20 rounded-3xl blur-xl"></div>
                  <div className="relative bg-gradient-to-br from-gray-900/95 to-emerald-900/20 rounded-3xl p-8 border border-emerald-500/30">
                    <h3 className="text-2xl font-bold text-white mb-6 text-center">Your Processed Video</h3>
                    
                    <video 
                      src={finalVideoUrl} 
                      controls 
                      className="w-full max-w-2xl mx-auto rounded-xl border border-emerald-500/30 mb-6"
                    />

                    <div className="flex justify-center gap-4">
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                          const a = document.createElement('a');
                          a.href = finalVideoUrl;
                          a.download = `${videoFile?.name.replace(/\.[^/.]+$/, '')}_no_${objectToRemove.replace(/\s+/g, '_')}.mp4`;
                          a.click();
                        }}
                        className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-green-500 text-white font-bold rounded-xl"
                      >
                        Download Video
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={reset}
                        className="px-6 py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold rounded-xl transition-colors"
                      >
                        Process Another Video
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setShowFrameSidebar(true)}
                        className="px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl transition-colors"
                      >
                        All Frames
                      </motion.button>
                    </div>
                  </div>
                </div>
              )}

              {/* Show processed frames */}
              {frames.filter(f => f.processedDataUrl).length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="relative"
                >
                  <div className="absolute -inset-2 bg-gradient-to-r from-violet-500/10 to-fuchsia-500/10 rounded-3xl blur-xl"></div>
                  <div className="relative bg-gradient-to-br from-gray-900/95 to-violet-900/20 rounded-3xl p-8 border border-violet-500/30">
                    <h3 className="text-xl font-bold text-white mb-6">Processed Frames ({frames.filter(f => f.processedDataUrl).length} frames)</h3>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                      {frames.filter(f => f.processedDataUrl).map((frame, index) => (
                        <motion.div
                          key={frame.frameNumber}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: index * 0.03 }}
                          className="relative aspect-video rounded-lg overflow-hidden border border-violet-500/30"
                        >
                          <div className="relative w-full h-full">
                            <img 
                              src={frame.originalDataUrl} 
                              alt={`Original frame ${frame.frameNumber}`}
                              className="absolute inset-0 w-full h-full object-cover"
                              style={{ clipPath: 'polygon(0 0, 50% 0, 50% 100%, 0 100%)' }}
                            />
                            <img 
                              src={frame.processedDataUrl} 
                              alt={`Processed frame ${frame.frameNumber}`}
                              className="absolute inset-0 w-full h-full object-cover"
                              style={{ clipPath: 'polygon(50% 0, 100% 0, 100% 100%, 50% 100%)' }}
                            />
                            <div className="absolute inset-x-0 top-0 h-full w-px bg-white/50 left-1/2 transform -translate-x-1/2" />
                          </div>
                          <div className="absolute bottom-1 left-1 bg-black/70 px-1.5 py-0.5 rounded text-xs text-white font-mono">
                            #{frame.frameNumber}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 bg-red-900/20 rounded-xl border border-red-500/30"
                >
                  <p className="text-red-300">{error}</p>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      {/* Frame Sidebar */}
      {showFrameSidebar && (
        <motion.div 
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'tween', duration: 0.3 }}
          className="fixed inset-y-0 right-0 w-96 bg-gray-900 border-l border-gray-700 shadow-xl z-50 overflow-y-auto"
        >
          <div className="sticky top-0 bg-gray-900 border-b border-gray-700 p-4 flex justify-between items-center">
            <h3 className="text-xl font-bold text-white">All Frames ({allFrames.length})</h3>
            <button
              onClick={() => setShowFrameSidebar(false)}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
          
          <div className="p-4 space-y-4">
            <div className="flex gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-emerald-500 rounded"></div>
                <span className="text-gray-300">Edited Frames ({allFrames.filter(f => f.type === 'edited').length})</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-purple-500 rounded"></div>
                <span className="text-gray-300">Interpolated ({allFrames.filter(f => f.type === 'interpolated').length})</span>
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-2">
              {allFrames.map((frame, idx) => (
                <div key={idx} className="relative group">
                  <img 
                    src={frame.url} 
                    alt={`Frame ${frame.index}`}
                    className={`w-full h-auto rounded border-2 ${
                      frame.type === 'edited' ? 'border-emerald-500' : 'border-purple-500'
                    }`}
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-xs text-white p-1 text-center">
                    #{frame.index}
                  </div>
                  <div className={`absolute top-1 right-1 w-2 h-2 rounded-full ${
                    frame.type === 'edited' ? 'bg-emerald-500' : 'bg-purple-500'
                  }`}></div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* Hardware Speed Notice */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.7 }}
        transition={{ delay: 1 }}
        className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-10 pointer-events-none"
      >
        <p className="text-neutral-400/70 text-sm text-center px-4 py-2 bg-black/50 backdrop-blur-sm rounded-full border border-neutral-800/50">
          Generation speed depends on your hardware capabilities
        </p>
      </motion.div>
    </div>
  );
}

export default VideoObjectRemoverPage;
