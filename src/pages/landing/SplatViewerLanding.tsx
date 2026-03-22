import React, { useRef, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform, useInView } from 'framer-motion';
import Header from '../../components/Header';
import Footer from '../../components/Footer';

/* ─────────────────────────────────────────────────────────
   Animated Scroll-Reveal Text Component
   ───────────────────────────────────────────────────────── */
const FadeUpText: React.FC<{ children: React.ReactNode; className?: string; delay?: number }> = ({ children, className = '', delay = 0 }) => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: false, margin: "0px 0px -10% 0px" });
  
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
      transition={{ duration: 0.8, delay, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

/* ─────────────────────────────────────────────────────────
   Main Component
   ───────────────────────────────────────────────────────── */
const SplatViewerLanding: React.FC = () => {
  // ── Scroll Management ──
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Hero Section
  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress: heroScroll } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const heroTextY = useTransform(heroScroll, [0, 1], ["0%", "40%"]);

  // Intro Slide-up (The CRFTD specific sticky intro mechanic)
  const introRef = useRef<HTMLElement>(null);

  // Horizontal Scroll Hijack Area
  const horizontalRef = useRef<HTMLElement>(null);
  const { scrollYProgress: hzScroll } = useScroll({ target: horizontalRef });
  // Map vertical scroll (0 to 1) to horizontal movement (-0% to -66.66% for 3 items)
  const xTransform = useTransform(hzScroll, [0, 1], ["0%", "-66.666%"]);
  // Track active index for background/UI sync
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const unsub = hzScroll.on("change", (v) => {
      if (v < 0.33) setActiveIndex(0);
      else if (v < 0.66) setActiveIndex(1);
      else setActiveIndex(2);
    });
    return () => unsub();
  }, [hzScroll]);

  // ── SEO Metadata Setup ──
  useEffect(() => {
    document.title = 'Gaussian Splatting Viewer Online | Anemoia 3D Studio';

    const setMeta = (name: string, content: string, attr = 'name') => {
      let el = document.querySelector(`meta[${attr}="${name}"]`);
      if (!el) { el = document.createElement('meta'); el.setAttribute(attr, name); document.head.appendChild(el); }
      el.setAttribute('content', content);
    };

    setMeta('description', 'Anemoia 3D Studio: The most advanced browser-based online Gaussian Splatting Viewer. Upload PLY files, render next-gen 3D radiance fields in real-time instantly.');
    setMeta('keywords', 'gaussian splatting viewer online, 3D point cloud, webgl splat renderer, anemoia 3D studio, PLY viewer, radiance fields, browser 3D');
    setMeta('og:title', 'Gaussian Splatting Viewer Online | Anemoia', 'property');
    setMeta('og:description', 'Experience photorealistic 3D visualization. Our online Gaussian Splatting Viewer lets you explore massive PLY radiance fields instantly in your browser at 60 FPS.', 'property');
    setMeta('og:type', 'website', 'property');
    setMeta('og:url', window.location.href, 'property');

    const schema = {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: 'Anemoia Gaussian Splatting Viewer',
      applicationCategory: 'MultimediaApplication',
      operatingSystem: 'WebGL Browser',
      description: 'The premier online gaussian splatting viewer. Instantly render PLY capture files in the browser with uncompromising visual fidelity.',
      featureList: [
        'Real-time Gaussian Splat parsing',
        'Hardware-accelerated WebGL rendering',
        'Interactive camera controls',
        'No installation necessary',
      ],
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' }
    };

    let script = document.querySelector('script[data-page="splatviewer"]');
    if (!script) {
      script = document.createElement('script');
      (script as HTMLScriptElement).type = 'application/ld+json';
      script.setAttribute('data-page', 'splatviewer');
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify(schema);

    return () => { document.querySelector('script[data-page="splatviewer"]')?.remove(); };
  }, []);

  return (
    <div ref={containerRef} className="relative min-h-screen bg-[#050505] text-[#f4f4f4] overflow-x-hidden selection:bg-cyan-500/30 font-sans">
      <Header />

      {/* 
        ═══════════════════════════════════════════
        HERO SECTION (SCROLL SCRUBBED VIDEO)
        ═══════════════════════════════════════════ 
      */}
      <section ref={heroRef} className="relative h-[200vh] w-full">
        {/* Sticky viewport container */}
        <div className="sticky top-0 h-screen w-full flex flex-col items-center justify-center overflow-hidden z-0">
          
          {/* Massive Background Typography */}
          <motion.div 
            style={{ y: heroTextY }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none z-0"
          >
            <h1 className="text-[18vw] leading-none font-black tracking-tighter text-white/[0.03] whitespace-nowrap select-none">
              ANEMOIA
            </h1>
          </motion.div>

          {/* Single High-Fidelity Video Layer (Scrubbed via Scroll) */}
          <div className="relative z-10 w-[90vw] h-[60vh] md:w-[70vw] md:h-[75vh] rounded-2xl overflow-hidden shadow-[0_0_100px_rgba(6,182,212,0.1)] border border-white/5 bg-[#0a0a0a]">
            <video 
              autoPlay
              loop
              muted 
              playsInline 
              className="absolute inset-0 w-full h-full object-cover opacity-80"
            >
              <source src="/videos/sharp-demo-1.mp4" type="video/mp4" />
            </video>
            
            {/* Vignette overlay */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_40%,rgba(0,0,0,0.8)_100%)] pointer-events-none" />
            
            {/* Call to action inside video frame */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pb-24 pointer-events-none">
              <h2 className="text-4xl md:text-6xl font-bold tracking-tight mb-6 text-white text-center drop-shadow-[0_4px_20px_rgba(0,0,0,0.8)]">
                Spatial <span className="font-serif italic font-normal text-cyan-200">Realities.</span>
              </h2>
            </div>
          </div>
          
          <div className="absolute bottom-32 left-1/2 -translate-x-1/2 z-30 pointer-events-auto">
             <Link
                to="/splat-viewer"
                className="group relative inline-flex items-center justify-center px-10 py-5 rounded-full bg-white text-black font-extrabold uppercase tracking-widest text-sm overflow-hidden shadow-[0_0_40px_rgba(6,182,212,0.4)] hover:shadow-[0_0_80px_rgba(6,182,212,0.8)] transition-all duration-500 transform hover:scale-105"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-blue-500 translate-y-[100%] group-hover:translate-y-0 transition-transform duration-500 ease-[0.16,1,0.3,1]" />
                <span className="relative z-10 flex items-center gap-3 group-hover:text-white transition-colors duration-500">
                  Launch Platform
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </span>
              </Link>
          </div>

          {/* Scroll Indicator */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-3 opacity-50 pointer-events-none">
            <span className="text-[9px] uppercase tracking-[0.3em] font-mono">Scroll to explore</span>
            <motion.div 
              animate={{ height: ["0%", "100%", "0%"], y: ["-100%", "0%", "100%"] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              className="w-px h-16 bg-white overflow-hidden origin-top"
            />
          </div>

        </div>
      </section>

      {/* 
        ═══════════════════════════════════════════
        INTRO REVEAL AREA (VISION SECTION)
        ═══════════════════════════════════════════ 
      */}
      <section ref={introRef} className="relative z-10 bg-[#050505] min-h-screen flex items-center border-t border-white/5 overflow-hidden">
        
        {/* Second Video prominent background */}
        <div className="absolute inset-0 z-0 pointer-events-none opacity-40">
           <video 
             autoPlay
             loop
             muted 
             playsInline 
             className="absolute inset-0 w-full h-full object-cover grayscale-[20%]"
           >
             <source src="/videos/sharp-demo-2.mp4" type="video/mp4" />
           </video>
           <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-transparent" />
        </div>

        <div className="relative z-10 max-w-6xl mx-auto px-6 py-32 grid md:grid-cols-12 gap-12">
          <div className="md:col-span-5 flex flex-col justify-center">
            <FadeUpText>
              <h3 className="text-sm tracking-[0.2em] text-cyan-400 uppercase mb-6 font-mono font-bold">The Vision</h3>
              <p className="text-4xl md:text-6xl font-normal leading-tight tracking-tight mb-8">
                We render <br/><span className="italic font-serif text-gray-500">environments</span> instantly.
              </p>
            </FadeUpText>
          </div>
          <div className="md:col-span-1" />
          <div className="md:col-span-6 flex flex-col justify-center">
             <FadeUpText delay={0.2}>
              <p className="text-xl md:text-2xl text-gray-400 font-light leading-relaxed mb-10">
                The Anemoia Gaussian Splatting viewer brings the future of 3D rendering natively to the web. No massive desktop applications, no complex servers—just pure, undiluted photorealism rendered via WebGL directly on your GPU.
              </p>
            </FadeUpText>
            <FadeUpText delay={0.3}>
              <p className="text-lg text-gray-500 font-light leading-relaxed mb-10">
                Upload your PLY files and instantly navigate millions of optimized colored gaussians as if you were truly standing there.
              </p>
            </FadeUpText>
          </div>
        </div>
      </section>

      {/* 
        ═══════════════════════════════════════════
        HORIZONTAL SCROLL HIJACK SECTION (WAT WE DOEN analog)
        ═══════════════════════════════════════════ 
      */}
      <section ref={horizontalRef} className="relative h-[400vh] bg-[#020202]">
        {/* Sticky Container */}
        <div className="sticky top-0 h-screen w-full flex flex-col justify-center overflow-hidden">
          
          {/* Dynamic Background Area */}
          <div className="absolute inset-0 z-0 pointer-events-none bg-black">
            {/* Background Texture/Gradient Overlay */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(6,182,212,0.15)_0%,rgba(0,0,0,0.8)_80%)] z-10" />
          </div>

          <div className="absolute top-[15%] left-10 md:left-24 z-10 pointer-events-none">
            <h3 className="text-[100px] md:text-[200px] font-black tracking-tighter text-white/[0.02]">ENGINE</h3>
          </div>

          <div className="relative z-20 px-10 md:px-24 mb-10 max-w-7xl mx-auto w-full">
            <p className="text-sm font-bold tracking-[0.2em] uppercase text-cyan-400 mb-4 font-mono">Core Mechanics</p>
            <h2 className="text-5xl md:text-7xl font-normal tracking-tight">Capabilities.</h2>
          </div>

          {/* Horizontal Track Container */}
          <div className="relative z-20 overflow-hidden w-full h-[60vh]">
            <motion.div 
              style={{ x: xTransform }}
              className="absolute top-0 left-0 flex w-[300%] h-full items-center px-10 md:px-24"
            >
              {/* ITEM 1 */}
              <div className="w-[33.333%] h-full flex items-center justify-start pr-8 md:pr-32">
                 <div className="relative w-full max-w-3xl border-l-[1px] border-white/10 pl-10 md:pl-16 group hover:border-cyan-400 transition-colors duration-500">
                   <div className="absolute -left-5 top-0 text-[80px] font-serif italic text-white/5 select-none pointer-events-none group-hover:text-cyan-400/20 transition-colors duration-500 leading-none">01</div>
                   <h3 className="text-4xl md:text-6xl font-bold mb-6 text-white tracking-tight">60 FPS Hardware <br/><span className="text-gray-500 font-normal">Acceleration.</span></h3>
                   <p className="text-gray-400 text-xl leading-relaxed max-w-xl">
                     Engineered for speed. Our custom WebGL pipeline sorts and renders millions of splats seamlessly, achieving locked 60 FPS even on massive environments without freezing your browser.
                   </p>
                 </div>
              </div>

              {/* ITEM 2 */}
              <div className="w-[33.333%] h-full flex items-center justify-start pr-8 md:pr-32">
                 <div className="relative w-full max-w-3xl border-l-[1px] border-white/10 pl-10 md:pl-16 group hover:border-purple-400 transition-colors duration-500">
                   <div className="absolute -left-5 top-0 text-[80px] font-serif italic text-white/5 select-none pointer-events-none group-hover:text-purple-400/20 transition-colors duration-500 leading-none">02</div>
                   <h3 className="text-4xl md:text-6xl font-bold mb-6 text-white tracking-tight">Universal <br/><span className="text-gray-500 font-normal">Integration.</span></h3>
                   <p className="text-gray-400 text-xl leading-relaxed max-w-xl">
                     Native support for the standard PLY file format. Drag, drop, and view. Whether generated from Polycam, Luma, or custom scripts, if it's a Gaussian Splat, Anemoia will construct it perfectly.
                   </p>
                 </div>
              </div>

              {/* ITEM 3 */}
              <div className="w-[33.333%] h-full flex items-center justify-start pr-8 md:pr-32">
                 <div className="relative w-full max-w-3xl border-l-[1px] border-white/10 pl-10 md:pl-16 group hover:border-blue-400 transition-colors duration-500">
                   <div className="absolute -left-5 top-0 text-[80px] font-serif italic text-white/5 select-none pointer-events-none group-hover:text-blue-400/20 transition-colors duration-500 leading-none">03</div>
                   <h3 className="text-4xl md:text-6xl font-bold mb-6 text-white tracking-tight">Immersive <br/><span className="text-gray-500 font-normal">Navigation.</span></h3>
                   <p className="text-gray-400 text-xl leading-relaxed max-w-xl">
                     Fly completely free. Intuitive orbit and WASD controls combine to let you traverse the scene precisely how you desire. Experience the geometry from micro-details to macro-panoramas.
                   </p>
                 </div>
              </div>
            </motion.div>
          </div>

          {/* Progress Indicator */}
          <div className="absolute bottom-16 right-10 md:right-24 z-20 flex gap-6 items-center">
             <div className="text-2xl font-mono font-bold tracking-widest text-white">
               0{activeIndex + 1} <span className="text-white/20 font-light">/ 03</span>
             </div>
             <div className="w-48 h-[2px] bg-white/10 relative hidden md:block overflow-hidden">
                <motion.div 
                  className="absolute top-0 left-0 h-full bg-cyan-400 transition-all duration-300 ease-out"
                  style={{ width: `${((activeIndex + 1) / 3) * 100}%` }}
                />
             </div>
          </div>

        </div>
      </section>

      {/* 
        ═══════════════════════════════════════════
        CLOSING CTA SECTION
        ═══════════════════════════════════════════ 
      */}
      <section className="relative z-10 py-52 bg-[#050505] flex justify-center border-t border-white/5">
        <div className="max-w-5xl text-center px-6">
          <FadeUpText>
             <h2 className="text-5xl md:text-[7rem] font-bold tracking-tighter mb-10 leading-none">
               ENTER THE<br/><span className="italic font-serif text-gray-500">ENVIRONMENT.</span>
             </h2>
          </FadeUpText>
          <FadeUpText delay={0.2}>
             <p className="text-xl md:text-2xl text-gray-400 mb-16 max-w-2xl mx-auto font-light">
               The wait is over. Start exploring photorealistic 3D Gaussian Splatting immediately. Free, private, and breathtakingly fast.
             </p>
          </FadeUpText>
          <FadeUpText delay={0.3}>
            <Link
               to="/splat-viewer"
               className="group relative inline-flex items-center justify-center px-12 py-5 rounded-full overflow-hidden border border-white/20 bg-white text-black hover:bg-white/90 transition-all cursor-pointer shadow-[0_0_50px_rgba(255,255,255,0.1)] hover:shadow-[0_0_80px_rgba(6,182,212,0.3)]"
             >
               <span className="relative z-10 flex items-center gap-3 font-bold uppercase tracking-[0.2em] text-sm">
                 Open Viewer <span className="material-symbols-outlined text-lg group-hover:translate-x-1 transition-transform">east</span>
               </span>
             </Link>
          </FadeUpText>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default SplatViewerLanding;