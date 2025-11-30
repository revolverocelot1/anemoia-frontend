import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import AnimatedPage from '../components/AnimatedPage';

// --- Utility Functions for Image Processing ---

const applySmartBlur = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
  // Simple approximation of smart blur/median filter to remove high-freq noise
  // This is computationally expensive in pure JS, so we use a simplified approach:
  // 1. Gaussian Blur
  // 2. Sharpen slightly to restore edges
    
  // Pass 1: Blur
  ctx.filter = 'blur(0.8px) contrast(1.1)';
  ctx.drawImage(ctx.canvas, 0, 0);
  ctx.filter = 'none';
};

const applyNoise = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  const factor = 10; // Increased intensity for robustness

  for (let i = 0; i < data.length; i += 4) {
    const rand = (0.5 - Math.random()) * factor;
    data[i] = Math.min(255, Math.max(0, data[i] + rand));
    data[i+1] = Math.min(255, Math.max(0, data[i+1] + rand));
    data[i+2] = Math.min(255, Math.max(0, data[i+2] + rand));
  }
  ctx.putImageData(imageData, 0, 0);
};

const removeVisualWatermark = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
  // Target bottom right corner where the 4-pointed star usually is
  const cornerSize = Math.min(width, height) * 0.08; // Approx 8% of image
  const startX = width - cornerSize;
  const startY = height - cornerSize;

  // Simple "Inpainting" by stretching adjacent pixels
  // We take a sliver of pixels from just left of the watermark and stretch it over
  const sourceX = startX - 5;
  const sourceW = 2;
  
  ctx.drawImage(
    ctx.canvas, 
    sourceX, startY, sourceW, cornerSize, // Source: Strip to the left
    startX, startY, cornerSize, cornerSize // Dest: The corner
  );
  
  // Blur the patch to blend it
  ctx.filter = 'blur(2px)';
  ctx.drawImage(
    ctx.canvas,
    startX, startY, cornerSize, cornerSize,
    startX, startY, cornerSize, cornerSize
  );
  ctx.filter = 'none';
};

