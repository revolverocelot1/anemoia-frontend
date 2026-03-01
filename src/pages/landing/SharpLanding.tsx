import React, { useRef, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform, useInView } from 'framer-motion';
import Header from '../../components/Header';
import Footer from '../../components/Footer';

/* ─────────────────────────────────────────────────────────
   Animated stat counter
   ───────────────────────────────────────────────────────── */
const AnimatedCounter = ({ target, suffix = '', duration = 2 }: { target: number; suffix?: string; duration?: number }) => {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const step = target / (duration * 60);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) { setCount(target); clearInterval(timer); }
      else setCount(Math.floor(start));
    }, 1000 / 60);
    return () => clearInterval(timer);
  }, [inView, target, duration]);

  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>;
};

/* ─────────────────────────────────────────────────────────
   Floating particle layer (pure CSS, no heavy JS)
   ───────────────────────────────────────────────────────── */
const Particles = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    {Array.from({ length: 40 }, (_, i) => {
      const size = 2 + Math.random() * 3;
      const left = Math.random() * 100;
      const delay = Math.random() * 8;
      const dur = 12 + Math.random() * 18;
      return (
        <div
          key={i}
          className="absolute rounded-full bg-cyan-400/20"
          style={{
            width: size,
            height: size,
            left: `${left}%`,
            bottom: '-4px',
            animation: `floatUp ${dur}s ${delay}s linear infinite`,
          }}
        />
      );
    })}
    <style>{`
      @keyframes floatUp {
        0%   { transform: translateY(0) scale(1); opacity: 0; }
        10%  { opacity: 0.6; }
        90%  { opacity: 0.2; }
        100% { transform: translateY(-105vh) scale(0.4); opacity: 0; }
      }
    `}</style>
  </div>
);

/* ─────────────────────────────────────────────────────────
   Main Landing Page
   ───────────────────────────────────────────────────────── */
