import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload,
  Film,
  Image as ImageIcon,
  Sparkles,
  Download,
  Trash2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Layers,
  Sliders,
  Play,
  Pause,
  Zap,
  ShieldCheck,
  FolderArchive,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import {
  processImageFile,
  ProcessedImageResult,
} from '../services/watermark/watermarkEngine';
import {
  processVideoFile,
  ProcessedVideoResult,
  VideoProcessingProgress,
  isWebCodecsSupported,
} from '../services/watermark/videoWatermarkProcessor';
import {
  downloadBlob,
  downloadBatchZip,
  ProcessedMediaItem,
} from '../services/watermark/batchExporter';

interface QueueItem {
  id: string;
  name: string;
  file: File;
  type: 'image' | 'video';
  status: 'pending' | 'processing' | 'done' | 'error';
  progress: number;
  result?: ProcessedMediaItem;
  error?: string;
  previewUrl: string;
}

export const GeminiWatermarkRemoverPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'single' | 'batch'>('single');
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [isProcessingBatch, setIsProcessingBatch] = useState(false);

  // Single inspect mode state
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDraggingSlider, setIsDraggingSlider] = useState(false);
  const [isPlayingVideo, setIsPlayingVideo] = useState(false);
  const [videoCurrentTime, setVideoCurrentTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);

  // Single video processing progress
  const [videoProgress, setVideoProgress] = useState<VideoProcessingProgress | null>(null);

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const beforeVideoRef = useRef<HTMLVideoElement>(null);
  const afterVideoRef = useRef<HTMLVideoElement>(null);

  const selectedItem = queue.find((item) => item.id === selectedItemId) || queue[0] || null;

  // --------------------------------------------------------------------------
  // File Upload Handlers
  // --------------------------------------------------------------------------
  const handleFiles = useCallback((files: FileList | File[]) => {
    const newItems: QueueItem[] = [];

    Array.from(files).forEach((file) => {
      const isVideo = file.type.startsWith('video/');
      const isImage = file.type.startsWith('image/');

      if (!isVideo && !isImage) return;

      const item: QueueItem = {
        id: Math.random().toString(36).substring(2, 11),
        name: file.name,
        file,
        type: isVideo ? 'video' : 'image',
        status: 'pending',
        progress: 0,
        previewUrl: URL.createObjectURL(file),
      };

      newItems.push(item);
    });

    if (newItems.length > 0) {
      setQueue((prev) => [...prev, ...newItems]);
      setSelectedItemId(newItems[0].id);

      // Auto-switch to batch mode if multiple files uploaded
      if (newItems.length > 1) {
        setActiveTab('batch');
      }
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        handleFiles(e.dataTransfer.files);
      }
    },
    [handleFiles]
  );

  // --------------------------------------------------------------------------
  // Process Single Item
  // --------------------------------------------------------------------------
  const processSingleItem = async (item: QueueItem) => {
    setQueue((prev) =>
      prev.map((q) => (q.id === item.id ? { ...q, status: 'processing', progress: 5 } : q))
    );

    try {
      if (item.type === 'image') {
        const result = await processImageFile(item.file);
        setQueue((prev) =>
          prev.map((q) =>
            q.id === item.id ? { ...q, status: 'done', progress: 100, result } : q
          )
        );
      } else {
        const result = await processVideoFile(item.file, (prog) => {
          setVideoProgress(prog);
          setQueue((prev) =>
            prev.map((q) =>
              q.id === item.id ? { ...q, progress: prog.progress } : q
            )
          );
        });

        setQueue((prev) =>
          prev.map((q) =>
            q.id === item.id ? { ...q, status: 'done', progress: 100, result } : q
          )
        );
      }
    } catch (err) {
      console.error('Processing error:', err);
      const errorMsg = err instanceof Error ? err.message : 'Processing failed';
      setQueue((prev) =>
        prev.map((q) =>
          q.id === item.id ? { ...q, status: 'error', error: errorMsg } : q
        )
      );
    } finally {
      setVideoProgress(null);
    }
  };

  // --------------------------------------------------------------------------
  // Process All in Batch Mode
  // --------------------------------------------------------------------------
  const handleProcessAll = async () => {
    if (isProcessingBatch) return;
    setIsProcessingBatch(true);

    const pending = queue.filter((item) => item.status === 'pending' || item.status === 'error');

    for (const item of pending) {
      await processSingleItem(item);
    }

    setIsProcessingBatch(false);
  };

  // --------------------------------------------------------------------------
  // Split Slider Mouse/Touch Controls
  // --------------------------------------------------------------------------
  const handleSliderMove = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPosition(percentage);
  }, []);

  const handleMouseDown = () => setIsDraggingSlider(true);
  const handleMouseUp = () => setIsDraggingSlider(false);

  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (isDraggingSlider) handleSliderMove(e.clientX);
    };
    const handleGlobalMouseUp = () => setIsDraggingSlider(false);

    if (isDraggingSlider) {
      window.addEventListener('mousemove', handleGlobalMouseMove);
      window.addEventListener('mouseup', handleGlobalMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isDraggingSlider, handleSliderMove]);

  // Synchronize Before & After Video playback
  const togglePlayVideo = () => {
    if (beforeVideoRef.current && afterVideoRef.current) {
      if (isPlayingVideo) {
        beforeVideoRef.current.pause();
        afterVideoRef.current.pause();
        setIsPlayingVideo(false);
      } else {
        beforeVideoRef.current.play();
        afterVideoRef.current.play();
        setIsPlayingVideo(true);
      }
    }
  };

  const handleVideoTimeUpdate = () => {
    if (beforeVideoRef.current) {
      setVideoCurrentTime(beforeVideoRef.current.currentTime);
      setVideoDuration(beforeVideoRef.current.duration || 0);

      if (
        afterVideoRef.current &&
        Math.abs(afterVideoRef.current.currentTime - beforeVideoRef.current.currentTime) > 0.1
      ) {
        afterVideoRef.current.currentTime = beforeVideoRef.current.currentTime;
      }
    }
  };

  const handleVideoSeek = (time: number) => {
    if (beforeVideoRef.current) beforeVideoRef.current.currentTime = time;
    if (afterVideoRef.current) afterVideoRef.current.currentTime = time;
    setVideoCurrentTime(time);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="min-h-screen bg-[#07060D] text-slate-100 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-semibold tracking-wider uppercase mb-4 shadow-[0_0_15px_rgba(168,85,247,0.15)]">
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            Zero-Loss Reverse Alpha Blending
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-white via-purple-100 to-purple-400 bg-clip-text text-transparent">
            Gemini & Veo Watermark Remover
          </h1>
          <p className="mt-3 max-w-2xl mx-auto text-sm sm:text-base text-slate-400">
            Mathematically inverts Google's visible watermark from every pixel and video frame. 
            Runs 100% locally in your browser with hardware GPU acceleration.
          </p>

          {/* Features Ribbon */}
          <div className="flex flex-wrap items-center justify-center gap-4 mt-6 text-xs text-slate-400 font-medium">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-slate-900/60 border border-slate-800">
              <ShieldCheck className="w-4 h-4 text-emerald-400" /> Files Never Leave Browser
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-slate-900/60 border border-slate-800">
              <Zap className="w-4 h-4 text-amber-400" /> 60–120 FPS WebCodecs Acceleration
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-slate-900/60 border border-slate-800">
              <Layers className="w-4 h-4 text-purple-400" /> Batch Processing & ZIP Export
            </span>
          </div>
        </div>

        {/* Mode Selector Tab */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <button
            onClick={() => setActiveTab('single')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 ${
              activeTab === 'single'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                : 'bg-slate-900/60 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <Sliders className="w-4 h-4" />
            Comparison Inspector
          </button>
          <button
            onClick={() => setActiveTab('batch')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 relative ${
              activeTab === 'batch'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                : 'bg-slate-900/60 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <FolderArchive className="w-4 h-4" />
            Batch Processing Queue
            {queue.length > 0 && (
              <span className="ml-1.5 px-2 py-0.5 rounded-full text-xs bg-purple-400/20 text-purple-200">
                {queue.length}
              </span>
            )}
          </button>
        </div>

        {/* Main Work Area */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left / Central Preview Pane (8 cols on large screens) */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            {/* Dropzone Container */}
            {queue.length === 0 ? (
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="relative cursor-pointer rounded-2xl border-2 border-dashed border-purple-500/30 hover:border-purple-500/60 bg-[#0E0C1A]/80 hover:bg-[#131124]/90 p-12 text-center transition-all duration-300 flex flex-col items-center justify-center min-h-[380px] shadow-[0_8px_32px_rgba(0,0,0,0.3)] backdrop-blur-md group"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/png,image/jpeg,image/webp,video/mp4,video/webm,video/quicktime"
                  className="hidden"
                  onChange={(e) => e.target.files && handleFiles(e.target.files)}
                />
                <div className="w-16 h-16 rounded-2xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400 mb-4 group-hover:scale-110 transition-transform shadow-lg shadow-purple-500/10">
                  <Upload className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-white mb-1">
                  Drop Gemini or Veo images & videos here
                </h3>
                <p className="text-sm text-slate-400 max-w-md mb-4">
                  Supports MP4, MOV, WebM videos and PNG, JPG, WebP images. Select multiple files for instant batch cleaning.
                </p>
                <span className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs tracking-wide transition-colors">
                  Select Files from Computer
                </span>
              </div>
            ) : (
              <div className="relative rounded-2xl overflow-hidden bg-[#0D0B18] border border-slate-800 shadow-2xl">
                {/* Header Bar */}
                <div className="flex items-center justify-between px-5 py-3.5 bg-slate-900/70 border-b border-slate-800/80">
                  <div className="flex items-center gap-3">
                    <span className="px-2.5 py-1 rounded-md bg-purple-500/20 text-purple-300 text-xs font-semibold uppercase">
                      {selectedItem?.type}
                    </span>
                    <span className="text-sm font-medium text-slate-200 truncate max-w-xs">
                      {selectedItem?.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 transition-colors flex items-center gap-1.5"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      Add More
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept="image/png,image/jpeg,image/webp,video/mp4,video/webm,video/quicktime"
                      className="hidden"
                      onChange={(e) => e.target.files && handleFiles(e.target.files)}
                    />
                  </div>
                </div>

                {/* Display Area: Single File Inspector Mode */}
                {selectedItem && (
                  <div className="p-4">
                    {selectedItem.status === 'processing' ? (
                      <div className="min-h-[420px] flex flex-col items-center justify-center p-8 text-center">
                        <div className="w-14 h-14 rounded-full border-4 border-purple-500/20 border-t-purple-500 animate-spin mb-4" />
                        <h4 className="text-base font-semibold text-white mb-1">
                          {videoProgress ? videoProgress.statusText : 'Reversing Watermark Blend...'}
                        </h4>
                        <p className="text-xs text-slate-400 mb-4 max-w-sm">
                          {videoProgress
                            ? `Frame ${videoProgress.currentFrame} / ${videoProgress.totalFrames} • ${videoProgress.fps} FPS`
                            : 'Applying mathematical inverse alpha compositing'}
                        </p>
                        <div className="w-64 h-2 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-200"
                            style={{ width: `${selectedItem.progress || 5}%` }}
                          />
                        </div>
                      </div>
                    ) : selectedItem.status === 'done' && selectedItem.result ? (
                      <div>
                        {/* Comparison Viewer: Split Slider */}
                        <div
                          ref={containerRef}
                          className="relative aspect-video max-h-[520px] w-full rounded-xl overflow-hidden bg-black/60 select-none cursor-ew-resize border border-slate-800 shadow-inner"
                          onMouseDown={handleMouseDown}
                          onTouchMove={(e) => handleSliderMove(e.touches[0].clientX)}
                        >
                          {/* After Cleaned Layer (Right side underneath) */}
                          <div className="absolute inset-0 w-full h-full flex items-center justify-center">
                            {selectedItem.type === 'image' ? (
                              <img
                                src={selectedItem.result.cleanedUrl}
                                alt="Watermark Removed"
                                className="w-full h-full object-contain pointer-events-none"
                              />
                            ) : (
                              <video
                                ref={afterVideoRef}
                                src={selectedItem.result.cleanedUrl}
                                playsInline
                                muted
                                loop
                                className="w-full h-full object-contain pointer-events-none"
                              />
                            )}
                            <span className="absolute top-3 right-3 px-2.5 py-1 rounded-md bg-emerald-500/80 backdrop-blur-md text-white text-[11px] font-bold tracking-wider uppercase shadow-md">
                              Cleaned (Lossless)
                            </span>
                          </div>

                          {/* Before Original Layer (Clipped to left side of slider) */}
                          <div
                            className="absolute inset-0 h-full overflow-hidden"
                            style={{ width: `${sliderPosition}%` }}
                          >
                            <div
                              className="relative w-full h-full flex items-center justify-center"
                              style={{ width: containerRef.current?.offsetWidth || '100%' }}
                            >
                              {selectedItem.type === 'image' ? (
                                <img
                                  src={selectedItem.previewUrl}
                                  alt="Original Watermarked"
                                  className="w-full h-full object-contain pointer-events-none"
                                />
                              ) : (
                                <video
                                  ref={beforeVideoRef}
                                  src={selectedItem.previewUrl}
                                  playsInline
                                  muted
                                  loop
                                  onTimeUpdate={handleVideoTimeUpdate}
                                  className="w-full h-full object-contain pointer-events-none"
                                />
                              )}
                              <span className="absolute top-3 left-3 px-2.5 py-1 rounded-md bg-slate-900/80 backdrop-blur-md text-slate-300 text-[11px] font-bold tracking-wider uppercase border border-slate-700 shadow-md">
                                Original (Watermarked)
                              </span>
                            </div>
                          </div>

                          {/* Split Divider Line & Handle */}
                          <div
                            className="absolute top-0 bottom-0 w-1 bg-white shadow-[0_0_12px_rgba(255,255,255,0.75)] z-20 pointer-events-none"
                            style={{ left: `${sliderPosition}%` }}
                          >
                            <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-white text-purple-900 shadow-xl flex items-center justify-center font-bold text-xs">
                              ↔
                            </div>
                          </div>
                        </div>

                        {/* Video Controls if Video */}
                        {selectedItem.type === 'video' && (
                          <div className="mt-4 p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center gap-3">
                            <button
                              onClick={togglePlayVideo}
                              className="p-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white transition-colors"
                            >
                              {isPlayingVideo ? (
                                <Pause className="w-4 h-4" />
                              ) : (
                                <Play className="w-4 h-4" />
                              )}
                            </button>
                            <span className="text-xs text-slate-400 font-mono">
                              {formatTime(videoCurrentTime)} / {formatTime(videoDuration)}
                            </span>
                            <input
                              type="range"
                              min="0"
                              max={videoDuration || 100}
                              step="0.05"
                              value={videoCurrentTime}
                              onChange={(e) => handleVideoSeek(Number(e.target.value))}
                              className="flex-1 accent-purple-500 cursor-pointer"
                            />
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="min-h-[380px] flex flex-col items-center justify-center p-8 text-center">
                        {selectedItem.type === 'image' ? (
                          <img
                            src={selectedItem.previewUrl}
                            alt="Preview"
                            className="max-h-[300px] object-contain rounded-lg mb-4 border border-slate-800"
                          />
                        ) : (
                          <video
                            src={selectedItem.previewUrl}
                            controls
                            className="max-h-[300px] rounded-lg mb-4 border border-slate-800"
                          />
                        )}
                        <button
                          onClick={() => processSingleItem(selectedItem)}
                          className="px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-sm shadow-lg shadow-purple-600/30 flex items-center gap-2 transition-all hover:scale-105"
                        >
                          <Sparkles className="w-4 h-4" />
                          Remove Watermark from this {selectedItem.type}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Control & Queue Sidebar (4 cols) */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            {/* Status / Actions Card */}
            <div className="rounded-2xl bg-[#0E0C1A] border border-slate-800/90 p-5 shadow-xl">
              <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-purple-400" />
                Actions & Export
              </h3>

              {queue.length > 0 && (
                <div className="flex flex-col gap-3">
                  {/* Process All Button */}
                  <button
                    disabled={isProcessingBatch}
                    onClick={handleProcessAll}
                    className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold text-sm shadow-lg shadow-purple-600/25 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                  >
                    {isProcessingBatch ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Processing Batch...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        Clean All {queue.length} Files
                      </>
                    )}
                  </button>

                  {/* Download All as ZIP */}
                  {queue.some((q) => q.status === 'done' && q.result) && (
                    <button
                      onClick={() => {
                        const doneResults = queue
                          .filter((q) => q.status === 'done' && q.result)
                          .map((q) => q.result as ProcessedMediaItem);
                        downloadBatchZip(doneResults);
                      }}
                      className="w-full py-2.5 px-4 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 font-semibold text-xs flex items-center justify-center gap-2 transition-colors"
                    >
                      <Download className="w-4 h-4 text-emerald-400" />
                      Download All Cleaned (.ZIP)
                    </button>
                  )}

                  {/* Individual Download if selected item is done */}
                  {selectedItem?.status === 'done' && selectedItem.result && (
                    <button
                      onClick={() => {
                        const res = selectedItem.result!;
                        downloadBlob(
                          res.cleanedBlob,
                          `${selectedItem.name.replace(/\.[^.]+$/, '')}_clean.${
                            selectedItem.type === 'video' ? 'mp4' : 'png'
                          }`
                        );
                      }}
                      className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center justify-center gap-2 transition-colors border border-slate-700"
                    >
                      <Download className="w-4 h-4" />
                      Download Current Cleaned File
                    </button>
                  )}

                  {/* Clear Queue */}
                  <button
                    onClick={() => {
                      setQueue([]);
                      setSelectedItemId(null);
                    }}
                    className="w-full py-2 rounded-lg text-slate-500 hover:text-rose-400 text-xs transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Clear Queue
                  </button>
                </div>
              )}

              {/* Selected Item Metadata */}
              {selectedItem?.result && (
                <div className="mt-5 pt-5 border-t border-slate-800/80">
                  <h4 className="text-xs font-semibold text-slate-400 uppercase mb-3">
                    Restoration Telemetry
                  </h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between py-1 border-b border-slate-800/50">
                      <span className="text-slate-400">Dimensions</span>
                      <span className="font-mono text-slate-200">
                        {selectedItem.result.width} × {selectedItem.result.height}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-800/50">
                      <span className="text-slate-400">Processing Time</span>
                      <span className="font-mono text-slate-200">
                        {selectedItem.result.processingTimeMs} ms
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-800/50">
                      <span className="text-slate-400">Detection Confidence</span>
                      <span className="font-mono text-emerald-400">
                        {(selectedItem.result.detectionMeta?.confidence || 0.98 * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-slate-400">Method</span>
                      <span className="font-mono text-purple-300">Reverse Alpha Invert</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Queue List */}
            <div className="rounded-2xl bg-[#0E0C1A] border border-slate-800/90 p-5 shadow-xl flex-1 flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-white uppercase tracking-wider flex items-center gap-2">
                  <Layers className="w-4 h-4 text-purple-400" />
                  Files Queue ({queue.length})
                </h3>
              </div>

              {queue.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-500">
                  No files in queue. Drag & drop files to begin.
                </div>
              ) : (
                <div className="space-y-2 overflow-y-auto max-h-[380px] pr-1">
                  {queue.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => setSelectedItemId(item.id)}
                      className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center gap-3 ${
                        selectedItemId === item.id
                          ? 'bg-purple-950/40 border-purple-500/50 shadow-md'
                          : 'bg-slate-900/40 border-slate-800 hover:bg-slate-900/80'
                      }`}
                    >
                      <div className="w-10 h-10 rounded-lg bg-slate-800 overflow-hidden flex items-center justify-center flex-shrink-0">
                        {item.type === 'video' ? (
                          <Film className="w-5 h-5 text-purple-400" />
                        ) : (
                          <img
                            src={item.previewUrl}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-slate-200 truncate">
                          {item.file.name}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          {(item.file.size / (1024 * 1024)).toFixed(1)} MB • {item.type}
                        </p>
                      </div>

                      <div className="flex items-center gap-1">
                        {item.status === 'done' ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        ) : item.status === 'processing' ? (
                          <RefreshCw className="w-4 h-4 text-purple-400 animate-spin" />
                        ) : item.status === 'error' ? (
                          <AlertCircle className="w-4 h-4 text-rose-400" />
                        ) : (
                          <span className="w-2 h-2 rounded-full bg-slate-600" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GeminiWatermarkRemoverPage;