const SynthIDRemoverPage: React.FC = () => {
  const [image, setImage] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [logLines, setLogLines] = useState<string[]>([]);
  const [glitch, setGlitch] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addLog = (msg: string) => {
    setLogLines(prev => [...prev.slice(-6), `[${new Date().toLocaleTimeString().split(' ')[0]}] ${msg}`]);
  };

  const loadTestImage = async () => {
      try {
          addLog("LOADING INTERNAL TEST ASSET...");
          const response = await fetch('/test-assets/test_image.png');
          const blob = await response.blob();
          const reader = new FileReader();
          reader.onload = (e) => {
              setImage(e.target?.result as string);
              addLog("ASSET LOADED: Gemini_Generated_Image_8hgzf08hgzf08hgz.png");
          };
          reader.readAsDataURL(blob);
      } catch (e) {
          addLog("ERROR: TEST ASSET NOT FOUND");
      }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setImage(event.target?.result as string);
        addLog(`INPUT DETECTED: ${e.target.files![0].name.toUpperCase()}`);
        setProgress(0);
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const processImage = async () => {
    if (!image || !canvasRef.current) return;
    
    setProcessing(true);
    setGlitch(true);
    setProgress(0);
    addLog("INITIATING NEUTRALIZATION PROTOCOL...");

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    // Load image into canvas first
    const img = new Image();
    img.src = image;
    await new Promise(r => img.onload = r);
    
    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);

    // STAGE 1: VISUAL WATERMARK REMOVAL
    await new Promise(r => setTimeout(r, 800));
    setProgress(20);
    addLog(">> SCANNING FOR VISUAL MARKERS...");
    removeVisualWatermark(ctx, canvas.width, canvas.height);
    addLog(">> VISUAL MARKER: NEUTRALIZED");

    // STAGE 2: GEOMETRIC ATTACK
    await new Promise(r => setTimeout(r, 800));
    setProgress(40);
    addLog(">> APPLYING GEOMETRIC DE-SYNC...");
    // We resize slightly to 99.5% to break pixel grid alignment maybe?
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width * 0.995;
    tempCanvas.height = canvas.height * 0.995;
    tempCanvas.getContext('2d')?.drawImage(canvas, 0, 0, tempCanvas.width, tempCanvas.height);
    // Draw back centered
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(tempCanvas, 
        (canvas.width - tempCanvas.width) / 2, 
        (canvas.height - tempCanvas.height) / 2
    );

    // STAGE 3: FREQUENCY FILTERING
    await new Promise(r => setTimeout(r, 800));
    setProgress(60);
    addLog(">> SCRAMBLING HIGH-FREQ BANDS...");
    applySmartBlur(ctx, canvas.width, canvas.height);

    // STAGE 4: NOISE INJECTION
    await new Promise(r => setTimeout(r, 800));
    setProgress(80);
    addLog(">> INJECTING ADVERSARIAL NOISE...");
    applyNoise(ctx, canvas.width, canvas.height);

    // STAGE 5: COMPRESSION & OUTPUT
    await new Promise(r => setTimeout(r, 1000));
    setProgress(100);
    addLog(">> RE-ENCODING SIGNAL...");
    
    // Force JPEG compression to destroy remaining latent structures
    const finalDataUrl = canvas.toDataURL('image/jpeg', 0.85);
    
    // Reload final result
    const finalImg = new Image();
    finalImg.onload = () => {
        ctx.drawImage(finalImg, 0, 0);
        setProcessing(false);
        setGlitch(false);
        addLog("PROCESS COMPLETE. SIGNAL CLEAN.");
    };
    finalImg.src = finalDataUrl;
  };

  // --- Styles ---
  const cyberBorder = "border border-[#00f0ff]/30 bg-[#020617]/90 backdrop-blur-md relative overflow-hidden";
  const cornerAccent = (
    <>
      <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-[#00f0ff]" />
      <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-[#00f0ff]" />
      <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-[#00f0ff]" />
      <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-[#00f0ff]" />
    </>
  );

  return (
    <AnimatedPage>
      <div className="min-h-screen bg-[#050505] text-[#e2e8f0] font-mono selection:bg-[#00f0ff] selection:text-black overflow-x-hidden">
        
        {/* Background Elements */}
        <div className="fixed inset-0 z-0 pointer-events-none">
            <div className="absolute inset-0 bg-[linear-gradient(transparent_1px,#00f0ff_1px),linear-gradient(90deg,transparent_1px,#00f0ff_1px)] bg-[size:50px_50px] opacity-[0.03]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#000_100%)]" />
        </div>

        {/* Header */}
        <header className="relative z-10 border-b border-[#00f0ff]/20 bg-[#020617]/80 backdrop-blur-lg">
            <div className="max-w-[1600px] mx-auto px-6 h-16 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link to="/" className="flex items-center gap-2 text-[#00f0ff] hover:text-white transition-colors group">
                        <span className="material-symbols-outlined group-hover:-translate-x-1 transition-transform">arrow_back_ios_new</span>
                        <span className="font-bold tracking-widest text-sm">BACK</span>
                    </Link>
                    <div className="h-8 w-px bg-[#00f0ff]/20" />
                    <h1 className="font-bold tracking-[0.2em] text-white flex items-center gap-3">
                        <span className="text-[#00f0ff] text-xl">PROJECT SILENCER</span>
                        <span className="text-[10px] bg-[#00f0ff]/10 border border-[#00f0ff]/30 px-2 py-0.5 rounded text-[#00f0ff]">V 2.0.4</span>
                    </h1>
                </div>
                <div className="flex items-center gap-6 text-xs font-bold tracking-widest">
                     <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[#00f0ff] animate-pulse shadow-[0_0_10px_#00f0ff]" />
                        SYSTEM ONLINE
                     </div>
                     <div className="text-[#00f0ff]/50">
                        SECURE CONNECTION
                     </div>
                </div>
            </div>
        </header>

        {/* Main Interface */}
        <main className="relative z-10 max-w-[1600px] mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-64px)]">
            
            {/* Left Panel: Controls (3 cols) */}
            <div className="lg:col-span-3 flex flex-col gap-4">
                {/* Input Section */}
                <div className={`${cyberBorder} p-6 flex flex-col gap-4`}>
                    {cornerAccent}
                    <h2 className="text-[#00f0ff] font-bold tracking-widest text-sm flex items-center gap-2">
                        <span className="material-symbols-outlined text-sm">input</span>
                        SOURCE INPUT
                    </h2>
                    
                    <input 
                        type="file" 
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        className="hidden"
                    />
                    
                    <div className="grid grid-cols-2 gap-2">
                        <button 
                            onClick={() => fileInputRef.current?.click()}
                            className="h-24 border border-dashed border-[#00f0ff]/30 hover:border-[#00f0ff] hover:bg-[#00f0ff]/5 transition-all flex flex-col items-center justify-center gap-2 group"
                        >
                            <span className="material-symbols-outlined text-[#00f0ff]/50 group-hover:text-[#00f0ff] transition-colors">upload_file</span>
                            <span className="text-[10px] tracking-widest text-[#00f0ff]/70">UPLOAD FILE</span>
                        </button>
                        <button 
                            onClick={loadTestImage}
                            className="h-24 border border-dashed border-[#ff3333]/30 hover:border-[#ff3333] hover:bg-[#ff3333]/5 transition-all flex flex-col items-center justify-center gap-2 group"
                        >
                             <span className="material-symbols-outlined text-[#ff3333]/50 group-hover:text-[#ff3333] transition-colors">bug_report</span>
                             <span className="text-[10px] tracking-widest text-[#ff3333]/70">LOAD TEST</span>
                        </button>
                    </div>
                </div>

                {/* Operation Log */}
                <div className={`${cyberBorder} flex-1 p-4 flex flex-col`}>
                    {cornerAccent}
                    <h2 className="text-[#00f0ff] font-bold tracking-widest text-sm mb-4 flex items-center gap-2">
                        <span className="material-symbols-outlined text-sm">terminal</span>
                        SYSTEM LOG
                    </h2>
                    <div className="flex-1 font-mono text-[10px] text-[#00f0ff]/80 space-y-1 overflow-hidden">
                        {logLines.map((line, i) => (
                            <motion.div 
                                key={i}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="border-l border-[#00f0ff]/30 pl-2"
                            >
                                {line}
                            </motion.div>
                        ))}
                        <motion.div 
                            animate={{ opacity: [0, 1, 0] }}
                            transition={{ repeat: Infinity, duration: 0.8 }}
                            className="text-[#00f0ff]"
                        >
                            _
                        </motion.div>
                    </div>
                </div>

                {/* Action Button */}
                <button
                    onClick={processImage}
                    disabled={!image || processing}
                    className={`h-16 relative group overflow-hidden ${
                        !image ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                    }`}
                >
                    <div className={`absolute inset-0 ${processing ? 'bg-[#ff3333]' : 'bg-[#00f0ff]'} opacity-10 group-hover:opacity-20 transition-opacity`} />
                    <div className={`absolute inset-0 border ${processing ? 'border-[#ff3333]' : 'border-[#00f0ff]'} flex items-center justify-center gap-3 tracking-[0.2em] font-bold ${processing ? 'text-[#ff3333]' : 'text-[#00f0ff]'}`}>
                        {processing ? (
                            <>
                                <span className="material-symbols-outlined animate-spin">settings</span>
                                PROCESSING...
                            </>
                        ) : (
                            <>
                                <span className="material-symbols-outlined">lock_open</span>
                                EXECUTE REMOVAL
                            </>
                        )}
                    </div>
                    {/* Scanning Line Animation */}
                    <div className={`absolute top-0 bottom-0 w-1 ${processing ? 'bg-[#ff3333]' : 'bg-[#00f0ff]'} opacity-50 blur-[2px] animate-[scan_2s_linear_infinite]`} />
                </button>
            </div>

            {/* Right Panel: Visualization (9 cols) */}
            <div className="lg:col-span-9 relative h-full">
                <div className={`${cyberBorder} h-full w-full flex items-center justify-center bg-[#000] p-1 relative`}>
                    {cornerAccent}
                    
                    {/* Processing Overlay Grid */}
                    <div className="absolute inset-0 z-10 pointer-events-none bg-[linear-gradient(transparent_95%,rgba(0,240,255,0.1)_95%)] bg-[size:100%_20px]" />
                    
                    {/* Canvas Container */}
                    <div className="relative max-w-full max-h-full overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)]">
                         <canvas 
                            ref={canvasRef}
                            className="max-w-full max-h-full block"
                            style={{
                                filter: glitch ? 'hue-rotate(90deg) contrast(1.2)' : 'none',
                                transition: 'filter 0.1s'
                            }}
                         />
                         
                         {/* Glitch Layers */}
                         <AnimatePresence>
                            {processing && (
                                <>
                                    <motion.div 
                                        className="absolute inset-0 bg-[#00f0ff] mix-blend-overlay z-20"
                                        animate={{ opacity: [0, 0.3, 0] }}
                                        transition={{ duration: 0.1, repeat: Infinity, repeatDelay: Math.random() }}
                                    />
                                    <motion.div 
                                        className="absolute top-0 left-0 w-full h-1 bg-[#ff3333] z-20"
                                        animate={{ top: ["0%", "100%"] }}
                                        transition={{ duration: 1.5, ease: "linear", repeat: Infinity }}
                                    />
                                </>
                            )}
                         </AnimatePresence>

                         {!image && (
                             <div className="absolute inset-0 flex flex-col items-center justify-center text-[#00f0ff]/30 gap-4">
                                 <span className="material-symbols-outlined text-6xl">satellite_alt</span>
                                 <span className="tracking-[0.5em] text-sm">AWAITING SIGNAL INPUT</span>
                             </div>
                         )}
                    </div>

                    {/* Progress Bar */}
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#00f0ff]/10">
                        <motion.div 
                            className="h-full bg-[#00f0ff] shadow-[0_0_10px_#00f0ff]"
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                        />
                    </div>
                </div>
            </div>

        </main>
      </div>
    </AnimatedPage>
  );
};

export default SynthIDRemoverPage;
