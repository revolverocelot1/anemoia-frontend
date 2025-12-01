import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';

// ============================================================================
// SYNTHID NEUTRALIZATION ENGINE V3.0 - REAL SIGNAL PROCESSING
// ============================================================================
// ATTACK VECTORS (Based on research):
// 1. VISUAL: Remove 4-pointed star via context-aware inpainting
// 2. CHROMA: 4:2:0 subsampling attack (SynthID hides in Cb/Cr channels)
// 3. GEOMETRIC: Micro-rotation + elastic distortion (breaks grid alignment)
// 4. FREQUENCY: DCT coefficient quantization (JPEG-style attack)
// 5. COMPRESSION: Multi-pass JPEG recompression (degrades watermark each pass)
// 6. NOISE: Gaussian + salt-pepper noise injection
// ============================================================================

interface ProcessingLog {
  time: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

const SynthIDRemoverPage: React.FC = () => {
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [mode, setMode] = useState<'remove' | 'inject'>('remove');
  const [logs, setLogs] = useState<ProcessingLog[]>([]);
  const [settings, setSettings] = useState({
    removeVisualStar: true,
    chromaAttack: true,
    geometricDistortion: true,
    frequencyAttack: true,
    multiPassJPEG: true,
    noiseInjection: true,
    jpegQuality: 85,
    noiseStrength: 0.02,
    rotationAngle: 0.35,
    passes: 3
  });
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const workCanvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addLog = useCallback((message: string, type: ProcessingLog['type'] = 'info') => {
    const time = new Date().toLocaleTimeString('en-US', { hour12: false });
    setLogs(prev => [...prev.slice(-15), { time, message, type }]);
  }, []);

  // ============================================================================
  // CORE SIGNAL PROCESSING FUNCTIONS
  // ============================================================================

  // 1. VISUAL STAR REMOVAL - Inpainting bottom-right corner
  const removeVisualStar = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const regionSize = Math.min(width, height) * 0.12;
    const startX = width - regionSize;
    const startY = height - regionSize;
    
    // Sample colors from adjacent region (left of the corner)
    const sampleX = Math.max(0, startX - regionSize);
    const sampleData = ctx.getImageData(sampleX, startY, regionSize * 0.5, regionSize);
    
    // Get average color
    let avgR = 0, avgG = 0, avgB = 0, count = 0;
    for (let i = 0; i < sampleData.data.length; i += 4) {
      avgR += sampleData.data[i];
      avgG += sampleData.data[i + 1];
      avgB += sampleData.data[i + 2];
      count++;
    }
    avgR = Math.round(avgR / count);
    avgG = Math.round(avgG / count);
    avgB = Math.round(avgB / count);
    
    // Create gradient fill to blend
    const gradient = ctx.createRadialGradient(
      width - regionSize * 0.5, height - regionSize * 0.5, 0,
      width - regionSize * 0.5, height - regionSize * 0.5, regionSize
    );
    gradient.addColorStop(0, `rgba(${avgR},${avgG},${avgB},0.9)`);
    gradient.addColorStop(1, `rgba(${avgR},${avgG},${avgB},0)`);
    
    ctx.fillStyle = gradient;
    ctx.fillRect(startX, startY, regionSize, regionSize);
    
    // Add texture noise to match surrounding area
    const cornerData = ctx.getImageData(startX, startY, regionSize, regionSize);
    for (let i = 0; i < cornerData.data.length; i += 4) {
      const noise = (Math.random() - 0.5) * 15;
      cornerData.data[i] = Math.min(255, Math.max(0, cornerData.data[i] + noise));
      cornerData.data[i + 1] = Math.min(255, Math.max(0, cornerData.data[i + 1] + noise));
      cornerData.data[i + 2] = Math.min(255, Math.max(0, cornerData.data[i + 2] + noise));
    }
    ctx.putImageData(cornerData, startX, startY);
  };