const SharpLanding: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: containerRef, offset: ['start start', 'end end'] });
  const heroScale = useTransform(scrollYProgress, [0, 0.25], [1, 0.92]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);
  const [videoReady, setVideoReady] = useState(false);

  // ── SEO Metadata ──
  useEffect(() => {
    document.title = 'SHARP 3D Generator — Free Image to 3D Gaussian Splat | Anemoia';

    const setMeta = (name: string, content: string, attr = 'name') => {
      let el = document.querySelector(`meta[${attr}="${name}"]`);
      if (!el) { el = document.createElement('meta'); el.setAttribute(attr, name); document.head.appendChild(el); }
      el.setAttribute('content', content);
    };

    setMeta('description',
      'Convert any photo into a 3D Gaussian Splat for free — directly in your browser. Powered by Apple\'s SHARP neural network and Depth Anything V2. No sign-up, no install.');
    setMeta('keywords',
      'SHARP 3D, gaussian splat, image to 3D, neural radiance field, 3D reconstruction, free 3D generator, gaussian splatting, apple SHARP, depth estimation, PLY export, webgl 3D viewer');
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
    <div ref={containerRef} className="relative min-h-screen bg-gray-950 overflow-x-hidden text-white">
      <Header />

      {/* ═══════════════════════════════════════════
          HERO — full-viewport, looping video bg
          ═══════════════════════════════════════════ */}
      <section ref={heroRef} className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Video background — two layers cross-faded */}
        <div className="absolute inset-0 z-0">
          <video
            autoPlay muted loop playsInline
            className="absolute inset-0 w-full h-full object-cover"
            style={{ filter: 'blur(6px) brightness(0.35) saturate(1.2)' }}
            onCanPlayThrough={() => setVideoReady(true)}
          >
            <source src="/videos/sharp-demo-1.mp4" type="video/mp4" />
          </video>

          {/* Secondary video, offset blend */}
          <video
            autoPlay muted loop playsInline
            className="absolute inset-0 w-full h-full object-cover mix-blend-screen opacity-20"
            style={{ filter: 'blur(10px) hue-rotate(20deg)' }}
          >
            <source src="/videos/sharp-demo-2.mp4" type="video/mp4" />
          </video>

          {/* Gradient overlay for depth */}
          <div className="absolute inset-0 bg-gradient-to-b from-gray-950/60 via-gray-950/30 to-gray-950" />
          <div className="absolute inset-0 bg-gradient-to-r from-gray-950/50 via-transparent to-gray-950/50" />
        </div>

        <Particles />

        {/* Scanline / grid texture */}
        <div
          className="absolute inset-0 pointer-events-none z-[1] opacity-[0.04]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)',
            backgroundSize: '64px 64px',
          }}
        />

        {/* Hero content */}
        <motion.div
          className="relative z-10 text-center px-6 max-w-5xl mx-auto"
          style={{ scale: heroScale, opacity: heroOpacity }}
        >
          {/* Status badge */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="inline-flex items-center gap-2.5 px-5 py-2 rounded-full bg-cyan-500/10 border border-cyan-500/20 backdrop-blur-md mb-8"
          >
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400" />
            </span>
            <span className="text-sm font-medium text-cyan-200 tracking-wide">Only free browser-based SHARP implementation</span>
          </motion.div>

          {/* Title */}
          <motion.h1
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
            className="text-6xl sm:text-7xl md:text-[5.5rem] font-extrabold leading-[0.95] tracking-tight mb-6"
          >
            <span className="bg-gradient-to-r from-white via-cyan-100 to-white bg-clip-text text-transparent drop-shadow-lg">
              SHARP
            </span>
            <br className="md:hidden" />
            <span className="ml-2 md:ml-5 text-cyan-400 drop-shadow-[0_0_30px_rgba(34,211,238,0.35)]">3D</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="text-xl md:text-2xl text-gray-300 font-light max-w-3xl mx-auto mb-4 leading-relaxed"
          >
            Turn any photograph into a <strong className="text-white font-semibold">3D Gaussian Splat</strong> —
            right in your browser, under 10 seconds.
          </motion.p>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.75 }}
            className="text-base text-gray-500 mb-10 max-w-2xl mx-auto"
          >
            Powered by Apple's SHARP neural network &amp; Depth&nbsp;Anything&nbsp;V2.
            No uploads, no servers, no sign-up.
          </motion.p>

          {/* CTA row */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center"
          >
            <Link
              to="/sharp"
              className="group relative px-10 py-4 rounded-xl text-lg font-bold overflow-hidden transition-transform hover:scale-[1.04] active:scale-[0.97]"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-teal-500 group-hover:from-cyan-400 group-hover:to-teal-400 transition-all" />
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.15),transparent_70%)]" />
              <span className="relative flex items-center gap-2 text-gray-950">
                <span className="material-symbols-outlined text-xl">auto_awesome</span>
                Generate 3D Now
              </span>
            </Link>
            <a
              href="https://apple.github.io/ml-sharp/"
              target="_blank"
              rel="noopener noreferrer"
              className="px-8 py-4 rounded-xl text-lg font-semibold bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 backdrop-blur-sm transition-all text-gray-300 hover:text-white"
            >
              Read the Research →
            </a>
          </motion.div>
        </motion.div>

        {/* Scroll cue */}
        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10"
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
        >
          <div className="w-6 h-10 rounded-full border-2 border-gray-500/50 flex justify-center pt-2">
            <div className="w-1 h-2 bg-gray-400 rounded-full" />
          </div>
        </motion.div>
      </section>

      {/* ═══════════════════════════════════════════
          STATS BAR
          ═══════════════════════════════════════════ */}
      <section className="relative z-10 -mt-20 px-6">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-px rounded-2xl overflow-hidden border border-white/[0.06] bg-white/[0.03] backdrop-blur-xl shadow-2xl shadow-black/40">
          {[
            { value: 1180000, suffix: '', label: 'Gaussian Splats', extra: 'per generation' },
            { value: 10, suffix: 's', label: 'Average Time', extra: 'on modern GPU' },
            { value: 0, suffix: '', label: 'Server Uploads', extra: '100% client-side' },
            { value: 100, suffix: '%', label: 'Free Forever', extra: 'no account needed' },
          ].map((s, i) => (
            <div key={i} className="px-6 py-7 text-center bg-gray-950/60 border-r border-b border-white/[0.04] last:border-r-0">
              <p className="text-2xl md:text-3xl font-bold text-white tabular-nums">
                {s.value === 0 ? '0' : <AnimatedCounter target={s.value} suffix={s.suffix} />}
              </p>
              <p className="text-sm font-medium text-gray-400 mt-1">{s.label}</p>
              <p className="text-[11px] text-gray-600 mt-0.5">{s.extra}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          HOW IT WORKS
          ═══════════════════════════════════════════ */}
      <section className="py-28 px-6 relative">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-20"
          >
            <p className="text-sm font-bold tracking-[0.2em] uppercase text-cyan-400 mb-3">Workflow</p>
            <h2 className="text-4xl md:text-5xl font-bold text-white">
              Three Steps to 3D
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 relative">
            {/* Connector line */}
            <div className="hidden md:block absolute top-24 left-[16.6%] right-[16.6%] h-px bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent" />

            {[
              { num: '01', title: 'Upload a Photo', desc: 'Any photograph — landscape, object, building, face. Drop it in and SHARP reads the geometry from a single view.', icon: 'upload_file', accent: 'cyan' },
              { num: '02', title: 'Neural Depth', desc: 'Depth Anything V2 runs entirely in your browser. No image ever leaves your device. The neural net predicts per-pixel depth in real time.', icon: 'psychology', accent: 'teal' },
              { num: '03', title: 'Explore in 3D', desc: 'Over a million Gaussian splats are projected into 3D space. Rotate, zoom, pan — then download the PLY file for any renderer.', icon: 'view_in_ar', accent: 'emerald' },
            ].map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.12 }}
                className="relative group"
              >
                <div className="relative bg-gray-900/60 backdrop-blur-sm border border-white/[0.06] rounded-2xl p-8 h-full hover:border-cyan-500/20 transition-all duration-500">
                  {/* Step number */}
                  <div className="absolute -top-5 left-8 text-[4rem] font-black leading-none text-white/[0.04] select-none">{step.num}</div>

                  {/* Icon */}
                  <div className={`w-14 h-14 rounded-xl bg-${step.accent}-500/10 border border-${step.accent}-500/20 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform`}>
                    <span className={`material-symbols-outlined text-2xl text-${step.accent}-400`}>{step.icon}</span>
                  </div>

                  <h3 className="text-xl font-bold text-white mb-3">{step.title}</h3>
                  <p className="text-gray-400 leading-relaxed text-[15px]">{step.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          TECHNOLOGY
          ═══════════════════════════════════════════ */}
      <section className="py-24 px-6 bg-gradient-to-b from-transparent via-cyan-950/[0.07] to-transparent">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <p className="text-sm font-bold tracking-[0.2em] uppercase text-teal-400 mb-3">Under the Hood</p>
            <h2 className="text-4xl md:text-5xl font-bold text-white">Built on Cutting-Edge Research</h2>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Gaussian Splatting card */}
            <motion.div
              initial={{ opacity: 0, x: -40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="bg-gray-900/50 backdrop-blur-sm rounded-2xl border border-white/[0.06] p-8"
            >
              <h3 className="text-xl font-bold text-cyan-400 mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-2xl">blur_on</span>
                3D Gaussian Splatting
              </h3>
              <p className="text-gray-400 mb-5 leading-relaxed">
                Scenes are represented as millions of oriented 3D Gaussians — each with position, rotation, anisotropic scale, color (spherical harmonics), and opacity.
                The result renders in real-time via differentiable rasterization.
              </p>
              <div className="grid grid-cols-2 gap-3">
                {['Photorealistic synthesis', 'Complex materials', 'Real-time WebGL', 'Compact PLY files'].map((t, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-gray-300">
                    <span className="material-symbols-outlined text-cyan-500 text-base">check_circle</span>
                    {t}
                  </div>
                ))}
              </div>
            </motion.div>

            {/* SHARP Neural Network card */}
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="bg-gray-900/50 backdrop-blur-sm rounded-2xl border border-white/[0.06] p-8"
            >
              <h3 className="text-xl font-bold text-teal-400 mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-2xl">neurology</span>
                SHARP Neural Network
              </h3>
              <p className="text-gray-400 mb-5 leading-relaxed">
                Apple's SHARP model performs monocular view synthesis — predicting 3D structure from a single 2D image.
                Combined with Depth Anything V2, it achieves state-of-the-art depth estimation that runs entirely in your browser.
              </p>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  { k: 'Architecture', v: 'DINOv2 ViT-L/16' },
                  { k: 'Resolution', v: 'Up to 1536px' },
                  { k: 'Output', v: '~1.18M Splats' },
                  { k: 'Runtime', v: 'WebGPU / WASM' },
                ].map((item, i) => (
                  <div key={i} className="bg-gray-800/50 rounded-lg p-3">
                    <p className="text-[11px] text-gray-500 uppercase tracking-wider">{item.k}</p>
                    <p className="text-white font-medium mt-0.5">{item.v}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          USE CASES
          ═══════════════════════════════════════════ */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
            <p className="text-sm font-bold tracking-[0.2em] uppercase text-emerald-400 mb-3">Applications</p>
            <h2 className="text-4xl md:text-5xl font-bold text-white">Built For Creators</h2>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { title: 'Virtual Tours', desc: 'Create walkthrough experiences from real-estate photos.', icon: 'travel_explore' },
              { title: 'Product Visualization', desc: 'Let customers inspect products from every angle.', icon: 'inventory_2' },
              { title: 'Cultural Heritage', desc: 'Digitize historical sites with photorealistic 3D.', icon: 'account_balance' },
              { title: 'Game Assets', desc: 'Generate 3D reference geometry from concept art.', icon: 'sports_esports' },
              { title: 'Research', desc: 'Explore depth estimation and novel-view synthesis.', icon: 'science' },
              { title: 'Digital Art', desc: 'Turn paintings and illustrations into explorable 3D worlds.', icon: 'palette' },
            ].map((c, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06 }}
                className="flex items-start gap-4 p-5 rounded-xl bg-gray-900/40 border border-white/[0.04] hover:border-cyan-500/15 transition-all"
              >
                <div className="w-10 h-10 shrink-0 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-cyan-400">{c.icon}</span>
                </div>
                <div>
                  <h4 className="font-semibold text-white mb-1">{c.title}</h4>
                  <p className="text-sm text-gray-400 leading-relaxed">{c.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          OUTPUT SPECS
          ═══════════════════════════════════════════ */}
      <section className="py-20 px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-4xl mx-auto bg-gradient-to-r from-gray-900 via-gray-900/80 to-gray-900 border border-white/[0.06] rounded-2xl p-8 md:p-10"
        >
          <h3 className="text-2xl font-bold text-white mb-6 text-center">Output Specification</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            {[
              { label: 'Format', value: 'PLY (Binary)' },
              { label: 'Color', value: 'sRGB' },
              { label: 'Typical Size', value: '60 – 80 MB' },
              { label: 'Coords', value: 'OpenCV (y-down)' },
            ].map((s, i) => (
              <div key={i} className="bg-gray-800/40 rounded-lg p-4">
                <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-1">{s.label}</p>
                <p className="text-white font-medium">{s.value}</p>
              </div>
            ))}
          </div>
          <p className="text-center text-gray-500 text-sm mt-6">
            Works with Anemoia's built-in 3D Splat Viewer and all standard Gaussian Splat renderers.
          </p>
        </motion.div>
      </section>

      {/* ═══════════════════════════════════════════
          FINAL CTA
          ═══════════════════════════════════════════ */}
      <section className="relative py-32 px-6 overflow-hidden">
        {/* Ambient glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-cyan-600/[0.07] blur-[120px]" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative z-10 max-w-3xl mx-auto text-center"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-6 text-white">
            Ready to Build in 3D?
          </h2>
          <p className="text-xl text-gray-400 mb-10 max-w-xl mx-auto leading-relaxed">
            Drop a photo, wait a few seconds, explore your scene from any angle. Entirely free, entirely private.
          </p>
          <Link
            to="/sharp"
            className="group inline-flex items-center gap-3 px-12 py-5 rounded-xl text-xl font-bold bg-gradient-to-r from-cyan-500 to-teal-500 text-gray-950 shadow-2xl shadow-cyan-500/20 hover:shadow-cyan-500/40 hover:scale-[1.04] transition-all"
          >
            <span className="material-symbols-outlined text-2xl group-hover:rotate-12 transition-transform">rocket_launch</span>
            Launch SHARP 3D
          </Link>

          <p className="text-gray-600 text-sm mt-10">
            Based on{' '}
            <a href="https://apple.github.io/ml-sharp/" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-cyan-400 underline underline-offset-2 transition-colors">
              Mescheder et al., 2025
            </a>{' '}
            — "SHARP: Monocular View Synthesis in Less Than a Second"
          </p>
        </motion.div>
      </section>

      <Footer />
    </div>
  );
};

export default SharpLanding;
