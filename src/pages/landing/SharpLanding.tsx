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
const SharpLanding: React.FC = () => {
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
    document.title = 'SHARP 3D Generator — Free Image to 3D Gaussian Splat | Anemoia';

    const setMeta = (name: string, content: string, attr = 'name') => {
      let el = document.querySelector(`meta[${attr}="${name}"]`);
      if (!el) { el = document.createElement('meta'); el.setAttribute(attr, name); document.head.appendChild(el); }
      el.setAttribute('content', content);
    };

    setMeta('description', 'Convert any photo into a 3D Gaussian Splat for free — directly in your browser. Powered by Apple\'s SHARP neural network and Depth Anything V2. No sign-up, no install.');
    setMeta('keywords', 'SHARP 3D, ml-sharp, apple ml sharp, gaussian splat, 3d gaussian splatting, image to 3D, 2D to 3D, monocular view synthesis, neural radiance field, NeRF alternative, 3D reconstruction, free 3D generator, apple machine learning 3D, depth anything v2, depth estimation, PLY export, webgl 3D viewer, point cloud generation, AI 3D model, Mescheder et al 2025, browser based 3D, webgpu 3D, client side AI');
    setMeta('og:title', 'SHARP 3D Generator — Image to 3D Gaussian Splat in Seconds', 'property');
    setMeta('og:description', 'The only free browser-based tool that converts a single photo into a 3D Gaussian Splat using Apple\'s SHARP neural network. No install required.', 'property');
    setMeta('og:type', 'website', 'property');
    setMeta('og:url', window.location.href, 'property');

    const schema = {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: 'SHARP 3D Generator',
      applicationCategory: 'MultimediaApplication',
      operatingSystem: 'Web Browser',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      description: 'Free AI-powered single-image to 3D Gaussian Splat converter. Browser-based, no installation, powered by Apple SHARP and Depth Anything V2.',
      featureList: [
        'Single image to 3D conversion',
        'Up to 1.18 million Gaussian Splats',
        'Browser-based processing — no server upload',
        'PLY file export',
        'Built-in WebGL 3D viewer',
        'No account required',
      ],
    };
    let script = document.querySelector('script[data-page="sharp"]') as HTMLScriptElement | null;
    if (!script) { script = document.createElement('script'); script.type = 'application/ld+json'; script.dataset.page = 'sharp'; document.head.appendChild(script); }
    script.textContent = JSON.stringify(schema);
    return () => { document.querySelector('script[data-page="sharp"]')?.remove(); };
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
            <h1 className="text-[20vw] leading-none font-black tracking-tighter text-white/[0.04] whitespace-nowrap select-none">
              ML-SHARP
            </h1>
          </motion.div>

          {/* Single High-Fidelity Video Layer (Scrubbed via Scroll) */}
          <div className="relative z-10 w-[90vw] h-[60vh] md:w-[70vw] md:h-[75vh] rounded-3xl overflow-hidden shadow-[0_0_120px_rgba(6,182,212,0.15)] border border-white/10 bg-[#0a0a0a]">
            <video 
              autoPlay
              loop
              muted 
              playsInline 
              className="absolute inset-0 w-full h-full object-cover opacity-90 mix-blend-screen"
              style={{ filter: 'brightness(0.6) contrast(1.1)' }}
            >
              <source src="/videos/sharp-demo-1.mp4" type="video/mp4" />
            </video>
            
            {/* Vignette overlay */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_30%,rgba(0,0,0,0.9)_100%)] pointer-events-none" />
            
            {/* Call to action inside video frame */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pb-24 pointer-events-none">
               <h2 className="text-4xl md:text-7xl font-bold tracking-tight mb-2 text-white text-center drop-shadow-[0_4px_30px_rgba(0,0,0,0.9)]">
                  Upload. <span className="font-serif italic font-normal text-cyan-200">Generate.</span>
               </h2>
               <p className="text-lg md:text-xl text-gray-300 font-light drop-shadow-xl mt-4 max-w-lg text-center">
                 Convert any single photograph into a perfect 3D Gaussian Splat in seconds.
               </p>
            </div>
          </div>
          
          <div className="absolute bottom-32 left-1/2 -translate-x-1/2 z-30 pointer-events-auto">
             <Link
                to="/sharp"
                className="group relative inline-flex items-center justify-center px-10 py-5 rounded-full bg-white text-black font-extrabold uppercase tracking-widest text-sm overflow-hidden shadow-[0_0_40px_rgba(6,182,212,0.4)] hover:shadow-[0_0_80px_rgba(6,182,212,0.8)] transition-all duration-500 transform hover:scale-105"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-teal-400 translate-y-[100%] group-hover:translate-y-0 transition-transform duration-500 ease-[0.16,1,0.3,1]" />
                <span className="relative z-10 flex items-center gap-3 group-hover:text-white transition-colors duration-500">
                  Generate 3D Now
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
              <h3 className="text-sm tracking-[0.2em] text-cyan-400 uppercase mb-6 font-mono font-bold">Monocular Inference</h3>
              <p className="text-4xl md:text-6xl font-normal leading-tight tracking-tight mb-8">
                From a single <br/><span className="italic font-serif text-gray-500">photograph.</span>
              </p>
            </FadeUpText>
          </div>
          <div className="md:col-span-1" />
          <div className="md:col-span-6 flex flex-col justify-center">
             <FadeUpText delay={0.2}>
              <p className="text-xl md:text-2xl text-gray-400 font-light leading-relaxed mb-10">
                Turn any static 2D image into an explorable 3D Gaussian Splat scene right from your browser. Apple's ML-SHARP network predicts photorealistic novel views in seconds.
              </p>
            </FadeUpText>
            <FadeUpText delay={0.3}>
              <p className="text-lg text-gray-500 font-light leading-relaxed mb-10">
                The geometry is reconstructed privately on your device utilizing Depth Anything V2. Zero cloud uploads, infinite spatial possibilities.
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
            <h3 className="text-[100px] md:text-[200px] font-black tracking-tighter text-white/[0.03]">PROCESS</h3>
          </div>

          <div className="relative z-20 px-10 md:px-24 mb-6 max-w-7xl mx-auto w-full">
            <p className="text-sm font-bold tracking-[0.2em] uppercase text-cyan-400 mb-4 font-mono">Workflow</p>
            <h2 className="text-5xl md:text-7xl font-normal tracking-tight">Image to 3D.</h2>
          </div>

          {/* Horizontal Track Container */}
          <div className="relative z-20 overflow-hidden w-full h-[65vh]">
            <motion.div 
              style={{ x: xTransform }}
              className="absolute top-0 left-0 flex w-[200%] md:w-[220%] h-full items-center px-10 md:px-24"
            >
              {/* ITEM 1 */}
              <div className="w-1/3 h-full flex items-center justify-start pr-12 md:pr-20 group">
                 <div className="relative w-full border-l-[1px] border-white/10 pl-10 md:pl-16 hover:border-cyan-400 transition-colors duration-500 py-4">
                   <div className="absolute -left-5 -top-4 text-[80px] font-serif italic text-white/5 select-none pointer-events-none group-hover:text-cyan-400/20 transition-colors duration-500 leading-none">01</div>
                   <h3 className="text-4xl md:text-5xl font-bold mb-4 text-white tracking-tight">Upload Your <br/><span className="text-gray-500 font-normal">Photo.</span></h3>
                   <p className="text-gray-400 text-lg md:text-xl leading-relaxed max-w-xl">
                     Start with any 2D image. Our client-side pipeline instantly ingests the photograph, keeping the original image completely private on your machine—zero server uploads required.
                   </p>
                 </div>
              </div>

              {/* ITEM 2 */}
              <div className="w-1/3 h-full flex items-center justify-start pr-12 md:pr-20 group">
                 <div className="relative w-full border-l-[1px] border-white/10 pl-10 md:pl-16 hover:border-teal-400 transition-colors duration-500 py-4">
                   <div className="absolute -left-5 -top-4 text-[80px] font-serif italic text-white/5 select-none pointer-events-none group-hover:text-teal-400/20 transition-colors duration-500 leading-none">02</div>
                   <h3 className="text-4xl md:text-5xl font-bold mb-4 text-white tracking-tight">Apple <br/><span className="text-gray-500 font-normal">ML-SHARP.</span></h3>
                   <p className="text-gray-400 text-lg md:text-xl leading-relaxed max-w-xl">
                     Apple's ML-SHARP network dynamically runs monocular inference, taking the geometric backbone from Depth Anything V2 to generate up to 1.18 million 3D Gaussian Splats natively.
                   </p>
                 </div>
              </div>

              {/* ITEM 3 */}
              <div className="w-1/3 h-full flex items-center justify-start pr-12 md:pr-20 group">
                 <div className="relative w-full border-l-[1px] border-white/10 pl-10 md:pl-16 hover:border-blue-400 transition-colors duration-500 py-4">
                   <div className="absolute -left-5 -top-4 text-[80px] font-serif italic text-white/5 select-none pointer-events-none group-hover:text-blue-400/20 transition-colors duration-500 leading-none">03</div>
                   <h3 className="text-4xl md:text-5xl font-bold mb-4 text-white tracking-tight">WebGL <br/><span className="text-gray-500 font-normal">Interactive.</span></h3>
                   <p className="text-gray-400 text-lg md:text-xl leading-relaxed max-w-xl">
                     Watch the splats populate instantly in our high-performance WebGL viewer. Fly around your new 3D spatial reality or download the standard `.ply` file immediately.
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
             <h2 className="text-5xl md:text-[7rem] font-bold tracking-tighter mb-10 leading-none text-white drop-shadow-2xl">
               GENERATE THE<br/><span className="italic font-serif text-cyan-200">ENVIRONMENT.</span>
             </h2>
          </FadeUpText>
          <FadeUpText delay={0.2}>
             <p className="text-xl md:text-2xl text-gray-300 mb-16 max-w-3xl mx-auto font-light leading-relaxed">
               Ditch the server queues. Upload your photograph and convert it to a full 3D gaussian splat using <strong className="text-white font-semibold">Apple ML-SHARP</strong>—for free, in seconds, privately on your device.
             </p>
          </FadeUpText>
          <FadeUpText delay={0.3}>
            <Link
               to="/sharp"
               className="group relative inline-flex items-center justify-center px-14 py-6 rounded-full overflow-hidden border border-cyan-400 bg-cyan-500/10 hover:bg-cyan-500/20 backdrop-blur-md transition-all cursor-pointer shadow-[0_0_50px_rgba(6,182,212,0.2)] hover:shadow-[0_0_80px_rgba(6,182,212,0.5)]"
             >
               <span className="relative z-10 flex items-center gap-3 font-bold uppercase tracking-[0.2em] text-cyan-50 text-base">
                 Upload Photo <span className="material-symbols-outlined text-xl group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform">north_east</span>
               </span>
               <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-[radial-gradient(circle_at_center,rgba(6,182,212,0.4),transparent_70%)]" />
             </Link>
          </FadeUpText>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default SharpLanding;
