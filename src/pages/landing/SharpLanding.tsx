import React, { useRef, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform, useSpring } from 'framer-motion';
import Header from '../../components/Header';
import Footer from '../../components/Footer';

// Animated 3D Gaussian visualization
const GaussianSplatsHero: React.FC = () => {
  const [time, setTime] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(t => t + 0.02);
    }, 16);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative w-full max-w-3xl mx-auto h-[400px] perspective-1000">
      <svg viewBox="0 0 400 300" className="w-full h-full">
        <defs>
          {/* Gradients for different splat colors */}
          <radialGradient id="splatPurple" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#a78bfa" stopOpacity="0.9" />
            <stop offset="50%" stopColor="#7c3aed" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#5b21b6" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="splatBlue" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.9" />
            <stop offset="50%" stopColor="#3b82f6" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#1d4ed8" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="splatPink" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#f472b6" stopOpacity="0.9" />
            <stop offset="50%" stopColor="#ec4899" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#be185d" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="splatCyan" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.9" />
            <stop offset="50%" stopColor="#06b6d4" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#0891b2" stopOpacity="0" />
          </radialGradient>
          <filter id="splatGlow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Generate 3D-like point cloud structure */}
        {Array.from({ length: 80 }, (_, i) => {
          // Create a rotating 3D sphere of points
          const phi = (i / 80) * Math.PI * 4;
          const theta = Math.acos(1 - 2 * ((i % 40) / 40));
          const baseRadius = 80;
          
          const rotAngle = time;
          const x3d = Math.sin(theta) * Math.cos(phi + rotAngle) * baseRadius;
          const y3d = Math.sin(theta) * Math.sin(phi + rotAngle) * baseRadius;
          const z3d = Math.cos(theta) * baseRadius;
          
          // Project to 2D with perspective
          const perspective = 300;
          const scale = perspective / (perspective + z3d + 100);
          const x2d = 200 + x3d * scale;
          const y2d = 150 + y3d * scale * 0.7;
          const size = (6 + z3d / 20) * scale;
          
          const gradients = ['splatPurple', 'splatBlue', 'splatPink', 'splatCyan'];
          const gradient = gradients[i % 4];
          
          return (
            <ellipse
              key={i}
              cx={x2d}
              cy={y2d}
              rx={size}
              ry={size * 0.6}
              fill={`url(#${gradient})`}
              filter="url(#splatGlow)"
              opacity={0.3 + scale * 0.5}
              style={{
                transform: `rotate(${(phi * 180 / Math.PI) % 360}deg)`,
                transformOrigin: `${x2d}px ${y2d}px`
              }}
            />
          );
        })}

        {/* Add some foreground accent splats */}
        {Array.from({ length: 20 }, (_, i) => {
          const angle = (i / 20) * Math.PI * 2 + time * 0.5;
          const radius = 100 + Math.sin(i * 0.5 + time * 2) * 20;
          const x = 200 + Math.cos(angle) * radius;
          const y = 150 + Math.sin(angle) * radius * 0.5;
          
          return (
            <ellipse
              key={`accent-${i}`}
              cx={x}
              cy={y}
              rx={10 + Math.sin(i + time) * 3}
              ry={6 + Math.sin(i + time) * 2}
              fill={i % 2 === 0 ? 'url(#splatCyan)' : 'url(#splatPink)'}
              filter="url(#splatGlow)"
              opacity={0.6}
            />
          );
        })}

        {/* Central core */}
        <ellipse
          cx="200"
          cy="150"
          rx={40 + Math.sin(time * 2) * 5}
          ry={25 + Math.sin(time * 2) * 3}
          fill="url(#splatPurple)"
          filter="url(#splatGlow)"
          opacity={0.7}
        />
      </svg>

      {/* Floating text labels */}
      <motion.div
        className="absolute top-10 left-10 text-indigo-400/60 font-mono text-xs"
        animate={{ opacity: [0.4, 0.8, 0.4] }}
        transition={{ duration: 3, repeat: Infinity }}
      >
        x: {Math.sin(time * 2).toFixed(2)}
      </motion.div>
      <motion.div
        className="absolute top-10 right-10 text-purple-400/60 font-mono text-xs"
        animate={{ opacity: [0.4, 0.8, 0.4] }}
        transition={{ duration: 3, repeat: Infinity, delay: 1 }}
      >
        y: {Math.cos(time * 2).toFixed(2)}
      </motion.div>
      <motion.div
        className="absolute bottom-10 left-1/2 -translate-x-1/2 text-cyan-400/60 font-mono text-xs"
        animate={{ opacity: [0.4, 0.8, 0.4] }}
        transition={{ duration: 3, repeat: Infinity, delay: 2 }}
      >
        splats: ~1.18M
      </motion.div>
    </div>
  );
};

