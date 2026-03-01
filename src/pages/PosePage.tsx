import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Header from '../components/Header';
import Footer from '../components/Footer';
import AnimatedPage from '../components/AnimatedPage';

interface Keypoint { x: number; y: number; score: number | undefined; name?: string; }

const POSE_CONNECTIONS: [number, number][] = [
  [5, 7], [7, 9], // left arm
  [6, 8], [8, 10], // right arm
  [5, 6], // shoulders
  [5, 11], [6, 12], // torso
  [11, 13], [13, 15], // left leg
  [12, 14], [14, 16], // right leg
  [11, 12], // hips
];

const PosePage = () => {
  const [uiState, setUiState] = useState<'idle' | 'loading_model' | 'processing' | 'output' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const [originalPreview, setOriginalPreview] = useState<string | null>(null);
  const originalPreviewRef = useRef<string | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    workerRef.current = new Worker(new URL('../workers/pose.worker.ts', import.meta.url), { type: 'module' });

    workerRef.current.onmessage = (e: MessageEvent) => {
      const { status, error, poses: workerPoses } = e.data;
      switch (status) {
        case 'loading_model':
          setUiState('loading_model');
          break;
        case 'model_ready':
          setUiState('idle');
          break;
        case 'processing':
          setUiState('processing');
          break;
        case 'complete':
          const previewSrc = originalPreviewRef.current;
          if (!previewSrc) return;
          createPreviewURLs(previewSrc, workerPoses).then(({overlay, skeleton}) => {
            navigate('/pose-estimation/results', {
              state: {
                image: previewSrc,
                overlay,
                skeleton,
                poses: workerPoses,
              }
            });
          });
          break;
        case 'error':
          setUiState('error');
          setErrorMessage(error);
          break;
      }
    };

    return () => {
      workerRef.current?.terminate();
    };
  }, [navigate]);

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, img.width, img.height);
        workerRef.current?.postMessage({ command: 'estimate', imageData });
      };
      img.src = ev.target?.result as string;
      const dataUrl = ev.target?.result as string;
      setOriginalPreview(dataUrl);
      originalPreviewRef.current = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  const drawSkeleton = (ctx: CanvasRenderingContext2D, keypoints: Keypoint[]) => {
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#3B82F6';
    // draw joints
    keypoints.forEach(kp => {
      if ((kp.score ?? 0) > 0.3) {
        ctx.beginPath();
        ctx.arc(kp.x, kp.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#34d399';
        ctx.fill();
      }
    });

    // draw limbs
    POSE_CONNECTIONS.forEach(([i, j]) => {
      const kp1 = keypoints[i];
      const kp2 = keypoints[j];
      if (kp1 && kp2 && (kp1.score ?? 0) > 0.3 && (kp2.score ?? 0) > 0.3) {
        ctx.beginPath();
        ctx.moveTo(kp1.x, kp1.y);
        ctx.lineTo(kp2.x, kp2.y);
        ctx.stroke();
      }
    });
  };

  const createPreviewURLs = (imgSrc: string, detectedPoses: any[]) : Promise<{overlay: string; skeleton: string;}> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const { width, height } = img;

        // Overlay canvas
        const overlayCanvas = document.createElement('canvas');
        overlayCanvas.width = width;
        overlayCanvas.height = height;
        const overlayCtx = overlayCanvas.getContext('2d')!;
        overlayCtx.drawImage(img, 0, 0);
        detectedPoses.forEach((p) => drawSkeleton(overlayCtx, p.keypoints));
        const overlayURL = overlayCanvas.toDataURL('image/png');

        // Skeleton-only canvas
        const skeletonCanvas = document.createElement('canvas');
        skeletonCanvas.width = width;
        skeletonCanvas.height = height;
        const skeletonCtx = skeletonCanvas.getContext('2d')!;
        skeletonCtx.fillStyle = 'black';
        skeletonCtx.fillRect(0, 0, width, height);
        detectedPoses.forEach((p) => drawSkeleton(skeletonCtx, p.keypoints));
        const skeletonURL = skeletonCanvas.toDataURL('image/png');

        resolve({ overlay: overlayURL, skeleton: skeletonURL });
      };
      img.src = imgSrc;
    });
  };

  const handleUpload = (file: File) => {
    setUiState('processing');
    handleFile(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleUpload(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const isDisabled = uiState === 'loading_model' || uiState === 'processing';

  return (
    <AnimatedPage>
      <div className="relative flex min-h-screen flex-col bg-gray-950 text-white">
        <Header />
        
        <main className="px-4 sm:px-6 lg:px-8 flex flex-1 justify-center py-12">
          <div className="flex flex-col items-center max-w-4xl flex-1 w-full">
            <motion.div 
              className="text-center mb-12"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                Pose Estimation
              </h2>
              <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto">
                Detect and analyze human poses in images using advanced AI. Supports multiple people and provides detailed keypoint data.
              </p>
            </motion.div>

            <motion.div 
              className="w-full bg-gray-900/50 backdrop-blur-sm rounded-2xl shadow-2xl border border-gray-800 p-8 space-y-8"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
                <div>
                <label className="block text-sm font-semibold text-gray-300 mb-4" htmlFor="pose-file-upload">
                  Upload Image for Pose Detection
                </label>
                <div 
                  className="relative group flex justify-center px-6 pt-8 pb-10 border-2 border-dashed border-gray-600 rounded-xl hover:border-blue-400 hover:bg-gray-800/50 transition-all duration-300 cursor-pointer"
                  onDragOver={handleDragOver} 
                  onDrop={handleDrop}
                >
                  <div className="space-y-4 text-center">
                    <motion.div
                      className="mx-auto w-16 h-16 rounded-full bg-gradient-to-r from-blue-500/20 to-purple-500/20 flex items-center justify-center"
                      whileHover={{ scale: 1.1, rotate: 5 }}
                      transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    >
                      <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </motion.div>
                    <div className="text-sm text-gray-400">
                      <label htmlFor="pose-file-upload" className="relative cursor-pointer rounded-md font-semibold text-blue-400 hover:text-blue-300 focus-within:outline-none focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-2 focus-within:ring-offset-gray-900 transition-colors">
                          <span>Upload a file</span>
                        <input 
                          id="pose-file-upload" 
                          name="pose-file-upload" 
                          type="file" 
                          className="sr-only" 
                          accept="image/*" 
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              handleUpload(e.target.files[0]);
                            }
                          }} 
                          disabled={isDisabled}
                        />
                        </label>
                      <span className="pl-1">or drag and drop</span>
                    </div>
                    <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
                  </div>
                </div>
                
                {originalPreview && (
                  <motion.div 
                    className="mt-6 rounded-xl overflow-hidden bg-gray-800 p-4"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3 }}
                  >
                    <h3 className="text-lg font-semibold text-white mb-3 flex items-center space-x-2">
                      <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>Image Uploaded - Processing...</span>
                    </h3>
                    <div className="aspect-square bg-gray-700 rounded-lg overflow-hidden max-w-md mx-auto">
                      <img src={originalPreview} alt="preview" className="w-full h-full object-cover" />
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Processing status */}
              {uiState === 'processing' && (
                <motion.div 
                  className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-6"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div className="flex items-center space-x-3">
                    <svg className="w-6 h-6 text-blue-400 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <div>
                      <p className="text-white font-semibold">Analyzing Poses...</p>
                      <p className="text-blue-300 text-sm">Detecting human poses and keypoints using MoveNet Lightning</p>
                    </div>
                  </div>
                </motion.div>
              )}

              {uiState === 'error' && (
                <motion.div 
                  className="bg-red-500/10 border border-red-500/20 rounded-xl p-6"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div className="flex items-center space-x-3 text-red-400">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <p className="font-semibold">Error Processing Image</p>
                      <p className="text-sm">{errorMessage}</p>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Features */}
              <motion.div 
                className="bg-gray-800/30 rounded-xl p-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
              >
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
                  <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <span>Features</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    <span className="text-gray-300">Multi-person detection</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                    <span className="text-gray-300">17 keypoint detection</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                    <span className="text-gray-300">Real-time processing</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                    <span className="text-gray-300">JSON export available</span>
                  </div>
                </div>
              </motion.div>

              {/* Reset button for error state */}
              {uiState === 'error' && (
                <motion.button 
                  onClick={() => {
                    setUiState('idle');
                    setErrorMessage('');
                    setOriginalPreview(null);
                    originalPreviewRef.current = null;
                  }}
                  className="w-full flex items-center justify-center space-x-2 px-6 py-3 rounded-xl text-base font-medium text-blue-400 hover:text-blue-300 hover:bg-blue-400/10 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900 transition-all duration-300 border border-blue-400/30 hover:border-blue-400/50"
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>Try Again</span>
                </motion.button>
              )}
            </motion.div>
          </div>
        </main>

        {/* Loading status overlay */}
        {uiState === 'loading_model' && (
          <motion.div 
            className="fixed bottom-8 left-1/2 transform -translate-x-1/2 bg-gray-900/90 backdrop-blur-sm border border-gray-700 rounded-xl p-6 shadow-2xl z-50 min-w-[300px]"
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
          >
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <svg className="w-5 h-5 text-blue-400 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span className="font-medium text-white">Loading MoveNet Model...</span>
              </div>
              <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
                <div className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-300 ease-out animate-pulse w-full" />
              </div>
            </div>
          </motion.div>
        )}

        <Footer />
      </div>
    </AnimatedPage>
  );
};

export default PosePage; 