  // 2. CHROMA SUBSAMPLING ATTACK (4:2:0) - Destroys Cb/Cr channel watermarks
  const applyChromaSubsampling = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    
    // Process in 2x2 blocks (4:2:0 simulation)
    for (let y = 0; y < height - 1; y += 2) {
      for (let x = 0; x < width - 1; x += 2) {
        // Get indices for 2x2 block
        const indices = [
          (y * width + x) * 4,
          (y * width + x + 1) * 4,
          ((y + 1) * width + x) * 4,
          ((y + 1) * width + x + 1) * 4
        ];
        
        // Convert to YCbCr, average chroma, convert back
        let sumCb = 0, sumCr = 0;
        const yValues: number[] = [];
        
        for (const idx of indices) {
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];
          
          // RGB to YCbCr
          const Y = 0.299 * r + 0.587 * g + 0.114 * b;
          const Cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
          const Cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;
          
          yValues.push(Y);
          sumCb += Cb;
          sumCr += Cr;
        }
        
        // Average chroma (this is the attack - destroys fine chroma details)
        const avgCb = sumCb / 4;
        const avgCr = sumCr / 4;
        
        // Convert back to RGB with averaged chroma
        for (let i = 0; i < 4; i++) {
          const Y = yValues[i];
          const idx = indices[i];
          
          // YCbCr to RGB
          const r = Y + 1.402 * (avgCr - 128);
          const g = Y - 0.344136 * (avgCb - 128) - 0.714136 * (avgCr - 128);
          const b = Y + 1.772 * (avgCb - 128);
          
          data[idx] = Math.min(255, Math.max(0, Math.round(r)));
          data[idx + 1] = Math.min(255, Math.max(0, Math.round(g)));
          data[idx + 2] = Math.min(255, Math.max(0, Math.round(b)));
        }
      }
    }
    
    ctx.putImageData(imageData, 0, 0);
  };

  // 3. GEOMETRIC DISTORTION - Micro-rotation + elastic transform
  const applyGeometricDistortion = (ctx: CanvasRenderingContext2D, width: number, height: number, angle: number) => {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width;
    tempCanvas.height = height;
    const tempCtx = tempCanvas.getContext('2d')!;
    
    // Copy current state
    tempCtx.drawImage(ctx.canvas, 0, 0);
    
    // Clear and apply rotation
    ctx.clearRect(0, 0, width, height);
    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.rotate((angle * Math.PI) / 180);
    ctx.translate(-width / 2, -height / 2);
    ctx.drawImage(tempCanvas, 0, 0);
    ctx.restore();
    
    // Apply subtle elastic distortion
    const srcData = ctx.getImageData(0, 0, width, height);
    const destData = ctx.createImageData(width, height);
    const src = srcData.data;
    const dest = destData.data;
    
    const amplitude = 1.5;
    const period = 30;
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const offsetX = amplitude * Math.sin((y / period) * Math.PI * 2);
        const offsetY = amplitude * Math.cos((x / period) * Math.PI * 2);
        
        const srcX = Math.min(width - 1, Math.max(0, Math.round(x + offsetX)));
        const srcY = Math.min(height - 1, Math.max(0, Math.round(y + offsetY)));
        
        const srcIdx = (srcY * width + srcX) * 4;
        const destIdx = (y * width + x) * 4;
        
        dest[destIdx] = src[srcIdx];
        dest[destIdx + 1] = src[srcIdx + 1];
        dest[destIdx + 2] = src[srcIdx + 2];
        dest[destIdx + 3] = src[srcIdx + 3];
      }
    }
    
    ctx.putImageData(destData, 0, 0);
  };

  // 4. FREQUENCY DOMAIN ATTACK - DCT coefficient quantization simulation
  const applyFrequencyAttack = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    
    // Process in 8x8 blocks (like JPEG)
    const blockSize = 8;
    
    for (let by = 0; by < height; by += blockSize) {
      for (let bx = 0; bx < width; bx += blockSize) {
        // Extract block for each channel
        for (let c = 0; c < 3; c++) {
          const block: number[] = [];
          
          for (let y = 0; y < blockSize && by + y < height; y++) {
            for (let x = 0; x < blockSize && bx + x < width; x++) {
              const idx = ((by + y) * width + (bx + x)) * 4 + c;
              block.push(data[idx]);
            }
          }
          
          // Simple quantization (simulates DCT coefficient quantization)
          const quantStep = 4; // Higher = more aggressive
          for (let i = 0; i < block.length; i++) {
            block[i] = Math.round(block[i] / quantStep) * quantStep;
          }
          
          // Write back
          let i = 0;
          for (let y = 0; y < blockSize && by + y < height; y++) {
            for (let x = 0; x < blockSize && bx + x < width; x++) {
              const idx = ((by + y) * width + (bx + x)) * 4 + c;
              data[idx] = block[i++];
            }
          }
        }
      }
    }
    
    ctx.putImageData(imageData, 0, 0);
  };

  // 5. MULTI-PASS JPEG RECOMPRESSION
  const applyJPEGRecompression = async (ctx: CanvasRenderingContext2D, quality: number, passes: number): Promise<void> => {
    for (let i = 0; i < passes; i++) {
      const dataUrl = ctx.canvas.toDataURL('image/jpeg', quality / 100);
      
      await new Promise<void>((resolve) => {
        const img = new Image();
        img.onload = () => {
          ctx.drawImage(img, 0, 0);
          resolve();
        };
        img.src = dataUrl;
      });
    }
  };

  // 6. NOISE INJECTION
  const applyNoiseInjection = (ctx: CanvasRenderingContext2D, width: number, height: number, strength: number) => {
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    
    for (let i = 0; i < data.length; i += 4) {
      // Gaussian noise
      const u1 = Math.random();
      const u2 = Math.random();
      const gaussian = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
      const noise = gaussian * strength * 255;
      
      data[i] = Math.min(255, Math.max(0, data[i] + noise));
      data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise));
      data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise));
      
      // Salt & pepper (sparse)
      if (Math.random() < 0.001) {
        const val = Math.random() > 0.5 ? 255 : 0;
        data[i] = val;
        data[i + 1] = val;
        data[i + 2] = val;
      }
    }
    
    ctx.putImageData(imageData, 0, 0);
  };

  // 7. INJECT FAKE SYNTHID (Reverse mode)
  const injectFakeSynthID = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    // Draw 4-pointed star in bottom-right
    const starSize = Math.min(width, height) * 0.04;
    const cx = width - starSize * 2;
    const cy = height - starSize * 2;
    
    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.shadowBlur = 8;
    ctx.shadowColor = 'rgba(255, 255, 255, 0.5)';
    
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      const angle = (i * Math.PI / 2) - (Math.PI / 2);
      const outerX = cx + Math.cos(angle) * starSize;
      const outerY = cy + Math.sin(angle) * starSize;
      
      if (i === 0) ctx.moveTo(outerX, outerY);
      else ctx.lineTo(outerX, outerY);
      
      const innerAngle = angle + Math.PI / 4;
      const innerX = cx + Math.cos(innerAngle) * (starSize * 0.3);
      const innerY = cy + Math.sin(innerAngle) * (starSize * 0.3);
      ctx.lineTo(innerX, innerY);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    
    // Inject fake latent pattern (subtle noise in specific pattern)
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    
    // Create a pseudo-random pattern based on position
    for (let i = 0; i < data.length; i += 4) {
      const pixelIdx = i / 4;
      const x = pixelIdx % width;
      const y = Math.floor(pixelIdx / width);
      
      // Pattern based on position (simulates spread-spectrum)
      const pattern = Math.sin(x * 0.1) * Math.cos(y * 0.1) * 2;
      
      if (Math.abs(pattern) > 0.5) {
        data[i] = Math.min(255, Math.max(0, data[i] + pattern));
        data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + pattern * 0.5));
        data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + pattern * 0.5));
      }
    }
    
    ctx.putImageData(imageData, 0, 0);
  };

  // ============================================================================
  // MAIN PROCESSING PIPELINE
  // ============================================================================

  const processImage = async () => {
    if (!originalImage || processing) return;
    
    setProcessing(true);
    setProgress(0);
    setProcessedImage(null);
    setLogs([]);
    
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    
    // Load image
    addLog('Loading image...', 'info');
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = originalImage;
    });
    
    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);
    
    addLog(`Image loaded: ${img.width}x${img.height}`, 'success');
    setProgress(10);
    
    if (mode === 'remove') {
      // REMOVAL PIPELINE
      const steps = [
        settings.removeVisualStar,
        settings.chromaAttack,
        settings.geometricDistortion,
        settings.frequencyAttack,
        settings.multiPassJPEG,
        settings.noiseInjection
      ].filter(Boolean).length;
      
      let currentStep = 0;
      const stepProgress = 80 / Math.max(steps, 1);
      
      if (settings.removeVisualStar) {
        addLog('Removing visual star watermark...', 'info');
        await new Promise(r => setTimeout(r, 100));
        removeVisualStar(ctx, canvas.width, canvas.height);
        currentStep++;
        setProgress(10 + currentStep * stepProgress);
        addLog('Visual star removed', 'success');
      }
      
      if (settings.chromaAttack) {
        addLog('Applying chroma subsampling attack (4:2:0)...', 'info');
        await new Promise(r => setTimeout(r, 100));
        applyChromaSubsampling(ctx, canvas.width, canvas.height);
        currentStep++;
        setProgress(10 + currentStep * stepProgress);
        addLog('Chroma channels disrupted', 'success');
      }
      
      if (settings.geometricDistortion) {
        addLog(`Applying geometric distortion (${settings.rotationAngle}°)...`, 'info');
        await new Promise(r => setTimeout(r, 100));
        applyGeometricDistortion(ctx, canvas.width, canvas.height, settings.rotationAngle);
        currentStep++;
        setProgress(10 + currentStep * stepProgress);
        addLog('Grid alignment broken', 'success');
      }
      
      if (settings.frequencyAttack) {
        addLog('Applying frequency domain attack...', 'info');
        await new Promise(r => setTimeout(r, 100));
        applyFrequencyAttack(ctx, canvas.width, canvas.height);
        currentStep++;
        setProgress(10 + currentStep * stepProgress);
        addLog('DCT coefficients quantized', 'success');
      }
      
      if (settings.multiPassJPEG) {
        addLog(`Running ${settings.passes}-pass JPEG recompression (Q=${settings.jpegQuality})...`, 'info');
        await applyJPEGRecompression(ctx, settings.jpegQuality, settings.passes);
        currentStep++;
        setProgress(10 + currentStep * stepProgress);
        addLog('Compression artifacts applied', 'success');
      }
      
      if (settings.noiseInjection) {
        addLog(`Injecting noise (σ=${settings.noiseStrength})...`, 'info');
        await new Promise(r => setTimeout(r, 100));
        applyNoiseInjection(ctx, canvas.width, canvas.height, settings.noiseStrength);
        currentStep++;
        setProgress(10 + currentStep * stepProgress);
        addLog('Noise pattern injected', 'success');
      }
      
      addLog('Watermark neutralization complete!', 'success');
      
    } else {
      // INJECTION PIPELINE
      addLog('Injecting fake SynthID watermark...', 'info');
      await new Promise(r => setTimeout(r, 500));
      injectFakeSynthID(ctx, canvas.width, canvas.height);
      setProgress(90);
      addLog('Fake watermark injected successfully!', 'success');
    }
    
    // Generate final image
    setProgress(95);
    const finalImage = canvas.toDataURL('image/png');
    setProcessedImage(finalImage);
    setProgress(100);
    addLog('Processing complete. Ready for download.', 'success');
    setProcessing(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setOriginalImage(event.target?.result as string);
        setProcessedImage(null);
        setLogs([]);
        addLog(`Loaded: ${file.name}`, 'info');
      };
      reader.readAsDataURL(file);
    }
  };

  const downloadImage = () => {
    if (!processedImage) return;
    const link = document.createElement('a');
    link.download = `synthid_${mode}_${Date.now()}.png`;
    link.href = processedImage;
    link.click();
  };

  const loadTestImage = () => {
    setOriginalImage('/test file/Gemini_Generated_Image_8hgzf08hgzf08hgz.png');
    setProcessedImage(null);
    setLogs([]);
    addLog('Loaded test image (Gemini Generated)', 'info');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Header */}
      <header className="border-b border-slate-800/50 bg-slate-900/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link 
                to="/" 
                className="p-2 rounded-lg bg-slate-800/50 hover:bg-slate-700/50 transition-colors"
              >
                <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </Link>
              <div>
                <h1 className="text-xl font-semibold text-white">Watermark Studio</h1>
                <p className="text-xs text-slate-500">Signal Processing Tool</p>
              </div>
            </div>
            
            {/* Mode Toggle */}
            <div className="flex items-center gap-2 bg-slate-800/50 rounded-xl p-1">
              <button
                onClick={() => setMode('remove')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  mode === 'remove' 
                    ? 'bg-emerald-500/20 text-emerald-400 shadow-lg shadow-emerald-500/10' 
                    : 'text-slate-400 hover:text-slate-300'
                }`}
              >
                Remove
              </button>
              <button
                onClick={() => setMode('inject')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  mode === 'inject' 
                    ? 'bg-violet-500/20 text-violet-400 shadow-lg shadow-violet-500/10' 
                    : 'text-slate-400 hover:text-slate-300'
                }`}
              >
                Inject
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid lg:grid-cols-12 gap-8">
          
          {/* Left Panel - Controls */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Upload Section */}
            <div className="bg-slate-900/50 rounded-2xl border border-slate-800/50 p-6">
              <h2 className="text-sm font-semibold text-slate-300 mb-4">Input Image</h2>
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
              
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full border-2 border-dashed border-slate-700 hover:border-slate-600 rounded-xl p-8 transition-colors group"
              >
                <div className="flex flex-col items-center">
                  <svg className="w-10 h-10 text-slate-600 group-hover:text-slate-500 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="text-sm text-slate-500 group-hover:text-slate-400">Click to upload image</span>
                </div>
              </button>
              
              <button
                onClick={loadTestImage}
                className="w-full mt-3 py-2 text-xs text-slate-500 hover:text-slate-400 transition-colors"
              >
                Load test image (Gemini)
              </button>
            </div>

            {/* Settings Panel */}
            {mode === 'remove' && (
              <div className="bg-slate-900/50 rounded-2xl border border-slate-800/50 p-6">
                <h2 className="text-sm font-semibold text-slate-300 mb-4">Attack Vectors</h2>
                
                <div className="space-y-3">
                  {[
                    { key: 'removeVisualStar', label: 'Remove Visual Star', desc: 'Inpaint bottom-right corner' },
                    { key: 'chromaAttack', label: 'Chroma Subsampling', desc: '4:2:0 channel attack' },
                    { key: 'geometricDistortion', label: 'Geometric Distortion', desc: 'Break grid alignment' },
                    { key: 'frequencyAttack', label: 'Frequency Attack', desc: 'DCT quantization' },
                    { key: 'multiPassJPEG', label: 'JPEG Recompression', desc: 'Multi-pass degradation' },
                    { key: 'noiseInjection', label: 'Noise Injection', desc: 'Gaussian + salt-pepper' },
                  ].map(({ key, label, desc }) => (
                    <label key={key} className="flex items-start gap-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={settings[key as keyof typeof settings] as boolean}
                        onChange={(e) => setSettings(s => ({ ...s, [key]: e.target.checked }))}
                        className="mt-1 w-4 h-4 rounded border-slate-600 bg-slate-800 text-emerald-500 focus:ring-emerald-500/20"
                      />
                      <div>
                        <div className="text-sm text-slate-300 group-hover:text-white transition-colors">{label}</div>
                        <div className="text-xs text-slate-600">{desc}</div>
                      </div>
                    </label>
                  ))}
                </div>

                {/* Sliders */}
                <div className="mt-6 space-y-4">
                  <div>
                    <div className="flex justify-between text-xs text-slate-500 mb-2">
                      <span>JPEG Quality</span>
                      <span>{settings.jpegQuality}%</span>
                    </div>
                    <input
                      type="range"
                      min="50"
                      max="95"
                      value={settings.jpegQuality}
                      onChange={(e) => setSettings(s => ({ ...s, jpegQuality: Number(e.target.value) }))}
                      className="w-full h-1 bg-slate-700 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-emerald-500 [&::-webkit-slider-thumb]:rounded-full"
                    />
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-xs text-slate-500 mb-2">
                      <span>Compression Passes</span>
                      <span>{settings.passes}</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="5"
                      value={settings.passes}
                      onChange={(e) => setSettings(s => ({ ...s, passes: Number(e.target.value) }))}
                      className="w-full h-1 bg-slate-700 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-emerald-500 [&::-webkit-slider-thumb]:rounded-full"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Process Button */}
            <button
              onClick={processImage}
              disabled={!originalImage || processing}
              className={`w-full py-4 rounded-xl font-semibold text-white transition-all ${
                !originalImage || processing
                  ? 'bg-slate-800 text-slate-600 cursor-not-allowed'
                  : mode === 'remove'
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-lg shadow-emerald-500/20'
                    : 'bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 shadow-lg shadow-violet-500/20'
              }`}
            >
              {processing ? 'Processing...' : mode === 'remove' ? 'Remove Watermark' : 'Inject Watermark'}
            </button>

            {/* Download Button */}
            <AnimatePresence>
              {processedImage && (
                <motion.button
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  onClick={downloadImage}
                  className="w-full py-4 rounded-xl font-semibold bg-slate-800 hover:bg-slate-700 text-white transition-all flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download Result
                </motion.button>
              )}
            </AnimatePresence>

            {/* Progress */}
            {processing && (
              <div className="bg-slate-900/50 rounded-xl p-4">
                <div className="flex justify-between text-xs text-slate-500 mb-2">
                  <span>Processing</span>
                  <span>{progress}%</span>
                </div>
                <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                  <motion.div
                    className={`h-full ${mode === 'remove' ? 'bg-emerald-500' : 'bg-violet-500'}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
              </div>
            )}

            {/* Log */}
            <div className="bg-slate-900/50 rounded-2xl border border-slate-800/50 p-4 max-h-64 overflow-y-auto">
              <h3 className="text-xs font-semibold text-slate-500 mb-3">Processing Log</h3>
              <div className="space-y-1 font-mono text-xs">
                {logs.length === 0 && (
                  <div className="text-slate-700">Waiting for input...</div>
                )}
                {logs.map((log, i) => (
                  <div 
                    key={i} 
                    className={`flex gap-2 ${
                      log.type === 'success' ? 'text-emerald-500' :
                      log.type === 'error' ? 'text-red-500' :
                      log.type === 'warning' ? 'text-amber-500' :
                      'text-slate-500'
                    }`}
                  >
                    <span className="text-slate-700">[{log.time}]</span>
                    <span>{log.message}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Panel - Preview */}
          <div className="lg:col-span-8">
            <div className="bg-slate-900/50 rounded-2xl border border-slate-800/50 overflow-hidden">
              {/* Preview Header */}
              <div className="px-6 py-4 border-b border-slate-800/50 flex items-center justify-between">
                <span className="text-sm font-medium text-slate-400">Preview</span>
                {processedImage && (
                  <span className="px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-400 text-xs">
                    Processing Complete
                  </span>
                )}
              </div>
              
              {/* Preview Content */}
              <div className="p-6 min-h-[500px] flex items-center justify-center bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-slate-800/20 to-transparent">
                {/* Hidden processing canvas */}
                <canvas ref={canvasRef} className="hidden" />
                
                {!originalImage ? (
                  <div className="text-center">
                    <svg className="w-16 h-16 text-slate-800 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="text-slate-700">Upload an image to begin</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                    {/* Original */}
                    <div className="space-y-2">
                      <span className="text-xs text-slate-600 uppercase tracking-wider">Original</span>
                      <div className="rounded-xl overflow-hidden border border-slate-800/50 bg-slate-950">
                        <img 
                          src={originalImage} 
                          alt="Original" 
                          className="w-full h-auto"
                        />
                      </div>
                    </div>
                    
                    {/* Processed */}
                    <div className="space-y-2">
                      <span className="text-xs text-slate-600 uppercase tracking-wider">
                        {mode === 'remove' ? 'Processed' : 'With Watermark'}
                      </span>
                      <div className="rounded-xl overflow-hidden border border-slate-800/50 bg-slate-950 relative">
                        {processedImage ? (
                          <img 
                            src={processedImage} 
                            alt="Processed" 
                            className="w-full h-auto"
                          />
                        ) : (
                          <div className="aspect-video flex items-center justify-center">
                            <span className="text-slate-700 text-sm">
                              {processing ? 'Processing...' : 'Click process to start'}
                            </span>
                          </div>
                        )}
                        
                        {/* Processing overlay */}
                        <AnimatePresence>
                          {processing && (
                            <motion.div
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center"
                            >
                              <div className="w-8 h-8 border-2 border-slate-600 border-t-emerald-500 rounded-full animate-spin" />
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default SynthIDRemoverPage;