const SharpLanding: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  const heroScale = useTransform(scrollYProgress, [0, 0.3], [1, 0.9]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.3], [1, 0]);

  // SEO metadata
  useEffect(() => {
    document.title = 'SHARP 3D Generator - Free Image to 3D Gaussian Splat Converter | Anemoia';
    
    // Set meta description
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute('content', 'Convert any image to 3D Gaussian Splats for free. Browser-based AI 3D reconstruction using Depth Anything V2. No installation required. Create photorealistic 3D scenes from single photos.');
    }
    
    // Set Open Graph tags for social sharing
    const setOGTag = (property: string, content: string) => {
      let tag = document.querySelector(`meta[property="${property}"]`);
      if (!tag) {
        tag = document.createElement('meta');
        tag.setAttribute('property', property);
        document.head.appendChild(tag);
      }
      tag.setAttribute('content', content);
    };
    
    setOGTag('og:title', 'SHARP 3D Generator - Image to 3D Gaussian Splat');
    setOGTag('og:description', 'Transform any photo into a 3D Gaussian Splat scene. Free, browser-based AI 3D reconstruction.');
    setOGTag('og:type', 'website');
    setOGTag('og:url', window.location.href);
    
    // Schema.org structured data for better SEO
    const schema = {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      "name": "SHARP 3D Generator",
      "applicationCategory": "MultimediaApplication",
      "operatingSystem": "Web Browser",
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "USD"
      },
      "description": "Free AI-powered image to 3D Gaussian Splat converter. Transform single photos into photorealistic 3D scenes using neural depth estimation.",
      "featureList": [
        "Single image to 3D conversion",
        "Gaussian Splat output",
        "Browser-based processing",
        "No installation required",
        "PLY file export"
      ]
    };
    
    let schemaScript = document.querySelector('script[type="application/ld+json"][data-page="sharp"]');
    if (!schemaScript) {
      schemaScript = document.createElement('script');
      schemaScript.setAttribute('type', 'application/ld+json');
      schemaScript.setAttribute('data-page', 'sharp');
      document.head.appendChild(schemaScript);
    }
    schemaScript.textContent = JSON.stringify(schema);
    
    return () => {
      // Cleanup schema on unmount
      const cleanupSchema = document.querySelector('script[data-page="sharp"]');
      if (cleanupSchema) cleanupSchema.remove();
    };
  }, []);

  return (
    <div ref={containerRef} className="relative min-h-screen bg-gradient-to-b from-slate-950 via-indigo-950/20 to-slate-950 overflow-x-hidden">
      <Header />

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center px-6 py-20 overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-900/20 via-transparent to-transparent" />
          <motion.div
            className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full bg-indigo-600/20 blur-3xl"
            animate={{ 
              x: [0, 100, 0],
              y: [0, -50, 0],
              scale: [1, 1.2, 1]
            }}
            transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-purple-600/20 blur-3xl"
            animate={{ 
              x: [0, -80, 0],
              y: [0, 60, 0],
              scale: [1, 1.1, 1]
            }}
            transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
          />
          
          {/* Grid overlay */}
          <div 
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage: `linear-gradient(rgba(99, 102, 241, 0.1) 1px, transparent 1px),
                               linear-gradient(90deg, rgba(99, 102, 241, 0.1) 1px, transparent 1px)`,
              backgroundSize: '50px 50px'
            }}
          />
        </div>

        <motion.div 
          className="relative z-10 text-center max-w-5xl mx-auto"
          style={{ scale: heroScale, opacity: heroOpacity }}
        >
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 mb-6"
          >
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-sm font-medium text-indigo-300">Powered by Apple ML Research</span>
          </motion.div>

          {/* Title */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-6xl md:text-8xl font-bold mb-6"
          >
            <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              SHARP
            </span>
            <span className="text-white/90 block md:inline md:ml-4">3D</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-xl md:text-2xl text-gray-300 mb-4 max-w-3xl mx-auto"
          >
            Single-image to 3D Gaussian Splats in seconds
          </motion.p>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-lg text-gray-400 mb-10 max-w-2xl mx-auto"
          >
            Transform any photograph into a photorealistic 3D scene using state-of-the-art neural radiance field technology
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Link
              to="/sharp"
              className="px-8 py-4 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:via-purple-500 hover:to-pink-500 text-white rounded-xl font-semibold text-lg transition-all transform hover:scale-105 shadow-lg shadow-indigo-500/25"
            >
              <span className="flex items-center gap-2 justify-center">
                <span className="material-symbols-outlined">auto_awesome</span>
                Start Creating
              </span>
            </Link>
            <a
              href="https://apple.github.io/ml-sharp/"
              target="_blank"
              rel="noopener noreferrer"
              className="px-8 py-4 bg-slate-800/80 hover:bg-slate-700/80 text-white rounded-xl font-semibold text-lg transition-all border border-slate-700"
            >
              View Research
            </a>
          </motion.div>

          {/* Animated Visualization */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-12"
          >
            <GaussianSplatsHero />
          </motion.div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          className="absolute bottom-10 left-1/2 -translate-x-1/2"
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <div className="w-6 h-10 rounded-full border-2 border-gray-500 flex justify-center pt-2">
            <div className="w-1 h-2 bg-gray-500 rounded-full" />
          </div>
        </motion.div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 px-6 relative">
        <div className="max-w-6xl mx-auto">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-4xl md:text-5xl font-bold text-center mb-4"
          >
            <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
              How It Works
            </span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-gray-400 text-center mb-16 max-w-2xl mx-auto"
          >
            From a single photograph to immersive 3D in three simple steps
          </motion.p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: '01',
                title: 'Upload Image',
                description: 'Drop any photo — landscapes, objects, architecture. SHARP extracts depth and geometry from a single view.',
                icon: 'upload_file',
                color: 'from-blue-500 to-cyan-500'
              },
              {
                step: '02',
                title: 'Neural Processing',
                description: 'Our AI model predicts over 1 million 3D Gaussians with position, rotation, scale, and color — capturing every detail.',
                icon: 'psychology',
                color: 'from-purple-500 to-pink-500'
              },
              {
                step: '03',
                title: 'View in 3D',
                description: 'Explore your scene from any angle. Download as PLY or view instantly in our WebGL-powered 3D viewer.',
                icon: 'view_in_ar',
                color: 'from-pink-500 to-orange-500'
              }
            ].map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="relative"
              >
                {/* Connector line */}
                {index < 2 && (
                  <div className="hidden md:block absolute top-16 left-[calc(50%+40px)] w-[calc(100%-80px)] h-0.5 bg-gradient-to-r from-indigo-500/50 to-transparent" />
                )}
                
                <div className="bg-slate-900/50 backdrop-blur-sm p-8 rounded-2xl border border-indigo-500/10 hover:border-indigo-500/30 transition-all h-full">
                  {/* Step number */}
                  <div className="text-4xl font-bold text-indigo-500/20 mb-4">{item.step}</div>
                  
                  {/* Icon */}
                  <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center mb-4`}>
                    <span className="material-symbols-outlined text-3xl text-white">{item.icon}</span>
                  </div>
                  
                  <h3 className="text-xl font-bold text-white mb-3">{item.title}</h3>
                  <p className="text-gray-400">{item.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Technical Features Section */}
      <section className="py-20 px-6 bg-gradient-to-b from-transparent via-indigo-950/10 to-transparent">
        <div className="max-w-6xl mx-auto">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-4xl md:text-5xl font-bold text-center mb-16 text-white"
          >
            Cutting-Edge Technology
          </motion.h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Left column - Technical specs */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="space-y-6"
            >
              <div className="bg-slate-900/50 backdrop-blur-sm p-6 rounded-2xl border border-indigo-500/10">
                <h3 className="text-xl font-bold text-indigo-400 mb-4">3D Gaussian Splatting</h3>
                <p className="text-gray-400 mb-4">
                  Unlike traditional mesh-based 3D models, Gaussian Splats represent scenes as millions of 3D primitives — each with position, orientation, scale, color, and opacity. This enables:
                </p>
                <ul className="space-y-2">
                  {[
                    'Photorealistic view synthesis',
                    'Complex materials (fur, glass, foliage)',
                    'Real-time rendering performance',
                    'Compact file sizes'
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-2 text-gray-300">
                      <span className="material-symbols-outlined text-indigo-400 text-sm">check_circle</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-slate-900/50 backdrop-blur-sm p-6 rounded-2xl border border-purple-500/10">
                <h3 className="text-xl font-bold text-purple-400 mb-4">SHARP Neural Network</h3>
                <p className="text-gray-400 mb-4">
                  Apple's SHARP model combines advanced computer vision techniques:
                </p>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="bg-slate-800/50 p-3 rounded-lg">
                    <p className="text-gray-500">Architecture</p>
                    <p className="text-white font-medium">DINOv2 ViT-L/16</p>
                  </div>
                  <div className="bg-slate-800/50 p-3 rounded-lg">
                    <p className="text-gray-500">Resolution</p>
                    <p className="text-white font-medium">1536 × 1536</p>
                  </div>
                  <div className="bg-slate-800/50 p-3 rounded-lg">
                    <p className="text-gray-500">Output Splats</p>
                    <p className="text-white font-medium">~1.18 Million</p>
                  </div>
                  <div className="bg-slate-800/50 p-3 rounded-lg">
                    <p className="text-gray-500">Scale</p>
                    <p className="text-white font-medium">Metric (absolute)</p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Right column - Use cases */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="bg-slate-900/50 backdrop-blur-sm p-6 rounded-2xl border border-pink-500/10"
            >
              <h3 className="text-xl font-bold text-pink-400 mb-6">Perfect For</h3>
              <div className="space-y-4">
                {[
                  {
                    title: 'Virtual Tours',
                    desc: 'Create immersive walkthrough experiences from photos',
                    icon: 'travel_explore'
                  },
                  {
                    title: 'Product Visualization',
                    desc: 'Let customers view products from any angle',
                    icon: 'inventory_2'
                  },
                  {
                    title: 'Cultural Heritage',
                    desc: 'Preserve and share historical sites in 3D',
                    icon: 'account_balance'
                  },
                  {
                    title: 'Game Development',
                    desc: 'Generate 3D assets from reference photos',
                    icon: 'sports_esports'
                  },
                  {
                    title: 'Research & Education',
                    desc: 'Study and visualize complex 3D structures',
                    icon: 'science'
                  },
                  {
                    title: 'Digital Art',
                    desc: 'Create unique 3D artworks from imagination',
                    icon: 'palette'
                  }
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-4 p-3 rounded-lg hover:bg-slate-800/50 transition-colors">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-pink-500/20 to-purple-500/20 flex items-center justify-center flex-shrink-0">
                      <span className="material-symbols-outlined text-pink-400">{item.icon}</span>
                    </div>
                    <div>
                      <h4 className="font-medium text-white">{item.title}</h4>
                      <p className="text-sm text-gray-400">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Output Format Section */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-gradient-to-r from-slate-900 via-indigo-900/20 to-slate-900 p-8 rounded-2xl border border-indigo-500/20"
          >
            <h3 className="text-2xl font-bold text-white mb-6 text-center">Output Specification</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              {[
                { label: 'File Format', value: 'PLY (Binary)' },
                { label: 'Color Space', value: 'sRGB' },
                { label: 'Typical Size', value: '60-80 MB' },
                { label: 'Coordinate System', value: 'OpenCV (y-down)' }
              ].map((item, i) => (
                <div key={i} className="p-4 rounded-lg bg-slate-800/50">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">{item.label}</p>
                  <p className="text-white font-medium">{item.value}</p>
                </div>
              ))}
            </div>
            <p className="text-center text-gray-400 text-sm mt-6">
              Compatible with Anemoia's 3D Splat Viewer and standard Gaussian Splat renderers
            </p>
          </motion.div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-20 px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-4xl mx-auto text-center"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Ready to Create?
            </span>
          </h2>
          <p className="text-xl text-gray-300 mb-8">
            Transform your images into immersive 3D experiences. No installation required.
          </p>
          <Link
            to="/sharp"
            className="inline-flex items-center gap-3 px-10 py-5 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:via-purple-500 hover:to-pink-500 text-white rounded-xl font-semibold text-xl transition-all transform hover:scale-105 shadow-2xl shadow-indigo-500/30"
          >
            <span className="material-symbols-outlined text-2xl">rocket_launch</span>
            Launch SHARP 3D
          </Link>
          
          <p className="text-gray-500 text-sm mt-8">
            Based on <a href="https://apple.github.io/ml-sharp/" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">Mescheder et al., 2025</a> — 
            "Sharp: Monocular View Synthesis in Less Than a Second"
          </p>
        </motion.div>
      </section>

      <Footer />
    </div>
  );
};

export default SharpLanding;




