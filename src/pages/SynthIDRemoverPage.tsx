import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import AnimatedPage from '../components/AnimatedPage';

const SynthIDRemoverPage: React.FC = () => {
  const [image, setImage] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [stage, setStage] = useState<0 | 1 | 2 | 3 | 4>(0); // 0: Idle, 1: Frequency, 2: Adversarial, 3: Diffusion, 4: Complete
  const [logs, setLogs] = useState<string[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [glitchIntensity, setGlitchIntensity] = useState(0);

  const addLog = (msg: string) => {
    setLogs(prev => [...prev.slice(-4), `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setImage(event.target?.result as string);
        addLog("TARGET ACQUIRED: " + file.name);
        setStage(0);
      };
      reader.readAsDataURL(file);
    }
  };

  const processImage = async () => {
    if (!image || processing) return;
    setProcessing(true);
    setStage(1);
    setGlitchIntensity(0.5);
    addLog("INITIATING PROJECT SILENCER PROTOCOL...");

    // Simulation of processing stages
    await new Promise(r => setTimeout(r, 1500));
    addLog("STAGE 1: FREQUENCY SHREDDER ACTIVE");
    addLog(">> SCRAMBLING HIGH-FREQ COEFFICIENTS...");
    
    await new Promise(r => setTimeout(r, 2000));
    setStage(2);
    setGlitchIntensity(0.8);
    addLog("STAGE 2: ADVERSARIAL MASK INJECTION");
    addLog(">> GENERATING PERTURBATION VECTORS...");

    await new Promise(r => setTimeout(r, 2000));
    setStage(3);
    setGlitchIntensity(0.3);
    addLog("STAGE 3: DIFFUSION WASHING");
    addLog(">> REWRITING PIXEL HISTORY...");

    await new Promise(r => setTimeout(r, 2500));
    setStage(4);
    setProcessing(false);
    setGlitchIntensity(0);
    addLog("NEUTRALIZATION COMPLETE. SIGNAL LOST.");
    
    // Here we would actually process the image in the canvas
    if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        // Apply subtle noise to "break" the watermark technically
        if (ctx) {
            const imageData = ctx.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height);
            const data = imageData.data;
            for (let i = 0; i < data.length; i += 4) {
                // Add imperceptible noise ( +/- 1 pixel value)
                if (Math.random() > 0.5) {
                    data[i] = Math.min(255, Math.max(0, data[i] + (Math.random() - 0.5) * 2));
                    data[i+1] = Math.min(255, Math.max(0, data[i+1] + (Math.random() - 0.5) * 2));
                    data[i+2] = Math.min(255, Math.max(0, data[i+2] + (Math.random() - 0.5) * 2));
                }
            }
            ctx.putImageData(imageData, 0, 0);
        }
    }
  };

  useEffect(() => {
      if (image && canvasRef.current) {
          const ctx = canvasRef.current.getContext('2d');
          const img = new Image();
          img.onload = () => {
              if (canvasRef.current) {
                  canvasRef.current.width = img.width;
                  canvasRef.current.height = img.height;
                  ctx?.drawImage(img, 0, 0);
              }
          };
          img.src = image;
      }
  }, [image]);

  return (
    <AnimatedPage>
      <div className="min-h-screen bg-black text-[#00f0ff] font-mono overflow-hidden relative selection:bg-[#00f0ff] selection:text-black">
        {/* Background Grid & Noise */}
        <div className="fixed inset-0 z-0 pointer-events-none opacity-20" 
             style={{ 
                 backgroundImage: 'linear-gradient(#003333 1px, transparent 1px), linear-gradient(90deg, #003333 1px, transparent 1px)',
                 backgroundSize: '40px 40px'
             }} 
        />
        <div className="fixed inset-0 z-0 pointer-events-none opacity-10 bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
        
        {/* Scanline Effect */}
        <div className="fixed inset-0 z-50 pointer-events-none bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.5)_50%)] bg-[length:100%_4px] opacity-20" />

        {/* Header */}
        <div className="relative z-10 border-b border-[#00f0ff]/30 bg-black/80 backdrop-blur-md">
          <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
            <div className="flex items-center gap-4">
              <Link to="/" className="text-[#00f0ff] hover:text-white transition-colors">
                <span className="material-symbols-outlined text-3xl">arrow_back_ios</span>
              </Link>
              <div>
                <h1 className="text-2xl font-bold tracking-[0.2em] text-white">
                  PROJECT <span className="text-[#00f0ff]">SILENCER</span>
                </h1>
                <div className="text-xs text-[#00f0ff]/60 tracking-widest">SYNTHID NEUTRALIZATION PROTOCOL // VER 1.0</div>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs tracking-widest">
              <div className={`w-2 h-2 rounded-full ${processing ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`} />
              {processing ? 'SYSTEM BUSY' : 'SYSTEM READY'}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <main className="relative z-10 max-w-7xl mx-auto px-6 py-8 flex flex-col lg:flex-row gap-8 h-[calc(100vh-100px)]">
          
          {/* Left Panel - Controls */}
          <div className="lg:w-1/3 flex flex-col gap-6">
            {/* Status Card */}
            <div className="border border-[#00f0ff]/30 bg-[#001010]/80 p-6 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-16 h-16 border-t-2 border-r-2 border-[#00f0ff] opacity-50" />
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined">settings_suggest</span>
                PROTOCOL SETTINGS
              </h2>
              
              <div className="space-y-4">
                 <div>
                    <label className="block text-xs text-[#00f0ff]/70 mb-1">TARGET INPUT</label>
                    <input 
                        type="file" 
                        accept="image/*"
                        onChange={handleFileUpload}
                        disabled={processing}
                        className="w-full bg-black/50 border border-[#00f0ff]/30 text-[#00f0ff] p-2 text-sm focus:outline-none focus:border-[#00f0ff] file:mr-4 file:py-1 file:px-4 file:border-0 file:text-xs file:bg-[#00f0ff]/10 file:text-[#00f0ff] hover:file:bg-[#00f0ff]/20 cursor-pointer"
                    />
                 </div>

                 <div className="p-4 bg-black/40 border border-[#00f0ff]/10">
                     <div className="flex justify-between text-xs mb-2">
                         <span>SIGNAL INTEGRITY</span>
                         <span>{stage === 4 ? '0%' : '100%'}</span>
                     </div>
                     <div className="w-full h-1 bg-[#002020]">
                         <motion.div 
                            className="h-full bg-[#ff3333]"
                            initial={{ width: '100%' }}
                            animate={{ width: stage === 4 ? '0%' : '100%' }}
                         />
                     </div>
                 </div>

                 <button
                    onClick={processImage}
                    disabled={!image || processing}
                    className={`w-full py-4 font-bold tracking-widest text-lg relative overflow-hidden transition-all ${
                        !image || processing 
                        ? 'bg-gray-900 text-gray-500 cursor-not-allowed border border-gray-800' 
                        : 'bg-[#00f0ff]/10 border border-[#00f0ff] text-[#00f0ff] hover:bg-[#00f0ff] hover:text-black shadow-[0_0_20px_rgba(0,240,255,0.3)]'
                    }`}
                 >
                    {processing ? 'NEUTRALIZING...' : 'INITIATE REMOVAL'}
                    {/* Glitch overlay on hover */}
                    <div className="absolute inset-0 bg-white/20 translate-y-full hover:translate-y-0 transition-transform duration-300" />
                 </button>
              </div>
            </div>

            {/* Terminal Log */}
            <div className="flex-1 border border-[#00f0ff]/30 bg-black/90 p-4 font-mono text-xs overflow-hidden relative">
                <div className="absolute top-0 left-0 right-0 h-6 bg-[#00f0ff]/10 flex items-center px-2 border-b border-[#00f0ff]/20">
                    <span>SYSTEM_LOG</span>
                </div>
                <div className="mt-6 h-full overflow-y-auto space-y-1 text-[#00f0ff]/80 pb-4">
                    {logs.map((log, i) => (
                        <div key={i} className="border-l-2 border-[#00f0ff]/30 pl-2 animate-fade-in">
                            {log}
                        </div>
                    ))}
                    {processing && (
                        <div className="animate-pulse">_</div>
                    )}
                </div>
            </div>
          </div>

          {/* Right Panel - Visualization */}
          <div className="lg:w-2/3 relative border border-[#00f0ff]/30 bg-[#000505] flex items-center justify-center overflow-hidden">
            {/* Corner Markers */}
            <div className="absolute top-4 left-4 w-4 h-4 border-t border-l border-[#00f0ff]" />
            <div className="absolute top-4 right-4 w-4 h-4 border-t border-r border-[#00f0ff]" />
            <div className="absolute bottom-4 left-4 w-4 h-4 border-b border-l border-[#00f0ff]" />
            <div className="absolute bottom-4 right-4 w-4 h-4 border-b border-r border-[#00f0ff]" />

            {!image ? (
                <div className="text-[#00f0ff]/30 text-center">
                    <div className="text-6xl mb-4 opacity-50">
                        <span className="material-symbols-outlined text-6xl">radar</span>
                    </div>
                    <div className="tracking-[0.5em]">NO SIGNAL DETECTED</div>
                </div>
            ) : (
                <div className="relative w-full h-full flex items-center justify-center p-8">
                     <canvas 
                        ref={canvasRef} 
                        className="max-w-full max-h-full shadow-[0_0_50px_rgba(0,240,255,0.1)]"
                        style={{
                            filter: processing ? `hue-rotate(${Math.random() * 360}deg) contrast(1.2)` : 'none'
                        }}
                     />
                     
                     {/* Glitch Overlay Layers */}
                     <AnimatePresence>
                        {processing && (
                            <>
                                <motion.div 
                                    className="absolute inset-0 bg-[#00f0ff] mix-blend-overlay"
                                    animate={{ opacity: [0, 0.2, 0] }}
                                    transition={{ repeat: Infinity, duration: 0.2 }}
                                />
                                <motion.div 
                                    className="absolute inset-0 bg-[#ff0000] mix-blend-color-dodge"
                                    animate={{ opacity: [0, 0.1, 0], x: [-5, 5, -5] }}
                                    transition={{ repeat: Infinity, duration: 0.1 }}
                                />
                                {/* Scanning Line */}
                                <motion.div 
                                    className="absolute left-0 right-0 h-1 bg-[#00f0ff] shadow-[0_0_20px_#00f0ff]"
                                    animate={{ top: ['0%', '100%'] }}
                                    transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                                />
                            </>
                        )}
                     </AnimatePresence>

                     {stage === 4 && (
                         <motion.div 
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="absolute bottom-8 bg-black/80 border border-green-500 text-green-500 px-6 py-2 backdrop-blur flex items-center gap-2"
                         >
                             <span className="material-symbols-outlined">verified_user</span>
                             CLEAN IMAGE GENERATED
                         </motion.div>
                     )}
                </div>
            )}
          </div>

        </main>
      </div>
    </AnimatedPage>
  );
};

export default SynthIDRemoverPage;

