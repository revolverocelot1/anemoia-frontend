import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';

// ============================================================================
// HELPER FUNCTIONS & CONSTANTS
// ============================================================================

// SVG Icons for UI
const Icons = {
  Upload: () => (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    </svg>
  ),
  Magic: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
    </svg>
  ),
  Shield: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  ),
  Download: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
  ),
  Compare: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
    </svg>
  )
};

const SynthIDRemoverPage: React.FC = () => {
  // State
  const [image, setImage] = useState<string | null>(null);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [mode, setMode] = useState<'neutralize' | 'imprint'>('neutralize');
  const [strength, setStrength] = useState(75); // 0-100
  const [showCompare, setShowCompare] = useState(false);
  const [log, setLog] = useState<string[]>([]);

  // Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addLog = (msg: string) => {
    setLog(prev => [...prev.slice(-6), `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  // File Handling
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        setImage(evt.target?.result as string);
        setProcessedImage(null);
        addLog(`Loaded: ${file.name}`);
        setProgress(0);
      };
      reader.readAsDataURL(file);
    }
  };

  // --------------------------------------------------------------------------
  // IMAGE PROCESSING ENGINE (Based on SynthID Paper Analysis)
  // --------------------------------------------------------------------------
  
  const processImage = useCallback(async () => {
    if (!image || !canvasRef.current) return;
    
    setIsProcessing(true);
    setProgress(5);
    addLog("Initializing processing pipeline...");

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const img = new Image();
    img.src = image;
    
    await new Promise<void>((resolve) => {
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        resolve();
      }
    });

    // Helper to simulate async work and update UI
    const wait = (ms: number) => new Promise(r => setTimeout(r, ms));
    const factor = strength / 100; // 0.0 to 1.0

    if (mode === 'neutralize') {
      // ========================================================================
      // NEUTRALIZATION PROTOCOL (Based on SynthID Paper Weaknesses)
      // Paper Section 8.2: "CombinationWorst" has lowest TPR.
      // Attack: Geometric Jitter + Chroma Washing + Lossy Re-encode
      // ========================================================================

      // --- STAGE 1: VISUAL STAR REMOVAL (Inpainting) ---
      setProgress(15);
      addLog("STAGE 1: Removing visual star indicator...");
      await wait(150);
      
      // The 4-pointed star is in the bottom-right corner.
      // We'll blur/smudge that area to remove it.
      const starSize = Math.min(canvas.width, canvas.height) * 0.06;
      const padding = starSize * 0.3;
      
      // Get the corner region
      const cornerX = canvas.width - starSize - padding;
      const cornerY = canvas.height - starSize - padding;
      
      // Simple inpainting: sample colors from surrounding area and paint over
      const surroundingData = ctx.getImageData(cornerX - 10, cornerY - 10, 10, 10);
      let avgR = 0, avgG = 0, avgB = 0;
      for (let i = 0; i < surroundingData.data.length; i += 4) {
        avgR += surroundingData.data[i];
        avgG += surroundingData.data[i+1];
        avgB += surroundingData.data[i+2];
      }
      const pixelCount = surroundingData.data.length / 4;
      avgR = Math.round(avgR / pixelCount);
      avgG = Math.round(avgG / pixelCount);
      avgB = Math.round(avgB / pixelCount);

      // Fill the star area with a gradient blend
      const gradient = ctx.createRadialGradient(
        canvas.width - starSize/2, canvas.height - starSize/2, 0,
        canvas.width - starSize/2, canvas.height - starSize/2, starSize
      );
      gradient.addColorStop(0, `rgba(${avgR}, ${avgG}, ${avgB}, 1)`);
      gradient.addColorStop(1, `rgba(${avgR}, ${avgG}, ${avgB}, 0)`);
      ctx.fillStyle = gradient;
      ctx.fillRect(cornerX, cornerY, starSize + padding, starSize + padding);

      // --- STAGE 2: GEOMETRIC JITTER (Paper Section 4: Spatial transforms) ---
      setProgress(30);
      addLog("STAGE 2: Applying geometric jitter...");
      await wait(200);

      // Small rotation (0.5-1.5 degrees) + slight scale (1.01-1.02x)
      // Paper admits small rotations are MORE effective than 90/180/270
      const angle = (0.5 + Math.random() * 1.0) * factor * (Math.random() > 0.5 ? 1 : -1);
      const scale = 1 + (0.01 + Math.random() * 0.01) * factor;
      
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = canvas.width;
      tempCanvas.height = canvas.height;
      const tempCtx = tempCanvas.getContext('2d')!;
      tempCtx.drawImage(canvas, 0, 0);

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate(angle * Math.PI / 180);
      ctx.scale(scale, scale);
      ctx.translate(-canvas.width / 2, -canvas.height / 2);
      ctx.drawImage(tempCanvas, 0, 0);
      ctx.restore();

      // --- STAGE 3: CHROMA WASHING (Paper Section 3: YCbCr vulnerability) ---
      setProgress(50);
      addLog("STAGE 3: Washing chroma channels (YCbCr attack)...");
      await wait(300);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        // RGB -> YCbCr
        const Y = 0.299 * r + 0.587 * g + 0.114 * b;
        let Cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
        let Cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;

        // Attack: Add noise + Quantize Cb/Cr channels
        // SynthID hides info in these channels as humans are less sensitive to chroma
        const noiseLevel = 6 * factor;
        const quantStep = 2 + Math.floor(4 * factor);

        Cb += (Math.random() - 0.5) * noiseLevel;
        Cr += (Math.random() - 0.5) * noiseLevel;
        
        // Quantization breaks the precise bit encoding
        Cb = Math.round(Cb / quantStep) * quantStep;
        Cr = Math.round(Cr / quantStep) * quantStep;

        // YCbCr -> RGB
        const newR = Y + 1.402 * (Cr - 128);
        const newG = Y - 0.344136 * (Cb - 128) - 0.714136 * (Cr - 128);
        const newB = Y + 1.772 * (Cb - 128);

        data[i] = Math.min(255, Math.max(0, Math.round(newR)));
        data[i + 1] = Math.min(255, Math.max(0, Math.round(newG)));
        data[i + 2] = Math.min(255, Math.max(0, Math.round(newB)));
      }
      ctx.putImageData(imageData, 0, 0);

      // --- STAGE 4: HIGH-FREQUENCY NOISE INJECTION ---
      setProgress(70);
      addLog("STAGE 4: Injecting adversarial noise mask...");
      await wait(200);

      const noiseData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const nd = noiseData.data;
      
      // Add spatially-varying noise to disrupt the decoder's learned patterns
      for (let y = 0; y < canvas.height; y++) {
        for (let x = 0; x < canvas.width; x++) {
          const i = (y * canvas.width + x) * 4;
          // Create a pseudo-random pattern based on position
          const noise = (Math.sin(x * 0.1) * Math.cos(y * 0.1) + (Math.random() - 0.5)) * 4 * factor;
          
          nd[i] = Math.min(255, Math.max(0, nd[i] + noise));
          nd[i+1] = Math.min(255, Math.max(0, nd[i+1] + noise));
          nd[i+2] = Math.min(255, Math.max(0, nd[i+2] + noise));
        }
      }
      ctx.putImageData(noiseData, 0, 0);

      // --- STAGE 5: LOSSY RE-ENCODING (JPEG Compression Artifact) ---
      setProgress(90);
      addLog("STAGE 5: Applying lossy re-encoding...");
      await wait(150);
      
      // Simulate JPEG compression by converting to JPEG and back
      // Quality 85-92 is enough to disrupt without visible loss
      const jpegQuality = 0.85 + (1 - factor) * 0.10; // Higher strength = lower quality
      const jpegDataUrl = canvas.toDataURL('image/jpeg', jpegQuality);
      
      // Load it back
      const jpegImg = new Image();
      await new Promise<void>((resolve) => {
        jpegImg.onload = () => {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(jpegImg, 0, 0);
          resolve();
        };
        jpegImg.src = jpegDataUrl;
      });

    } else {
      // ========================================================================
      // IMPRINT PROTOCOL (Add fake watermark signature to real images)
      // ========================================================================
      setProgress(30);
      addLog("STAGE 1: Synthesizing provenance signature...");
      await wait(400);

      // 1. LATENT PATTERN INJECTION (Mimics SynthID's encoding)
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      // Create a pattern in YCbCr space (where SynthID hides its data)
      for (let y = 0; y < canvas.height; y++) {
        for (let x = 0; x < canvas.width; x++) {
          const i = (y * canvas.width + x) * 4;
          
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];

          // RGB -> YCbCr
          const Y = 0.299 * r + 0.587 * g + 0.114 * b;
          let Cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
          let Cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;

          // Inject a subtle, high-frequency pattern into chroma channels
          const pattern = Math.sin(x * 0.3 + y * 0.2) * Math.cos(x * 0.2 - y * 0.3) * 3 * factor;
          Cb += pattern;
          Cr -= pattern * 0.5;

          // YCbCr -> RGB
          const newR = Y + 1.402 * (Cr - 128);
          const newG = Y - 0.344136 * (Cb - 128) - 0.714136 * (Cr - 128);
          const newB = Y + 1.772 * (Cb - 128);

          data[i] = Math.min(255, Math.max(0, Math.round(newR)));
          data[i + 1] = Math.min(255, Math.max(0, Math.round(newG)));
          data[i + 2] = Math.min(255, Math.max(0, Math.round(newB)));
        }
      }
      ctx.putImageData(imageData, 0, 0);

      setProgress(70);
      addLog("STAGE 2: Applying visual watermark indicator...");
      await wait(300);

      // 2. VISUAL INDICATOR (4-Point Star in bottom right)
      const starSize = Math.min(canvas.width, canvas.height) * 0.04;
      const padding = starSize * 0.6;
      const cx = canvas.width - starSize - padding;
      const cy = canvas.height - starSize - padding;

      ctx.save();
      ctx.shadowColor = "rgba(0, 0, 0, 0.4)";
      ctx.shadowBlur = 3;
      ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
      
      ctx.beginPath();
      // Draw 4-pointed star
      for(let i = 0; i < 4; i++) {
          ctx.lineTo(cx + Math.cos((i * 90) * Math.PI / 180) * starSize, cy + Math.sin((i * 90) * Math.PI / 180) * starSize);
          ctx.lineTo(cx + Math.cos(((i * 90) + 45) * Math.PI / 180) * (starSize * 0.3), cy + Math.sin(((i * 90) + 45) * Math.PI / 180) * (starSize * 0.3));
      }
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // Finalize
    setProcessedImage(canvas.toDataURL("image/png", 1.0));
    setProgress(100);
    addLog(mode === 'neutralize' ? "Neutralization Complete." : "Imprint Complete.");
    setIsProcessing(false);

  }, [image, mode, strength]);


  return (
    <div className="min-h-screen bg-[#0a0a0a] text-gray-100 font-sans selection:bg-indigo-500/30">
      {/* Subtle Background */}
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-gray-900 via-[#0a0a0a] to-[#0a0a0a] -z-10" />
      
      {/* Header */}
      <header className="border-b border-white/5 bg-black/20 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/" className="p-2 hover:bg-white/5 rounded-full transition-colors">
              <span className="material-symbols-outlined text-gray-400">arrow_back</span>
            </Link>
            <div className="flex flex-col">
              <h1 className="text-lg font-medium tracking-tight flex items-center gap-2">
                Project Silencer <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-400 tracking-wider">BETA</span>
              </h1>
            </div>
          </div>
          <div className="text-xs font-mono text-gray-500 flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${isProcessing ? 'bg-yellow-500 animate-pulse' : 'bg-green-500'}`}></span>
            {isProcessing ? 'PROCESSING...' : 'READY'}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 grid lg:grid-cols-3 gap-8">
        
        {/* LEFT: CONTROLS */}
        <div className="flex flex-col gap-6">
          
          {/* Upload Card */}
          <div className="bg-[#111] border border-white/5 rounded-2xl p-6 hover:border-white/10 transition-colors">
            <h2 className="text-sm font-medium text-gray-400 mb-4 uppercase tracking-wider">Input Source</h2>
            <input 
              ref={fileInputRef}
              type="file" 
              accept="image/*" 
              className="hidden" 
              onChange={handleFileUpload}
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="w-full h-32 border border-dashed border-gray-700 rounded-xl flex flex-col items-center justify-center gap-3 hover:bg-white/5 hover:border-gray-500 transition-all group"
            >
              <div className="p-3 bg-gray-800 rounded-full group-hover:scale-110 transition-transform text-gray-400 group-hover:text-white">
                <Icons.Upload />
              </div>
              <span className="text-sm text-gray-500 group-hover:text-gray-300">Drop image or click to browse</span>
            </button>
          </div>

          {/* Configuration */}
          <div className="bg-[#111] border border-white/5 rounded-2xl p-6 flex-1 flex flex-col">
            <h2 className="text-sm font-medium text-gray-400 mb-6 uppercase tracking-wider">Configuration</h2>
            
            {/* Mode Select */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-black rounded-xl border border-white/5 mb-8">
              <button
                onClick={() => setMode('neutralize')}
                className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  mode === 'neutralize' 
                  ? 'bg-gray-800 text-white shadow-sm' 
                  : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                <Icons.Shield />
                Neutralize
              </button>
              <button
                onClick={() => setMode('imprint')}
                className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  mode === 'imprint' 
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/20' 
                  : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                <Icons.Magic />
                Imprint
              </button>
            </div>

            {/* Strength Slider */}
            <div className="mb-8">
              <div className="flex justify-between text-sm mb-3">
                <span className="text-gray-300">Processing Intensity</span>
                <span className="text-indigo-400 font-mono">{strength}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={strength}
                onChange={(e) => setStrength(Number(e.target.value))}
                className="w-full h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
              <p className="text-xs text-gray-500 mt-2">
                {mode === 'neutralize' 
                  ? 'Higher values increase removal success but may slightly reduce quality.' 
                  : 'Higher values make the watermark more visible and robust.'}
              </p>
            </div>

            {/* Log Terminal */}
            <div className="mt-auto bg-black rounded-lg border border-white/5 p-3 font-mono text-[10px] text-gray-500 h-36 overflow-y-auto">
              <div className="text-indigo-500 mb-1">$ SYSTEM_LOG</div>
              {log.map((entry, i) => (
                <div key={i} className="text-gray-400">{entry}</div>
              ))}
              {isProcessing && (
                <div className="flex gap-1 mt-1 text-yellow-500">
                  <span className="animate-bounce">.</span>
                  <span className="animate-bounce" style={{animationDelay: '0.1s'}}>.</span>
                  <span className="animate-bounce" style={{animationDelay: '0.2s'}}>.</span>
                </div>
              )}
            </div>

            {/* Action Button */}
            <button
              onClick={processImage}
              disabled={!image || isProcessing}
              className={`mt-4 w-full py-4 rounded-xl font-bold text-sm tracking-wide transition-all flex items-center justify-center gap-2 ${
                !image || isProcessing
                ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                : 'bg-white text-black hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-white/10'
              }`}
            >
              {isProcessing ? `PROCESSING (${progress}%)` : (mode === 'neutralize' ? 'NEUTRALIZE SIGNAL' : 'IMPRINT ID')}
            </button>
          </div>
        </div>

        {/* RIGHT: PREVIEW */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <div className="bg-[#111] border border-white/5 rounded-2xl p-1 flex-1 relative overflow-hidden flex items-center justify-center min-h-[400px]">
            {/* Canvas (Hidden source) */}
            <canvas ref={canvasRef} className="hidden" />

            {!image ? (
              <div className="text-center p-10">
                <div className="w-20 h-20 bg-gray-800/50 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                  <span className="material-symbols-outlined text-4xl text-gray-600">image</span>
                </div>
                <h3 className="text-lg font-medium text-gray-300">No Image Loaded</h3>
                <p className="text-gray-500 text-sm mt-1">Upload an image to begin analysis.</p>
              </div>
            ) : (
              <div className="relative w-full h-full flex items-center justify-center bg-[#050505] rounded-xl overflow-hidden">
                <div className="relative max-w-full max-h-full p-4">
                  {/* Image Display */}
                  <img 
                    src={showCompare && image ? image : (processedImage || image)} 
                    alt="Preview" 
                    className="max-w-full max-h-[60vh] object-contain rounded-lg shadow-2xl"
                  />
                  
                  {/* Compare Badge */}
                  {processedImage && (
                    <div className="absolute top-8 right-8 px-3 py-1 bg-black/70 backdrop-blur text-white text-xs font-bold rounded-full border border-white/10 pointer-events-none">
                      {showCompare ? 'ORIGINAL' : (mode === 'neutralize' ? 'PROCESSED' : 'IMPRINTED')}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Bottom Controls */}
          {processedImage && (
            <div className="bg-[#111] border border-white/5 rounded-2xl p-4 flex items-center justify-between animate-fade-in">
              <div className="flex items-center gap-4">
                <button
                  onMouseDown={() => setShowCompare(true)}
                  onMouseUp={() => setShowCompare(false)}
                  onMouseLeave={() => setShowCompare(false)}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm text-white transition-colors select-none"
                >
                  <Icons.Compare />
                  Hold to Compare
                </button>
              </div>
              
              <a 
                href={processedImage} 
                download={`silencer_${mode}_${Date.now()}.png`}
                className="flex items-center gap-2 px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-bold shadow-lg shadow-indigo-500/20 transition-all hover:scale-105"
              >
                <Icons.Download />
                Download Result
              </a>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default SynthIDRemoverPage;
