import { motion, useScroll, useTransform } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';

const OCRCompareLanding = () => {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [hoveredMode, setHoveredMode] = useState<'ocr' | 'ui' | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"]
  });

  const y1 = useTransform(scrollYProgress, [0, 1], ["0%", "50%"]);
  const y2 = useTransform(scrollYProgress, [0, 1], ["0%", "-50%"]);
  const opacity = useTransform(scrollYProgress, [0, 0.5, 1], [1, 0.8, 0.3]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ 
        x: (e.clientX / window.innerWidth) * 100, 
        y: (e.clientY / window.innerHeight) * 100 
      });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  useEffect(() => {
    document.title = 'OCR & Visual Comparison Tool - Advanced Image Analysis | Anemoia';
  }, []);

  return (
    <div ref={containerRef} className="min-h-screen bg-gradient-to-br from-gray-950 via-slate-900 to-gray-950 relative overflow-hidden">
      {/* Animated Background Grid with Perspective */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div 
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: `
              repeating-linear-gradient(0deg, transparent, transparent 50px, rgba(147, 51, 234, 0.08) 50px, rgba(147, 51, 234, 0.08) 51px),
              repeating-linear-gradient(90deg, transparent, transparent 50px, rgba(236, 72, 153, 0.08) 50px, rgba(236, 72, 153, 0.08) 51px)
            `,
            transform: `perspective(1000px) rotateX(60deg) translateZ(0)`,
            transformOrigin: 'center top',
          }}
        />
        
        {/* Floating Orbs */}
        <motion.div 
          className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(236, 72, 153, 0.15) 0%, transparent 70%)',
            x: useTransform(scrollYProgress, [0, 1], [0, 200]),
            y: y1,
          }}
        />
        <motion.div 
          className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(147, 51, 234, 0.15) 0%, transparent 70%)',
            x: useTransform(scrollYProgress, [0, 1], [0, -200]),
            y: y2,
          }}
        />

        {/* Dynamic Mouse-Following Gradient */}
        <div 
          className="absolute w-[600px] h-[600px] pointer-events-none transition-all duration-500 ease-out"
          style={{
            background: 'radial-gradient(circle, rgba(251, 146, 60, 0.08) 0%, transparent 70%)',
            left: `${mousePosition.x}%`,
            top: `${mousePosition.y}%`,
            transform: 'translate(-50%, -50%)',
          }}
        />
      </div>

      {/* Content */}
      <motion.div className="relative z-10" style={{ opacity }}>
        {/* Header */}
        <motion.header 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-8"
        >
          <Link to="/" className="inline-flex items-center gap-2 text-gray-400 hover:text-pink-400 transition-colors group">
            <motion.span 
              className="material-symbols-outlined"
              whileHover={{ x: -5 }}
            >
              arrow_back
            </motion.span>
            <span className="font-medium">Back to Tools</span>
          </Link>
        </motion.header>

        {/* Hero Section */}
        <section className="px-8 py-16 max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-20"
          >
            {/* Animated Icon Cluster */}
            <div className="relative w-40 h-40 mx-auto mb-12">
              <motion.div
                className="absolute inset-0"
                animate={{ rotate: 360 }}
                transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
              >
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-16 h-16 bg-gradient-to-br from-pink-500 to-rose-600 rounded-2xl flex items-center justify-center shadow-lg shadow-pink-500/50">
                  <span className="material-symbols-outlined text-white text-3xl">text_fields</span>
                </div>
              </motion.div>
              
              <motion.div
                className="absolute inset-0"
                animate={{ rotate: -360 }}
                transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
              >
                <div className="absolute bottom-0 right-0 w-16 h-16 bg-gradient-to-br from-purple-500 to-violet-600 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/50">
                  <span className="material-symbols-outlined text-white text-3xl">compare</span>
                </div>
              </motion.div>

              <motion.div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 bg-gradient-to-br from-orange-500 to-amber-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-orange-500/50"
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              >
                <span className="material-symbols-outlined text-white text-4xl">visibility</span>
              </motion.div>
            </div>

            <motion.h1 
              className="text-7xl md:text-9xl font-black mb-6 leading-tight"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.8 }}
            >
              <span className="block bg-gradient-to-r from-pink-400 via-purple-400 to-orange-400 bg-clip-text text-transparent">
                OCR
              </span>
              <span className="block text-gray-300 text-5xl md:text-7xl mt-2">
                & Visual Comparison
              </span>
            </motion.h1>
            
            <motion.p 
              className="text-xl md:text-2xl text-gray-400 mb-12 max-w-3xl mx-auto leading-relaxed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              Extract text with <span className="text-pink-400 font-semibold">AI-powered OCR</span> or 
              analyze UI layouts in <span className="text-purple-400 font-semibold">precision mode</span>. 
              Two powerful tools, one elegant interface.
            </motion.p>
          </motion.div>

          {/* Dual Mode Showcase Cards */}
          <div className="grid md:grid-cols-2 gap-8 mb-16">
            {/* OCR Mode Card */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6, duration: 0.6 }}
              whileHover={{ scale: 1.02, y: -5 }}
              onHoverStart={() => setHoveredMode('ocr')}
              onHoverEnd={() => setHoveredMode(null)}
              className="relative group"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-pink-500/20 to-rose-600/20 rounded-3xl blur-xl group-hover:blur-2xl transition-all duration-300" />
              <div className="relative bg-gray-900/80 backdrop-blur-xl border border-pink-500/30 rounded-3xl p-8 overflow-hidden">
                {/* Animated Background Pattern */}
                <div className="absolute inset-0 opacity-5">
                  <div className="absolute inset-0" style={{
                    backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 20px, rgba(236, 72, 153, 0.5) 20px, rgba(236, 72, 153, 0.5) 21px)`
                  }} />
                </div>

                <div className="relative z-10">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-14 h-14 bg-gradient-to-br from-pink-500 to-rose-600 rounded-2xl flex items-center justify-center shadow-lg shadow-pink-500/50">
                      <span className="material-symbols-outlined text-white text-3xl">text_fields</span>
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-white">OCR Mode</h3>
                      <p className="text-pink-400 text-sm font-medium">Tesseract.js Powered</p>
                    </div>
                  </div>

                  <p className="text-gray-300 mb-6 leading-relaxed">
                    Extract and compare text from images with industry-leading OCR technology. 
                    Perfect for document analysis, screenshot comparisons, and text extraction.
                  </p>

                  <div className="space-y-3 mb-6">
                    {[
                      { icon: 'language', text: 'Multi-language support' },
                      { icon: 'psychology', text: 'AI-powered text recognition' },
                      { icon: 'difference', text: 'Text difference highlighting' },
                      { icon: 'speed', text: 'Real-time processing' },
                    ].map((feature, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.8 + i * 0.1 }}
                        className="flex items-center gap-3 text-gray-300"
                      >
                        <span className="material-symbols-outlined text-pink-400 text-xl">{feature.icon}</span>
                        <span className="text-sm">{feature.text}</span>
                      </motion.div>
                    ))}
                  </div>

                  <motion.div
                    className="absolute bottom-0 right-0 w-32 h-32 opacity-10"
                    animate={{ 
                      rotate: hoveredMode === 'ocr' ? 180 : 0,
                      scale: hoveredMode === 'ocr' ? 1.2 : 1,
                    }}
                    transition={{ duration: 0.6 }}
                  >
                    <span className="material-symbols-outlined text-pink-400" style={{ fontSize: '8rem' }}>article</span>
                  </motion.div>
                </div>
              </div>
            </motion.div>

            {/* UI Mode Card */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6, duration: 0.6 }}
              whileHover={{ scale: 1.02, y: -5 }}
              onHoverStart={() => setHoveredMode('ui')}
              onHoverEnd={() => setHoveredMode(null)}
              className="relative group"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-violet-600/20 rounded-3xl blur-xl group-hover:blur-2xl transition-all duration-300" />
              <div className="relative bg-gray-900/80 backdrop-blur-xl border border-purple-500/30 rounded-3xl p-8 overflow-hidden">
                {/* Animated Background Pattern */}
                <div className="absolute inset-0 opacity-5">
                  <div className="absolute inset-0" style={{
                    backgroundImage: `repeating-linear-gradient(-45deg, transparent, transparent 20px, rgba(147, 51, 234, 0.5) 20px, rgba(147, 51, 234, 0.5) 21px)`
                  }} />
                </div>

                <div className="relative z-10">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-violet-600 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/50">
                      <span className="material-symbols-outlined text-white text-3xl">dashboard_customize</span>
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-white">UI Mode</h3>
                      <p className="text-purple-400 text-sm font-medium">Pixel-Perfect Analysis</p>
                    </div>
                  </div>

                  <p className="text-gray-300 mb-6 leading-relaxed">
                    Compare UI layouts, screenshots, and designs with precision pixel analysis. 
                    Ideal for developers, designers, and QA testing workflows.
                  </p>

                  <div className="space-y-3 mb-6">
                    {[
                      { icon: 'photo_size_select_small', text: 'Pixel-level comparison' },
                      { icon: 'palette', text: 'Color difference detection' },
                      { icon: 'architecture', text: 'Layout analysis' },
                      { icon: 'rule', text: 'Dimension measurements' },
                    ].map((feature, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.8 + i * 0.1 }}
                        className="flex items-center gap-3 text-gray-300"
                      >
                        <span className="material-symbols-outlined text-purple-400 text-xl">{feature.icon}</span>
                        <span className="text-sm">{feature.text}</span>
                      </motion.div>
                    ))}
                  </div>

                  <motion.div
                    className="absolute bottom-0 right-0 w-32 h-32 opacity-10"
                    animate={{ 
                      rotate: hoveredMode === 'ui' ? -180 : 0,
                      scale: hoveredMode === 'ui' ? 1.2 : 1,
                    }}
                    transition={{ duration: 0.6 }}
                  >
                    <span className="material-symbols-outlined text-purple-400" style={{ fontSize: '8rem' }}>devices</span>
                  </motion.div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* CTA Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1 }}
            className="text-center"
          >
            <Link to="/compare">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="relative group px-12 py-6 overflow-hidden rounded-full"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-pink-500 via-purple-500 to-orange-500 animate-gradient-x" />
                <div className="absolute inset-0 bg-gradient-to-r from-pink-600 via-purple-600 to-orange-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <span className="relative z-10 text-white font-bold text-xl flex items-center gap-3">
                  Start Comparing
                  <span className="material-symbols-outlined">arrow_forward</span>
                </span>
              </motion.button>
            </Link>
            <p className="text-gray-500 text-sm mt-4">No sign-up required • 100% Browser-based • Privacy-First</p>
          </motion.div>
        </section>

        {/* Features Grid */}
        <section className="px-8 py-16 max-w-7xl mx-auto">
          <motion.h2 
            className="text-4xl md:text-5xl font-bold text-center mb-16 text-white"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            Powerful Features
          </motion.h2>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: 'lock', title: 'Private & Secure', desc: 'All processing happens locally in your browser. Your images never leave your device.', color: 'from-green-500 to-emerald-600' },
              { icon: 'flash_on', title: 'Lightning Fast', desc: 'GPU-accelerated processing for instant results, even with large high-resolution images.', color: 'from-yellow-500 to-orange-600' },
              { icon: 'widgets', title: 'Side-by-Side View', desc: 'Compare images simultaneously with synchronized zoom and interactive overlays.', color: 'from-cyan-500 to-teal-600' },
              { icon: 'tune', title: 'Advanced Controls', desc: 'Normalize ratios, toggle annotations, and customize comparison parameters.', color: 'from-indigo-500 to-purple-600' },
              { icon: 'analytics', title: 'Detailed Analysis', desc: 'Get comprehensive reports with similarity scores and difference statistics.', color: 'from-rose-500 to-pink-600' },
              { icon: 'download', title: 'Export Results', desc: 'Save annotated comparisons and analysis reports for documentation.', color: 'from-violet-500 to-fuchsia-600' },
            ].map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                whileHover={{ y: -5 }}
                className="relative group"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-10 rounded-2xl blur-xl group-hover:opacity-20 transition-opacity duration-300`} />
                <div className="relative bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-6 h-full">
                  <div className={`w-12 h-12 bg-gradient-to-br ${feature.color} rounded-xl flex items-center justify-center mb-4 shadow-lg`}>
                    <span className="material-symbols-outlined text-white text-2xl">{feature.icon}</span>
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">{feature.title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">{feature.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* FAQ Section */}
        <section className="px-8 py-16 max-w-4xl mx-auto">
          <motion.h2 
            className="text-4xl md:text-5xl font-bold text-center mb-12 text-white"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            Frequently Asked Questions
          </motion.h2>

          <div className="space-y-4">
            {[
              { q: 'What image formats are supported?', a: 'We support JPG, PNG, WebP, GIF, and most common image formats. Files can be up to 50MB each.' },
              { q: 'Is my data kept private?', a: 'Absolutely! All image processing happens locally in your browser. Your images are never uploaded to any server.' },
              { q: 'What is the difference between OCR and UI mode?', a: 'OCR mode extracts and compares text content from images, while UI mode performs pixel-level visual analysis for layout and design comparison.' },
              { q: 'Can I use this for commercial projects?', a: 'Yes! Our tool is free to use for both personal and commercial projects without any restrictions.' },
            ].map((faq, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-xl p-6"
              >
                <h3 className="text-lg font-semibold text-white mb-2">{faq.q}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{faq.a}</p>
              </motion.div>
            ))}
          </div>
        </section>
      </motion.div>

      {/* Custom Styles */}
      <style>{`
        @keyframes gradient-x {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        .animate-gradient-x {
          background-size: 200% 200%;
          animation: gradient-x 3s ease infinite;
        }
      `}</style>
    </div>
  );
};

export default OCRCompareLanding;

