import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import IconGeminiWatermarkRemover from '../../components/icons/IconGeminiWatermarkRemover';
import {
  Sparkles,
  Zap,
  ShieldCheck,
  Film,
  Layers,
  ArrowRight,
  Sliders,
  Maximize2,
  Check,
  X,
  Cpu,
  Lock,
  Eye,
  Activity,
  FileCheck,
  HelpCircle,
  ChevronDown
} from 'lucide-react';

export const GeminiWatermarkLanding: React.FC = () => {
  // ── Scroll Management ──
  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress: heroScroll } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start']
  });
  const heroTextY = useTransform(heroScroll, [0, 1], ['0%', '35%']);

  // ── Interactive Split Slider State ──
  const [sliderPos, setSliderPos] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const [showRoiBox, setShowRoiBox] = useState(true);
  const [zoomLevel, setZoomLevel] = useState<number>(4.5);
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const sliderContainerRef = useRef<HTMLDivElement>(null);

  const getZoomStyle = (level: number) => {
    if (level <= 1) {
      return {
        transform: 'scale(1) translate(0%, 0%)',
        transformOrigin: '0% 0%',
      };
    }
    // Center of watermark in 1024x1024 image is at (964, 963) = (94.14%, 94.04%)
    const wmX = 0.9414;
    const wmY = 0.9404;
    const tx = (0.5 / level - wmX) * 100;
    const ty = (0.5 / level - wmY) * 100;
    return {
      transform: `scale(${level}) translate(${tx.toFixed(2)}%, ${ty.toFixed(2)}%)`,
      transformOrigin: '0% 0%',
    };
  };

  const handleSliderMove = useCallback((clientX: number) => {
    if (!sliderContainerRef.current) return;
    const rect = sliderContainerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPos(percentage);
  }, []);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (isDragging) handleSliderMove(e.clientX);
    };
    const onMouseUp = () => setIsDragging(false);

    if (isDragging) {
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [isDragging, handleSliderMove]);

  // ── SEO Setup ──
  useEffect(() => {
    document.title = 'Gemini & Veo Watermark Remover — Zero-Loss Reverse Alpha Blending | Anemoia';
    const setMeta = (name: string, content: string, attr = 'name') => {
      let el = document.querySelector(`meta[${attr}="${name}"]`);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attr, name);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    };

    setMeta('description', 'Mathematically remove the visible Google Gemini & Veo star watermark from images and 4K videos. 100% private, client-side reverse alpha blending with zero pixel degradation.');
    setMeta('keywords', 'gemini watermark remover, veo watermark remover, remove google gemini logo, reverse alpha blending, zero loss watermark remover, imagen 3 watermark remover, browser watermark remover, webcodecs video watermark removal');
    setMeta('og:title', 'Gemini & Veo Watermark Remover — Pure Lossless Inversion', 'property');
    setMeta('og:description', 'Mathematically inverts Google visible watermarks without AI hallucination or blur patches. 100% client-side in browser.', 'property');
  }, []);

  return (
    <div className="relative min-h-screen bg-[#050508] text-[#f1f5f9] overflow-x-hidden selection:bg-cyan-500/30 font-sans">
      <Header />

      {/* 
        ═══════════════════════════════════════════════════════════════════════
        1. HERO SECTION: ARCHITECTURAL MONOSPACE TELEMETRY & EDITORIAL HEADLINE
        ═══════════════════════════════════════════════════════════════════════ 
      */}
      <section ref={heroRef} className="relative pt-32 pb-20 md:pt-44 md:pb-32 px-4 sm:px-6 lg:px-8 overflow-hidden">
        {/* Architectural Background Wireframe Grid */}
        <div className="absolute inset-0 pointer-events-none opacity-25">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#06b6d40f_1px,transparent_1px),linear-gradient(to_bottom,#06b6d40f_1px,transparent_1px)] bg-[size:48px_48px]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(6,182,212,0.12)_0%,transparent_65%)]" />
        </div>

        {/* Massive Background Typography */}
        <motion.div
          style={{ y: heroTextY }}
          className="absolute inset-0 flex items-center justify-center pointer-events-none z-0"
        >
          <span className="text-[14vw] leading-none font-black tracking-tighter text-white/[0.03] select-none uppercase font-mono">
            REVERSE-ALPHA
          </span>
        </motion.div>

        <div className="max-w-6xl mx-auto relative z-10 text-center">
          {/* Engineering Monospace Telemetry Strip */}
          <div className="inline-flex flex-wrap items-center justify-center gap-2 md:gap-4 px-4 py-2 rounded-full bg-slate-900/80 border border-cyan-500/30 text-[11px] font-mono text-cyan-300 mb-8 backdrop-blur-md shadow-[0_0_30px_rgba(6,182,212,0.15)]">
            <span className="flex items-center gap-1.5 font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              STATUS: PRODUCTION ENGINE ACTIVE
            </span>
            <span className="text-slate-600 hidden sm:inline">|</span>
            <span className="text-slate-300 hidden sm:inline">PRECISION: DETERMINISTIC 32-BIT FLOAT</span>
            <span className="text-slate-600 hidden md:inline">|</span>
            <span className="text-cyan-400 hidden md:inline">LATENCY: ~12ms LOCKED-ROI</span>
          </div>

          {/* Primary Editorial Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-tight leading-[1.05] text-white"
          >
            Erase Google’s Watermark. <br />
            <span className="font-serif italic font-normal bg-gradient-to-r from-cyan-300 via-sky-200 to-indigo-300 bg-clip-text text-transparent">
              Restore Untouched Pixels.
            </span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="mt-6 text-base sm:text-xl text-slate-300 max-w-3xl mx-auto leading-relaxed font-light"
          >
            No blurry AI inpainting. No hallucinated textures. Our engine solves the exact 
            reverse compositing algebraic equation to extract and remove the Gemini and Veo 
            star logo from every frame — directly on your GPU inside the browser.
          </motion.p>

          {/* Dual Action CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.25 }}
            className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link to="/gemini-watermark-remover">
              <button className="px-8 py-4 bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:via-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-[0_0_40px_rgba(6,182,212,0.35)] hover:shadow-[0_0_60px_rgba(6,182,212,0.5)] transition-all duration-300 flex items-center gap-3 text-base group">
                <IconGeminiWatermarkRemover className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                <span>Launch Watermark Remover</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </Link>
            <a
              href="#interactive-demo"
              className="px-7 py-4 rounded-xl border border-slate-800 bg-slate-900/60 hover:bg-slate-800/80 text-slate-200 hover:text-white transition-colors text-base font-medium flex items-center gap-2"
            >
              <Eye className="w-4 h-4 text-cyan-400" />
              <span>Inspect Live Interactive Demo</span>
            </a>
          </motion.div>

          {/* Trust Matrix Badges */}
          <div className="mt-14 pt-8 border-t border-white/[0.08] grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto text-left">
            <div className="p-3 rounded-lg bg-slate-900/40 border border-white/[0.05]">
              <div className="flex items-center gap-2 text-emerald-400 text-xs font-mono mb-1">
                <ShieldCheck className="w-4 h-4" /> 100% PRIVATE
              </div>
              <div className="text-slate-300 text-xs font-medium">Zero server uploads. Runs locally via WebGL/WASM.</div>
            </div>
            <div className="p-3 rounded-lg bg-slate-900/40 border border-white/[0.05]">
              <div className="flex items-center gap-2 text-cyan-400 text-xs font-mono mb-1">
                <Zap className="w-4 h-4" /> ZERO HALLUCINATION
              </div>
              <div className="text-slate-300 text-xs font-medium">Deterministic math replaces guesswork and diffusion.</div>
            </div>
            <div className="p-3 rounded-lg bg-slate-900/40 border border-white/[0.05]">
              <div className="flex items-center gap-2 text-purple-400 text-xs font-mono mb-1">
                <Film className="w-4 h-4" /> 4K VEO VIDEO
              </div>
              <div className="text-slate-300 text-xs font-medium">WebCodecs hardware acceleration at 60–120 FPS.</div>
            </div>
            <div className="p-3 rounded-lg bg-slate-900/40 border border-white/[0.05]">
              <div className="flex items-center gap-2 text-amber-400 text-xs font-mono mb-1">
                <Layers className="w-4 h-4" /> MULTI-CORE BATCH
              </div>
              <div className="text-slate-300 text-xs font-medium">Batch process folders with instant ZIP export.</div>
            </div>
          </div>
        </div>
      </section>

      {/* 
        ═══════════════════════════════════════════════════════════════════════
        2. INTERACTIVE BEFORE / AFTER DEMO SHOWCASE
        ═══════════════════════════════════════════════════════════════════════ 
      */}
      <section id="interactive-demo" className="py-20 px-4 sm:px-6 lg:px-8 bg-[#07070D] border-y border-white/[0.08] relative">
        <div className="max-w-6xl mx-auto">
          {/* Section Header */}
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="text-cyan-400 text-xs font-mono tracking-widest uppercase mb-2 block">
              REAL-WORLD EMPIRICAL VERIFICATION
            </span>
            <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
              Drag to Inspect: Zero Blur, Zero Inpainting Patch
            </h2>
            <p className="mt-3 text-slate-400 text-sm sm:text-base">
              Original Google Imagen 3 monochrome portrait with the small watermark star in the bottom-right corner vs. our deterministic reverse-alpha output. Use the <strong>Macro Zoom</strong> below to inspect the exact difference where the watermark was erased.
            </p>
          </div>

          {/* Interactive Comparison Card Container */}
          <div className="relative rounded-3xl p-3 sm:p-5 bg-gradient-to-b from-slate-900/80 to-slate-950/90 border border-cyan-500/30 shadow-[0_0_80px_rgba(6,182,212,0.15)] max-w-4xl mx-auto">
            {/* Telemetry Bar Above Preview */}
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 mb-3 rounded-xl bg-black/50 border border-white/[0.06] text-xs font-mono text-slate-400">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400" />
                <span className="text-white font-bold">SOURCE:</span> 1024×1024 sRGB (Real User Upload)
              </div>
              <div className="flex items-center gap-4">
                <span>DETECTED ROI: <strong className="text-cyan-300">x:950 y:949 (28×28 px)</strong></span>
                <span>CONFIDENCE: <strong className="text-emerald-400">100.0%</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowRoiBox(!showRoiBox)}
                  className={`px-2.5 py-1 rounded border text-[11px] transition-colors ${
                    showRoiBox
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
                >
                  {showRoiBox ? 'Hide Watermark ROI Box' : 'Show Watermark ROI Box'}
                </button>
              </div>
            </div>

            {/* Interactive Zoom Mode Selector */}
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2 mb-4 rounded-xl bg-slate-950/70 border border-cyan-500/20">
              <div className="flex items-center gap-2 text-xs font-mono text-slate-300">
                <span className="text-cyan-400 font-bold">MAGNIFICATION:</span>
                <span className="text-slate-400 hidden sm:inline">Zoom in to inspect small watermark removal</span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setZoomLevel(4.5)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all ${
                    zoomLevel === 4.5
                      ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-[0_0_20px_rgba(6,182,212,0.5)] border border-cyan-400/50 scale-105'
                      : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-white/10'
                  }`}
                >
                  <Maximize2 className="w-3.5 h-3.5 text-cyan-300" />
                  <span>4.5× Macro (Watermark Difference)</span>
                </button>
                <button
                  onClick={() => setZoomLevel(2.5)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-medium transition-all ${
                    zoomLevel === 2.5
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                      : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-white/10'
                  }`}
                >
                  <span>2.5× Context</span>
                </button>
                <button
                  onClick={() => setZoomLevel(1)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-medium transition-all ${
                    zoomLevel === 1
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                      : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-white/10'
                  }`}
                >
                  <span>1× Full Portrait</span>
                </button>
              </div>
            </div>

            {/* Split Comparison Canvas */}
            <div
              ref={sliderContainerRef}
              onMouseDown={() => setIsDragging(true)}
              onTouchStart={() => setIsDragging(true)}
              className="relative w-full max-w-[680px] mx-auto aspect-square rounded-2xl overflow-hidden cursor-ew-resize select-none border border-white/[0.08] bg-black shadow-2xl"
            >
              {/* Clean Output Image (Background / Right Side) */}
              <div
                className="absolute inset-0 transition-transform duration-500 ease-out pointer-events-none"
                style={getZoomStyle(zoomLevel)}
              >
                <img
                  src="/test-images/gemini-watermark-after.jpg"
                  alt="Gemini image cleaned without watermark"
                  className="w-full h-full object-cover pointer-events-none"
                />
              </div>

              {/* Watermarked Original Image (Clipped / Left Side) */}
              <div
                className="absolute inset-0 overflow-hidden pointer-events-none"
                style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}
              >
                <div
                  className="w-full h-full transition-transform duration-500 ease-out"
                  style={getZoomStyle(zoomLevel)}
                >
                  <img
                    src="/test-images/gemini-watermark-before.jpg"
                    alt="Original Gemini image with visible watermark"
                    className="w-full h-full object-cover"
                  />

                  {/* Optional Watermark ROI Marker */}
                  {showRoiBox && (
                    <div
                      className="absolute border-2 border-dashed border-red-500 bg-red-500/15 pointer-events-none rounded transition-all shadow-[0_0_15px_rgba(239,68,68,0.5)]"
                      style={{
                        left: '92.4%',
                        top: '92.3%',
                        width: '3.4%',
                        height: '3.4%'
                      }}
                    >
                      <span className="absolute -top-5 right-0 bg-red-500 text-white text-[9px] font-mono px-1.5 py-0.5 rounded shadow whitespace-nowrap">
                        WATERMARK (28×28)
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Split Slider Divider Line */}
              <div
                className="absolute top-0 bottom-0 w-[2px] bg-white shadow-[0_0_15px_rgba(255,255,255,0.8)] pointer-events-none"
                style={{ left: `${sliderPos}%` }}
              >
                {/* Drag Handle Button */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-slate-900 border-2 border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.6)] flex items-center justify-center text-cyan-400">
                  <Sliders className="w-5 h-5 rotate-90" />
                </div>
              </div>

              {/* Overlay Side Indicators */}
              <div className="absolute top-4 left-4 pointer-events-none px-3 py-1 rounded-md bg-black/70 backdrop-blur-md border border-white/10 text-xs font-mono text-slate-300">
                BEFORE: Watermarked
              </div>
              <div className="absolute top-4 right-4 pointer-events-none px-3 py-1 rounded-md bg-cyan-950/80 backdrop-blur-md border border-cyan-500/30 text-xs font-mono text-cyan-300 font-bold">
                AFTER: 100% Inverted Clean
              </div>

              {/* Zoom Telemetry Pill Inside Viewport */}
              {zoomLevel > 1 && (
                <div className="absolute bottom-4 left-4 pointer-events-none px-3 py-1.5 rounded-full bg-slate-950/90 backdrop-blur-md border border-cyan-500/40 text-[11px] font-mono text-cyan-300 flex items-center gap-2 shadow-xl">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                  <span>MACRO ZOOM: {zoomLevel}× FOCUSED ON WATERMARK (x:950, y:949)</span>
                </div>
              )}
            </div>

            {/* Slider Percentage & Instructions */}
            <div className="mt-4 flex items-center justify-between text-xs text-slate-400 font-mono px-2">
              <span>← ORIGINAL WITH WATERMARK</span>
              <span className="text-cyan-400 font-bold">{Math.round(sliderPos)}% SPLIT POSITION</span>
              <span>RESTORED ORIGINAL PIXELS →</span>
            </div>
          </div>
        </div>
      </section>

      {/* 
        ═══════════════════════════════════════════════════════════════════════
        3. THE MATHEMATICS: WHY REVERSE ALPHA BEATS AI INPAINTING
        ═══════════════════════════════════════════════════════════════════════ 
      */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 relative">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-indigo-400 text-xs font-mono tracking-widest uppercase mb-2 block">
              DETERMINISTIC INVERSION vs. GENERATIVE HALLUCINATION
            </span>
            <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
              The Exact Math Behind The Restoration
            </h2>
            <p className="mt-3 text-slate-400 text-base">
              Standard watermark removers rely on AI diffusion models (LaMa / SD) that smudge the area and hallucinate replacement pixels. 
              Anemoia treats watermarking as a reversible linear transformation.
            </p>
          </div>

          {/* Formula Display Showcase */}
          <div className="p-6 sm:p-10 rounded-3xl bg-slate-900/60 border border-white/[0.08] backdrop-blur-md mb-16 text-center relative overflow-hidden">
            <div className="text-xs font-mono text-cyan-400 mb-3 uppercase tracking-wider">
              Fundamental Alpha Compositing Equation
            </div>
            <div className="text-lg sm:text-2xl md:text-3xl font-mono text-white font-bold tracking-tight bg-black/40 py-6 px-4 rounded-2xl border border-white/[0.05] inline-block max-w-full overflow-x-auto">
              <span>C_clean = ( C_watermarked - α · C_logo ) / ( 1 - α )</span>
            </div>
            <p className="mt-4 text-xs sm:text-sm text-slate-400 max-w-2xl mx-auto">
              Where <code className="text-cyan-300">α</code> is Google's calibrated watermark opacity mask and <code className="text-cyan-300">C_logo</code> is the white luminescence reference. By calculating the exact localized alpha gradient across all color channels, every original sub-pixel is analytically recovered.
            </p>
          </div>

          {/* Step-by-Step Technical Execution Pipeline */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="p-6 rounded-2xl bg-slate-900/40 border border-white/[0.06] flex flex-col justify-between hover:border-cyan-500/40 transition-colors">
              <div>
                <span className="text-3xl font-black text-cyan-500/30 font-mono">01</span>
                <h3 className="text-base font-bold text-white mt-2 mb-1">Tier 1 Fixed-ROI Probe</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Scans the canonical bottom-right corner in 12 microseconds. If standard Imagen offsets are present, detection locks immediately.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-white/[0.05] text-[11px] font-mono text-cyan-400">
                Latency: &lt; 0.05ms
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900/40 border border-white/[0.06] flex flex-col justify-between hover:border-cyan-500/40 transition-colors">
              <div>
                <span className="text-3xl font-black text-blue-500/30 font-mono">02</span>
                <h3 className="text-base font-bold text-white mt-2 mb-1">Tier 2 Multi-Scale NCC</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Normalized Cross-Correlation sweeps a 380px dynamic bounding area. Accommodates 16:9, 21:9 videos, and Google Flow padding shifts.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-white/[0.05] text-[11px] font-mono text-blue-400">
                Range: 32px – 64px scales
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900/40 border border-white/[0.06] flex flex-col justify-between hover:border-cyan-500/40 transition-colors">
              <div>
                <span className="text-3xl font-black text-indigo-500/30 font-mono">03</span>
                <h3 className="text-base font-bold text-white mt-2 mb-1">Reverse Alpha Inversion</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Subtracts the blended luminance layer while clamping 32-bit float channel overflows to preserve original chromatic fidelity.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-white/[0.05] text-[11px] font-mono text-indigo-400">
                Precision: 0.0001% Tolerance
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900/40 border border-white/[0.06] flex flex-col justify-between hover:border-cyan-500/40 transition-colors">
              <div>
                <span className="text-3xl font-black text-emerald-500/30 font-mono">04</span>
                <h3 className="text-base font-bold text-white mt-2 mb-1">Corner Context Healing</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Extracts 400px of pristine surrounding pixels to eliminate perimeter edge artifacts, chromatic fringes, and halo rings.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-white/[0.05] text-[11px] font-mono text-emerald-400">
                Output: Lossless PNG / MP4
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 
        ═══════════════════════════════════════════════════════════════════════
        4. COMPARISON MATRIX TABLE
        ═══════════════════════════════════════════════════════════════════════ 
      */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-[#07070D] border-t border-white/[0.08]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
              Why Inpainting Is Obsolete For Watermarks
            </h2>
            <p className="mt-2 text-sm text-slate-400">
              Direct architectural comparison between Anemoia’s analytical engine and generic generative AI fill.
            </p>
          </div>

          <div className="rounded-2xl border border-white/[0.08] overflow-hidden bg-slate-900/30">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-white/[0.08] bg-black/40 font-mono text-xs text-slate-300">
                    <th className="py-4 px-6">METRIC / CAPABILITY</th>
                    <th className="py-4 px-6 text-red-400">GENERIC AI INPAINTING (DIFFUSION / LAMA)</th>
                    <th className="py-4 px-6 text-cyan-400 bg-cyan-950/20 border-l border-cyan-500/30">
                      ANEMOIA REVERSE ALPHA
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.05] text-xs sm:text-sm">
                  <tr>
                    <td className="py-4 px-6 font-medium text-white">Pixel Authenticity</td>
                    <td className="py-4 px-6 text-slate-400">Hallucinated / synthetic fill pixels</td>
                    <td className="py-4 px-6 font-semibold text-emerald-400 bg-cyan-950/20 border-l border-cyan-500/30">
                      100% Original underlying pixels recovered
                    </td>
                  </tr>
                  <tr>
                    <td className="py-4 px-6 font-medium text-white">Edge Sharpness</td>
                    <td className="py-4 px-6 text-slate-400">Soft, blurry edges and melted textures</td>
                    <td className="py-4 px-6 font-semibold text-emerald-400 bg-cyan-950/20 border-l border-cyan-500/30">
                      Crisp, native micro-contrast preserved
                    </td>
                  </tr>
                  <tr>
                    <td className="py-4 px-6 font-medium text-white">Latency Per Image</td>
                    <td className="py-4 px-6 text-slate-400">2,000ms – 5,000ms (Cloud GPU queue)</td>
                    <td className="py-4 px-6 font-semibold text-cyan-300 bg-cyan-950/20 border-l border-cyan-500/30">
                      ~12ms (Local client-side WebGL)
                    </td>
                  </tr>
                  <tr>
                    <td className="py-4 px-6 font-medium text-white">Video Temporal Stability</td>
                    <td className="py-4 px-6 text-slate-400">Severe frame-to-frame flickering & strobing</td>
                    <td className="py-4 px-6 font-semibold text-emerald-400 bg-cyan-950/20 border-l border-cyan-500/30">
                      Zero flicker (Mathematical frame consistency)
                    </td>
                  </tr>
                  <tr>
                    <td className="py-4 px-6 font-medium text-white">Privacy & Air-Gap</td>
                    <td className="py-4 px-6 text-slate-400">Requires uploading files to third-party servers</td>
                    <td className="py-4 px-6 font-semibold text-emerald-400 bg-cyan-950/20 border-l border-cyan-500/30">
                      100% Local (Files never leave your machine)
                    </td>
                  </tr>
                  <tr>
                    <td className="py-4 px-6 font-medium text-white">Pricing / Paywalls</td>
                    <td className="py-4 px-6 text-slate-400">Subscription credits per image</td>
                    <td className="py-4 px-6 font-semibold text-cyan-300 bg-cyan-950/20 border-l border-cyan-500/30">
                      Free & Unlimited Forever
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* 
        ═══════════════════════════════════════════════════════════════════════
        5. HARDWARE VIDEO PROCESSING ENGINE (VEO & FLOW)
        ═══════════════════════════════════════════════════════════════════════ 
      */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <span className="text-cyan-400 text-xs font-mono tracking-widest uppercase mb-2 block">
                NATIVE BROWSER WEBMEDIA PIPELINE
              </span>
              <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight">
                60–120 FPS Video Watermark Inversion
              </h2>
              <p className="mt-4 text-slate-300 text-base leading-relaxed">
                Veo videos require processing thousands of consecutive frames with zero temporal jitter. 
                Our pipeline integrates native <strong>WebCodecs VideoDecoder</strong> and 
                <strong>VideoEncoder</strong> hardware surfaces directly in your browser.
              </p>

              <div className="mt-8 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 mt-1">
                    <Cpu className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Direct GPU Surface Decoding</h4>
                    <p className="text-xs text-slate-400">Zero-copy hardware video decoding eliminates CPU bottlenecks on 4K 60fps streams.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mt-1">
                    <Check className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Bitrate & Audio Passthrough</h4>
                    <p className="text-xs text-slate-400">Audio tracks and metadata packets are muxed without re-encoding, preserving 100% audio quality.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 mt-1">
                    <Activity className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">16,571 FPS Locked-ROI Throughput</h4>
                    <p className="text-xs text-slate-400">Once detection locks onto the corner coordinates, subsequent video frames process at microsecond speeds.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Visual Pipeline Schematic Card */}
            <div className="p-8 rounded-3xl bg-slate-900/50 border border-white/[0.08] backdrop-blur-md relative">
              <div className="text-xs font-mono text-cyan-400 mb-6 uppercase tracking-wider flex items-center justify-between">
                <span>VEOMUX HARDWARE PIPELINE</span>
                <span className="text-emerald-400">● LIVE</span>
              </div>

              <div className="space-y-4 font-mono text-xs">
                <div className="p-3 rounded-xl bg-black/50 border border-white/[0.06] flex items-center justify-between">
                  <span className="text-slate-400">Input Veo MP4</span>
                  <span className="text-cyan-300">Demuxer (MediaBunny / MP4Box)</span>
                </div>
                <div className="text-center text-slate-600">↓ Hardware Demux Stream</div>

                <div className="p-3 rounded-xl bg-cyan-950/30 border border-cyan-500/30 flex items-center justify-between">
                  <span className="text-cyan-200">VideoDecoder Surface</span>
                  <span className="text-emerald-400">60–120 FPS GPU Render</span>
                </div>
                <div className="text-center text-slate-600">↓ Raw RGBA VideoFrame</div>

                <div className="p-3 rounded-xl bg-slate-900 border border-indigo-500/40 flex items-center justify-between">
                  <span className="text-white font-bold">Reverse Alpha Shader</span>
                  <span className="text-indigo-300">Delta Inversion (0 Loss)</span>
                </div>
                <div className="text-center text-slate-600">↓ CanvasSink (Fit: Fill)</div>

                <div className="p-3 rounded-xl bg-black/50 border border-white/[0.06] flex items-center justify-between">
                  <span className="text-slate-400">VideoEncoder Output</span>
                  <span className="text-cyan-300">Lossless AVC / HEVC Container</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 
        ═══════════════════════════════════════════════════════════════════════
        6. FREQUENTLY ASKED QUESTIONS
        ═══════════════════════════════════════════════════════════════════════ 
      */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-[#07070D] border-t border-white/[0.08]">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <span className="text-cyan-400 text-xs font-mono tracking-widest uppercase mb-2 block">
              FREQUENTLY ASKED QUESTIONS
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
              Clear Answers. No AI Buzzwords.
            </h2>
          </div>

          <div className="space-y-4">
            {[
              {
                q: "What is the difference between Google SynthID and this visible watermark?",
                a: "Google uses two systems: (1) SynthID, an invisible steganographic watermark embedded across frequency spectrums, and (2) a visible 4-pointed sparkle star logo stamped in the bottom-right corner. This tool removes the visible star logo. For SynthID metadata removal, Anemoia also provides a dedicated SynthID Frequency Stripper."
              },
              {
                q: "Why doesn't this cause blurry smudges like Photoshop or mobile eraser apps?",
                a: "Mobile apps and generic tools use AI inpainting, which deletes pixels and prompts a neural network to 'guess' what was behind it, leaving a fuzzy patch. Google actually applies the visible star by alpha-blending a white vector over your original pixels. Because it is simple linear blending, we mathematically invert the formula and recover the exact original pixels that were already there."
              },
              {
                q: "Can I process batches of 100+ images or long Veo video clips?",
                a: "Yes. Switch to Batch Mode in the tool, drag an entire folder of images or videos, and hit Process All. The tool uses a multi-threaded Web Worker pool to process items in parallel and downloads the clean results in a single structured ZIP file."
              },
              {
                q: "Do my images or videos ever get uploaded to an external server?",
                a: "Never. 100% of the computation executes inside your browser tab using WebGL, WebCodecs, and Web Workers. You can disconnect your internet entirely after opening the tool and it will continue to process flawlessly."
              }
            ].map((faq, i) => (
              <div
                key={i}
                className="rounded-xl border border-white/[0.08] bg-slate-900/40 overflow-hidden transition-colors"
              >
                <button
                  onClick={() => setActiveFaq(activeFaq === i ? null : i)}
                  className="w-full py-4 px-6 flex items-center justify-between text-left font-medium text-white hover:text-cyan-300 transition-colors"
                >
                  <span className="text-sm sm:text-base">{faq.q}</span>
                  <ChevronDown
                    className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${
                      activeFaq === i ? 'rotate-180 text-cyan-400' : ''
                    }`}
                  />
                </button>
                <AnimatePresence>
                  {activeFaq === i && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="px-6 pb-5 text-xs sm:text-sm text-slate-400 leading-relaxed border-t border-white/[0.04] pt-3"
                    >
                      {faq.a}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 
        ═══════════════════════════════════════════════════════════════════════
        7. CINEMATIC BOTTOM CTA
        ═══════════════════════════════════════════════════════════════════════ 
      */}
      <section className="py-28 px-4 sm:px-6 lg:px-8 border-t border-white/[0.08] relative overflow-hidden text-center">
        {/* Ambient radial glow */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(6,182,212,0.15)_0%,transparent_70%)] pointer-events-none" />

        <div className="max-w-4xl mx-auto relative z-10">
          <div className="inline-flex p-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 mb-6 shadow-[0_0_30px_rgba(6,182,212,0.3)]">
            <IconGeminiWatermarkRemover className="w-10 h-10" />
          </div>

          <h2 className="text-4xl sm:text-6xl font-black text-white tracking-tight mb-6">
            Clean Your Media In Seconds.
          </h2>
          <p className="text-base sm:text-lg text-slate-400 max-w-xl mx-auto mb-10 leading-relaxed">
            Free, unthrottled, and completely private. Open the studio, drop your images or videos, and export unblemished content instantly.
          </p>

          <Link to="/gemini-watermark-remover">
            <button className="px-10 py-5 bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:via-blue-500 hover:to-indigo-500 text-white font-black rounded-2xl shadow-[0_0_50px_rgba(6,182,212,0.4)] hover:shadow-[0_0_80px_rgba(6,182,212,0.6)] text-lg tracking-wide transition-all duration-300 inline-flex items-center gap-3">
              <span>Launch Studio Remover Now</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default GeminiWatermarkLanding;
