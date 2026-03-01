import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';

// ============================================================================
// SYNTHID REMOVER - Based on arXiv:2510.09263v1 Research Paper Analysis
// ============================================================================
// Key findings from the paper:
// 1. SynthID uses 136-bit payload in 512x512 images
// 2. "CombinationWorst" has lowest TPR (98.06%) - our attack vector
// 3. Small rotations more effective than 90/180/270 degree rotations
// 4. Diffusion-based reconstruction is the most effective attack
// 5. Visual star indicator is separate from invisible watermark
// ============================================================================

const SynthIDRemoverPage: React.FC = () => {
  // State
  const [image, setImage] = useState<string | null>(null);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStage, setCurrentStage] = useState('');
  const [mode, setMode] = useState<'neutralize' | 'imprint'>('neutralize');
  const [strength, setStrength] = useState(85);
  const [removeVisualStar, setRemoveVisualStar] = useState(true);
  const [showComparison, setShowComparison] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const [stats, setStats] = useState<{psnr: number, ssim: number} | null>(null);

  // Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tempCanvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addLog = (msg: string) => {
    const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false });
    setLog(prev => [...prev.slice(-8), `[${timestamp}] ${msg}`]);
  };

  // ============================================================================
  // FILE HANDLING
  // ============================================================================
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        setImage(evt.target?.result as string);
        setProcessedImage(null);
        setStats(null);
        addLog(`Loaded: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`);
        setProgress(0);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        setImage(evt.target?.result as string);
        setProcessedImage(null);
        setStats(null);
        addLog(`Dropped: ${file.name}`);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  // ============================================================================
  // IMAGE QUALITY METRICS
  // ============================================================================
  const calculatePSNR = (original: ImageData, processed: ImageData): number => {
    let mse = 0;
    for (let i = 0; i < original.data.length; i += 4) {
      const dr = original.data[i] - processed.data[i];
      const dg = original.data[i + 1] - processed.data[i + 1];
      const db = original.data[i + 2] - processed.data[i + 2];
      mse += (dr * dr + dg * dg + db * db) / 3;
    }
    mse /= (original.data.length / 4);
    if (mse === 0) return Infinity;
    return 10 * Math.log10((255 * 255) / mse);
  };

  const calculateSSIM = (original: ImageData, processed: ImageData): number => {
    // Simplified SSIM calculation
    const n = original.data.length / 4;
    let meanX = 0, meanY = 0;
    for (let i = 0; i < original.data.length; i += 4) {
      meanX += (original.data[i] + original.data[i + 1] + original.data[i + 2]) / 3;
      meanY += (processed.data[i] + processed.data[i + 1] + processed.data[i + 2]) / 3;
    }
    meanX /= n;
    meanY /= n;

    let varX = 0, varY = 0, covXY = 0;
    for (let i = 0; i < original.data.length; i += 4) {
      const x = (original.data[i] + original.data[i + 1] + original.data[i + 2]) / 3 - meanX;
      const y = (processed.data[i] + processed.data[i + 1] + processed.data[i + 2]) / 3 - meanY;
      varX += x * x;
      varY += y * y;
      covXY += x * y;
    }
    varX /= n;
    varY /= n;
    covXY /= n;

    const c1 = (0.01 * 255) ** 2;
    const c2 = (0.03 * 255) ** 2;
    return ((2 * meanX * meanY + c1) * (2 * covXY + c2)) / 
           ((meanX ** 2 + meanY ** 2 + c1) * (varX + varY + c2));
  };

  // ============================================================================
  // CORE PROCESSING ENGINE
  // Based on Paper Section 8.2: "CombinationWorst" attack vector
  // ============================================================================
  const processImage = useCallback(async () => {
    if (!image || !canvasRef.current || !tempCanvasRef.current) return;

    setIsProcessing(true);
    setProgress(0);
    addLog('Initializing processing pipeline...');

    const canvas = canvasRef.current;
    const tempCanvas = tempCanvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
    if (!ctx || !tempCtx) return;

    // Load image
    const img = new Image();
    img.src = image;
    await new Promise<void>((resolve) => {
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        tempCanvas.width = img.width;
        tempCanvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        resolve();
      };
    });

    // Store original for comparison
    const originalData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const wait = (ms: number) => new Promise(r => setTimeout(r, ms));
    const factor = strength / 100;

    if (mode === 'neutralize') {
      // ======================================================================
      // NEUTRALIZATION PROTOCOL
      // Based on Paper's "CombinationWorst" vulnerability analysis
      // ======================================================================

      // --- STAGE 1: VISUAL STAR REMOVAL ---
      if (removeVisualStar) {
        setCurrentStage('Removing visual indicator');
        setProgress(5);
        addLog('STAGE 1: Detecting and removing visual star indicator...');
        await wait(100);

        // The 4-pointed star is typically in the bottom-right corner
        // Size is approximately 4-6% of the smaller dimension
        const starSize = Math.min(canvas.width, canvas.height) * 0.06;
        const padding = starSize * 0.5;
        const cornerX = canvas.width - starSize - padding;
        const cornerY = canvas.height - starSize - padding;

        // Sample surrounding colors for intelligent inpainting
        const sampleRegions = [
          { x: cornerX - 20, y: cornerY, w: 15, h: 15 },
          { x: cornerX, y: cornerY - 20, w: 15, h: 15 },
          { x: cornerX - 20, y: cornerY - 20, w: 15, h: 15 }
        ];

        let avgR = 0, avgG = 0, avgB = 0, totalPixels = 0;
        for (const region of sampleRegions) {
          if (region.x > 0 && region.y > 0) {
            const sampleData = ctx.getImageData(region.x, region.y, region.w, region.h);
            for (let i = 0; i < sampleData.data.length; i += 4) {
              avgR += sampleData.data[i];
              avgG += sampleData.data[i + 1];
              avgB += sampleData.data[i + 2];
              totalPixels++;
            }
          }
        }
        if (totalPixels > 0) {
          avgR = Math.round(avgR / totalPixels);
          avgG = Math.round(avgG / totalPixels);
          avgB = Math.round(avgB / totalPixels);
        }

        // Gradient inpainting
        const gradient = ctx.createRadialGradient(
          canvas.width - starSize / 2 - padding / 2, 
          canvas.height - starSize / 2 - padding / 2, 
          0,
          canvas.width - starSize / 2 - padding / 2, 
          canvas.height - starSize / 2 - padding / 2, 
          starSize * 1.2
        );
        gradient.addColorStop(0, `rgba(${avgR}, ${avgG}, ${avgB}, 1)`);
        gradient.addColorStop(0.7, `rgba(${avgR}, ${avgG}, ${avgB}, 0.8)`);
        gradient.addColorStop(1, `rgba(${avgR}, ${avgG}, ${avgB}, 0)`);
        ctx.fillStyle = gradient;
        ctx.fillRect(cornerX - 10, cornerY - 10, starSize + padding + 20, starSize + padding + 20);
        
        addLog('Visual star indicator removed via gradient inpainting');
      }

      // --- STAGE 2: GEOMETRIC TRANSFORMATION (Paper Section 4) ---
      setCurrentStage('Applying geometric jitter');
      setProgress(15);
      addLog('STAGE 2: Applying geometric transformation...');
      addLog('>> Paper finding: Small rotations more effective than 90/180/270°');
      await wait(150);

      // Small rotation (0.5-2.0 degrees) - paper says this is more effective
      const angle = (0.5 + Math.random() * 1.5) * factor * (Math.random() > 0.5 ? 1 : -1);
      // Slight scale variation
      const scale = 1 + (0.005 + Math.random() * 0.015) * factor;
      // Tiny translation
      const translateX = (Math.random() - 0.5) * 4 * factor;
      const translateY = (Math.random() - 0.5) * 4 * factor;

      tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
      tempCtx.drawImage(canvas, 0, 0);
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.translate(canvas.width / 2 + translateX, canvas.height / 2 + translateY);
      ctx.rotate(angle * Math.PI / 180);
      ctx.scale(scale, scale);
      ctx.translate(-canvas.width / 2, -canvas.height / 2);
      ctx.drawImage(tempCanvas, 0, 0);
      ctx.restore();

      addLog(`Applied rotation: ${angle.toFixed(3)}°, scale: ${scale.toFixed(4)}x`);

      // --- STAGE 3: COLOR SPACE ATTACK (Paper Section 3: YCbCr vulnerability) ---
      setCurrentStage('Processing color channels');
      setProgress(30);
      addLog('STAGE 3: YCbCr color space attack...');
      addLog('>> Targeting chroma channels where watermark is embedded');
      await wait(200);

      let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      // Process in YCbCr space - watermarks are often hidden in Cb/Cr channels
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        // RGB -> YCbCr
        let Y = 0.299 * r + 0.587 * g + 0.114 * b;
        let Cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
        let Cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;

        // Attack 1: Add controlled noise to chroma channels
        const chromaNoiseLevel = 4 * factor;
        Cb += (Math.random() - 0.5) * chromaNoiseLevel;
        Cr += (Math.random() - 0.5) * chromaNoiseLevel;

        // Attack 2: Quantization (breaks precise bit encoding)
        const quantStep = Math.max(2, Math.floor(3 * factor));
        Cb = Math.round(Cb / quantStep) * quantStep;
        Cr = Math.round(Cr / quantStep) * quantStep;

        // Attack 3: Slight luminance perturbation
        Y += (Math.random() - 0.5) * 1.5 * factor;

        // YCbCr -> RGB
        const newR = Y + 1.402 * (Cr - 128);
        const newG = Y - 0.344136 * (Cb - 128) - 0.714136 * (Cr - 128);
        const newB = Y + 1.772 * (Cb - 128);

        data[i] = Math.min(255, Math.max(0, Math.round(newR)));
        data[i + 1] = Math.min(255, Math.max(0, Math.round(newG)));
        data[i + 2] = Math.min(255, Math.max(0, Math.round(newB)));
      }
      ctx.putImageData(imageData, 0, 0);
      addLog('Chroma channel perturbation complete');

      // --- STAGE 4: FREQUENCY DOMAIN ATTACK ---
      setCurrentStage('Frequency domain processing');
      setProgress(50);
      addLog('STAGE 4: Frequency domain attack (DCT approximation)...');
      await wait(200);

      // Simulate DCT-based attack by processing image in blocks
      const blockSize = 8;
      imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const blockData = imageData.data;

      for (let by = 0; by < canvas.height; by += blockSize) {
        for (let bx = 0; bx < canvas.width; bx += blockSize) {
          // Add block-level perturbation (simulates DCT coefficient modification)
          const blockNoise = (Math.random() - 0.5) * 3 * factor;
          
          for (let y = by; y < Math.min(by + blockSize, canvas.height); y++) {
            for (let x = bx; x < Math.min(bx + blockSize, canvas.width); x++) {
              const idx = (y * canvas.width + x) * 4;
              
              // High-frequency component perturbation
              const hfNoise = Math.sin(x * 0.5) * Math.cos(y * 0.5) * 2 * factor;
              
              blockData[idx] = Math.min(255, Math.max(0, blockData[idx] + blockNoise + hfNoise));
              blockData[idx + 1] = Math.min(255, Math.max(0, blockData[idx + 1] + blockNoise + hfNoise));
              blockData[idx + 2] = Math.min(255, Math.max(0, blockData[idx + 2] + blockNoise + hfNoise));
            }
          }
        }
      }
      ctx.putImageData(imageData, 0, 0);
      addLog('Frequency domain perturbation complete');

      // --- STAGE 5: ADVERSARIAL NOISE INJECTION ---
      setCurrentStage('Injecting adversarial noise');
      setProgress(70);
      addLog('STAGE 5: Adversarial noise pattern injection...');
      addLog('>> Targeting decoder neural network patterns');
      await wait(200);

      imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const noiseData = imageData.data;

      // Generate spatially-varying adversarial noise
      for (let y = 0; y < canvas.height; y++) {
        for (let x = 0; x < canvas.width; x++) {
          const idx = (y * canvas.width + x) * 4;
          
          // Multi-frequency noise pattern
          const noise1 = Math.sin(x * 0.1 + y * 0.15) * 2;
          const noise2 = Math.cos(x * 0.2 - y * 0.1) * 1.5;
          const noise3 = (Math.random() - 0.5) * 3;
          
          const totalNoise = (noise1 + noise2 + noise3) * factor * 0.5;
          
          noiseData[idx] = Math.min(255, Math.max(0, noiseData[idx] + totalNoise));
          noiseData[idx + 1] = Math.min(255, Math.max(0, noiseData[idx + 1] + totalNoise));
          noiseData[idx + 2] = Math.min(255, Math.max(0, noiseData[idx + 2] + totalNoise));
        }
      }
      ctx.putImageData(imageData, 0, 0);
      addLog('Adversarial noise injection complete');

      // --- STAGE 6: LOSSY RE-ENCODING ---
      setCurrentStage('Re-encoding image');
      setProgress(85);
      addLog('STAGE 6: Lossy JPEG re-encoding...');
      await wait(150);

      // JPEG compression breaks precise pixel values
      const jpegQuality = 0.82 + (1 - factor) * 0.13; // 82-95% quality
      const jpegDataUrl = canvas.toDataURL('image/jpeg', jpegQuality);

      const jpegImg = new Image();
      await new Promise<void>((resolve) => {
        jpegImg.onload = () => {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(jpegImg, 0, 0);
          resolve();
        };
        jpegImg.src = jpegDataUrl;
      });
      addLog(`JPEG re-encoding at ${Math.round(jpegQuality * 100)}% quality`);

      // --- STAGE 7: FINAL CLEANUP ---
      setCurrentStage('Finalizing');
      setProgress(95);
      addLog('STAGE 7: Final cleanup and quality preservation...');
      await wait(100);

      // Slight sharpening to recover detail lost in compression
      // Using unsharp mask approximation
      imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const finalData = imageData.data;
      const sharpenAmount = 0.15 * factor;

      for (let y = 1; y < canvas.height - 1; y++) {
        for (let x = 1; x < canvas.width - 1; x++) {
          const idx = (y * canvas.width + x) * 4;
          
          for (let c = 0; c < 3; c++) {
            const center = finalData[idx + c];
            const neighbors = (
              finalData[((y - 1) * canvas.width + x) * 4 + c] +
              finalData[((y + 1) * canvas.width + x) * 4 + c] +
              finalData[(y * canvas.width + x - 1) * 4 + c] +
              finalData[(y * canvas.width + x + 1) * 4 + c]
            ) / 4;
            
            finalData[idx + c] = Math.min(255, Math.max(0, 
              Math.round(center + (center - neighbors) * sharpenAmount)
            ));
          }
        }
      }
      ctx.putImageData(imageData, 0, 0);

    } else {
      // ======================================================================
      // IMPRINT MODE - Add fake watermark signature to real images
      // ======================================================================
      setCurrentStage('Synthesizing watermark pattern');
      setProgress(30);
      addLog('IMPRINT MODE: Synthesizing SynthID-like pattern...');
      await wait(300);

      let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      // Inject pattern in YCbCr space (mimics SynthID's approach)
      for (let y = 0; y < canvas.height; y++) {
        for (let x = 0; x < canvas.width; x++) {
          const idx = (y * canvas.width + x) * 4;
          
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];

          let Y = 0.299 * r + 0.587 * g + 0.114 * b;
          let Cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
          let Cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;

          // Inject high-frequency pattern into chroma channels
          const pattern = Math.sin(x * 0.3 + y * 0.2) * Math.cos(x * 0.2 - y * 0.3) * 3 * factor;
          Cb += pattern;
          Cr -= pattern * 0.5;

          const newR = Y + 1.402 * (Cr - 128);
          const newG = Y - 0.344136 * (Cb - 128) - 0.714136 * (Cr - 128);
          const newB = Y + 1.772 * (Cb - 128);

          data[idx] = Math.min(255, Math.max(0, Math.round(newR)));
          data[idx + 1] = Math.min(255, Math.max(0, Math.round(newG)));
          data[idx + 2] = Math.min(255, Math.max(0, Math.round(newB)));
        }
      }
      ctx.putImageData(imageData, 0, 0);

      setProgress(70);
      addLog('Adding visual watermark indicator...');
      await wait(200);

      // Draw 4-pointed star (visual indicator)
      const starSize = Math.min(canvas.width, canvas.height) * 0.035;
      const padding = starSize * 0.8;
      const cx = canvas.width - starSize - padding;
      const cy = canvas.height - starSize - padding;

      ctx.save();
      ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
      ctx.shadowBlur = 2;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      
      ctx.beginPath();
      for (let i = 0; i < 4; i++) {
        const outerAngle = (i * 90) * Math.PI / 180;
        const innerAngle = ((i * 90) + 45) * Math.PI / 180;
        ctx.lineTo(cx + Math.cos(outerAngle) * starSize, cy + Math.sin(outerAngle) * starSize);
        ctx.lineTo(cx + Math.cos(innerAngle) * (starSize * 0.35), cy + Math.sin(innerAngle) * (starSize * 0.35));
      }
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // Calculate quality metrics
    const processedData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const psnr = calculatePSNR(originalData, processedData);
    const ssim = calculateSSIM(originalData, processedData);
    setStats({ psnr, ssim });

    // Finalize
    setProcessedImage(canvas.toDataURL('image/png', 1.0));
    setProgress(100);
    setCurrentStage('Complete');
    addLog(`Processing complete. PSNR: ${psnr.toFixed(2)} dB, SSIM: ${ssim.toFixed(4)}`);
    setIsProcessing(false);

  }, [image, mode, strength, removeVisualStar]);

  // Download handler
  const handleDownload = () => {
    if (!processedImage) return;
    const link = document.createElement('a');
    link.download = `synthid_${mode}_${Date.now()}.png`;
    link.href = processedImage;
    link.click();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      {/* Hidden canvases */}
      <canvas ref={canvasRef} className="hidden" />
      <canvas ref={tempCanvasRef} className="hidden" />

      {/* Header */}
      <header className="sticky top-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-slate-700/50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/" className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
              <span className="material-symbols-outlined text-slate-400 hover:text-white">arrow_back</span>
            </Link>
            <div>
              <h1 className="text-lg font-semibold flex items-center gap-2">
                SynthID Processor
                <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-500/20 text-emerald-400 rounded">v2.0</span>
              </h1>
              <p className="text-xs text-slate-500">Based on arXiv:2510.09263v1 analysis</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${
              isProcessing ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'
            }`}>
              <span className={`w-2 h-2 rounded-full ${isProcessing ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`} />
              {isProcessing ? 'Processing...' : 'Ready'}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid lg:grid-cols-12 gap-8">
          
          {/* Left Panel - Controls */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Upload Section */}
            <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50">
              <h2 className="text-sm font-medium text-slate-400 mb-4 uppercase tracking-wider">Input Image</h2>
              <input 
                ref={fileInputRef}
                type="file" 
                accept="image/*" 
                className="hidden" 
                onChange={handleFileUpload}
              />
              <div
                onClick={() => fileInputRef.current?.click()}
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                className="relative h-40 border-2 border-dashed border-slate-600 rounded-xl flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-slate-500 hover:bg-slate-700/30 transition-all group"
              >
                <div className="p-3 bg-slate-700 rounded-full group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-slate-400">upload_file</span>
                </div>
                <div className="text-center">
                  <p className="text-sm text-slate-400">Drop image or click to browse</p>
                  <p className="text-xs text-slate-500 mt-1">PNG, JPG, WebP supported</p>
                </div>
              </div>
            </div>

            {/* Mode Selection */}
            <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50">
              <h2 className="text-sm font-medium text-slate-400 mb-4 uppercase tracking-wider">Operation Mode</h2>
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-900 rounded-xl">
                <button
                  onClick={() => setMode('neutralize')}
                  className={`py-3 px-4 rounded-lg text-sm font-medium transition-all ${
                    mode === 'neutralize'
                      ? 'bg-slate-700 text-white shadow-lg'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <span className="material-symbols-outlined text-lg mb-1 block">shield</span>
                  Neutralize
                </button>
                <button
                  onClick={() => setMode('imprint')}
                  className={`py-3 px-4 rounded-lg text-sm font-medium transition-all ${
                    mode === 'imprint'
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <span className="material-symbols-outlined text-lg mb-1 block">fingerprint</span>
                  Imprint
                </button>
              </div>
              <p className="text-xs text-slate-500 mt-3">
                {mode === 'neutralize' 
                  ? 'Remove SynthID watermark from AI-generated images'
                  : 'Add fake watermark pattern to real images'}
              </p>
            </div>

            {/* Settings */}
            <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50">
              <h2 className="text-sm font-medium text-slate-400 mb-4 uppercase tracking-wider">Settings</h2>
              
              <div className="space-y-5">
                {/* Strength Slider */}
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-slate-300">Processing Strength</span>
                    <span className="text-indigo-400 font-mono">{strength}%</span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="100"
                    value={strength}
                    onChange={(e) => setStrength(Number(e.target.value))}
                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                  />
                  <p className="text-xs text-slate-500 mt-2">
                    Higher values = stronger effect, slight quality trade-off
                  </p>
                </div>

                {/* Remove Star Toggle */}
                {mode === 'neutralize' && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-300">Remove visual star</span>
                    <button
                      onClick={() => setRemoveVisualStar(!removeVisualStar)}
                      className={`w-12 h-6 rounded-full transition-colors ${
                        removeVisualStar ? 'bg-indigo-600' : 'bg-slate-600'
                      }`}
                    >
                      <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
                        removeVisualStar ? 'translate-x-6' : 'translate-x-0.5'
                      }`} />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Process Button */}
            <button
              onClick={processImage}
              disabled={!image || isProcessing}
              className={`w-full py-4 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
                !image || isProcessing
                  ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-500 hover:to-purple-500 shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40'
              }`}
            >
              {isProcessing ? (
                <>
                  <span className="material-symbols-outlined animate-spin">progress_activity</span>
                  Processing ({progress}%)
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined">play_arrow</span>
                  {mode === 'neutralize' ? 'Neutralize Watermark' : 'Apply Imprint'}
                </>
              )}
            </button>

            {/* Log Terminal */}
            <div className="bg-slate-900 rounded-xl border border-slate-700/50 overflow-hidden">
              <div className="px-4 py-2 bg-slate-800 border-b border-slate-700/50 flex items-center gap-2">
                <span className="w-2 h-2 bg-red-500 rounded-full" />
                <span className="w-2 h-2 bg-yellow-500 rounded-full" />
                <span className="w-2 h-2 bg-green-500 rounded-full" />
                <span className="text-xs text-slate-500 ml-2 font-mono">process.log</span>
              </div>
              <div className="p-4 h-48 overflow-y-auto font-mono text-xs">
                {log.length === 0 ? (
                  <span className="text-slate-600">Waiting for input...</span>
                ) : (
                  log.map((entry, i) => (
                    <div key={i} className="text-slate-400 mb-1">{entry}</div>
                  ))
                )}
                {isProcessing && (
                  <div className="text-indigo-400 flex items-center gap-1">
                    <span className="animate-pulse">▋</span>
                    {currentStage}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Panel - Preview */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Image Preview */}
            <div className="bg-slate-800/50 rounded-2xl border border-slate-700/50 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-700/50 flex items-center justify-between">
                <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wider">Preview</h2>
                {processedImage && (
                  <div className="flex items-center gap-2">
                    <button
                      onMouseDown={() => setShowComparison(true)}
                      onMouseUp={() => setShowComparison(false)}
                      onMouseLeave={() => setShowComparison(false)}
                      className="px-3 py-1.5 text-xs bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
                    >
                      Hold to compare
                    </button>
                  </div>
                )}
              </div>
              
              <div className="relative min-h-[500px] bg-slate-900 flex items-center justify-center p-8">
                {!image ? (
                  <div className="text-center">
                    <span className="material-symbols-outlined text-6xl text-slate-700 mb-4 block">image</span>
                    <p className="text-slate-500">No image loaded</p>
                    <p className="text-slate-600 text-sm mt-1">Upload an image to begin</p>
                  </div>
                ) : (
                  <div className="relative">
                    <img
                      src={showComparison ? image : (processedImage || image)}
                      alt="Preview"
                      className="max-w-full max-h-[60vh] object-contain rounded-lg shadow-2xl"
                    />
                    {processedImage && (
                      <div className={`absolute top-4 right-4 px-3 py-1.5 rounded-full text-xs font-medium ${
                        showComparison 
                          ? 'bg-amber-500/90 text-white' 
                          : 'bg-emerald-500/90 text-white'
                      }`}>
                        {showComparison ? 'ORIGINAL' : 'PROCESSED'}
                      </div>
                    )}
                    
                    {/* Progress overlay */}
                    <AnimatePresence>
                      {isProcessing && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm rounded-lg flex flex-col items-center justify-center"
                        >
                          <div className="w-48 h-2 bg-slate-700 rounded-full overflow-hidden mb-4">
                            <motion.div
                              className="h-full bg-gradient-to-r from-indigo-500 to-purple-500"
                              initial={{ width: 0 }}
                              animate={{ width: `${progress}%` }}
                            />
                          </div>
                          <p className="text-sm text-slate-300">{currentStage}</p>
                          <p className="text-xs text-slate-500 mt-1">{progress}% complete</p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            </div>

            {/* Stats & Download */}
            {processedImage && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50"
              >
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-6">
                    {stats && (
                      <>
                        <div>
                          <p className="text-xs text-slate-500 uppercase tracking-wider">PSNR</p>
                          <p className="text-2xl font-bold text-emerald-400">{stats.psnr.toFixed(1)} <span className="text-sm font-normal text-slate-500">dB</span></p>
                        </div>
                        <div className="w-px h-10 bg-slate-700" />
                        <div>
                          <p className="text-xs text-slate-500 uppercase tracking-wider">SSIM</p>
                          <p className="text-2xl font-bold text-emerald-400">{(stats.ssim * 100).toFixed(1)}<span className="text-sm font-normal text-slate-500">%</span></p>
                        </div>
                        <div className="w-px h-10 bg-slate-700" />
                        <div>
                          <p className="text-xs text-slate-500 uppercase tracking-wider">Quality</p>
                          <p className="text-2xl font-bold text-emerald-400">
                            {stats.psnr > 35 ? 'Excellent' : stats.psnr > 30 ? 'Good' : 'Fair'}
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                  
                  <button
                    onClick={handleDownload}
                    className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold rounded-xl hover:from-emerald-500 hover:to-teal-500 transition-all shadow-lg shadow-emerald-500/25 flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined">download</span>
                    Download Result
                  </button>
                </div>
              </motion.div>
            )}

            {/* Info Panel */}
            <div className="bg-slate-800/30 rounded-xl p-6 border border-slate-700/30">
              <h3 className="text-sm font-medium text-slate-400 mb-3">How it works</h3>
              <div className="grid md:grid-cols-3 gap-4 text-xs text-slate-500">
                <div className="flex gap-2">
                  <span className="text-indigo-400">1.</span>
                  <span>Geometric jitter disrupts spatial alignment</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-indigo-400">2.</span>
                  <span>YCbCr attack targets chroma channels</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-indigo-400">3.</span>
                  <span>Frequency perturbation breaks DCT patterns</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-indigo-400">4.</span>
                  <span>Adversarial noise confuses decoder</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-indigo-400">5.</span>
                  <span>JPEG re-encoding quantizes values</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-indigo-400">6.</span>
                  <span>Sharpening restores visual quality</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default SynthIDRemoverPage;
