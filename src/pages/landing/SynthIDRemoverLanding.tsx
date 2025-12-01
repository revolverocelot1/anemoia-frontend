import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import AnimatedPage from '../../components/AnimatedPage';
import Footer from '../../components/Footer';
import Header from '../../components/Header';

const SynthIDRemoverLanding: React.FC = () => {
  return (
    <AnimatedPage>
      <div className="min-h-screen bg-[#050505] text-white overflow-hidden selection:bg-indigo-500/30">
        <Header />

        {/* Hero Section */}
        <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 px-6">
          {/* Background Ambience */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-indigo-600/10 blur-[120px] rounded-full opacity-50" />
          </div>

          <div className="max-w-5xl mx-auto relative z-10 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 mb-8 backdrop-blur-sm">
                <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></span>
                <span className="text-xs font-medium text-indigo-200 tracking-wide uppercase">Research Preview</span>
              </div>
              
              <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 bg-gradient-to-b from-white via-white to-gray-500 bg-clip-text text-transparent">
                Project Silencer
              </h1>
              
              <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed font-light">
                Advanced signal processing utility for analyzing and neutralizing robust invisible watermarks.
                <br className="hidden md:block" />
                <span className="text-indigo-400">Local Processing</span> • <span className="text-indigo-400">Geometric Attacks</span> • <span className="text-indigo-400">Chroma Washing</span>
              </p>
              
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link to="/synthid-remover">
                  <button className="px-8 py-4 bg-white text-black font-semibold rounded-full hover:scale-105 transition-all shadow-[0_0_40px_-10px_rgba(255,255,255,0.3)]">
                    Launch Utility
                  </button>
                </Link>
                <a href="https://deepmind.google/technologies/synthid/" target="_blank" rel="noreferrer" className="px-8 py-4 text-gray-400 hover:text-white transition-colors">
                  View Research
                </a>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Features Grid */}
        <section className="py-24 px-6 border-t border-white/5 bg-[#0a0a0a]">
          <div className="max-w-6xl mx-auto">
            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  title: "Signal Disruption",
                  desc: "Targeted 4:2:0 chroma subsampling attacks high-frequency watermark signals hidden in color channels.",
                  icon: "blur_on"
                },
                {
                  title: "Geometric Jitter",
                  desc: "Micro-rotations and elastic scaling break the rigid pixel grid alignment required for deep learning detectors.",
                  icon: "transform"
                },
                {
                  title: "Imprint & Reverse",
                  desc: "Inject simulated watermark patterns into clean images to test detection robustness and attribution logic.",
                  icon: "fingerprint"
                }
              ].map((feature, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="p-8 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-colors"
                >
                  <div className="w-12 h-12 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-400 mb-6">
                    <span className="material-symbols-outlined">{feature.icon}</span>
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-3">{feature.title}</h3>
                  <p className="text-gray-400 leading-relaxed text-sm">{feature.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Technical Note */}
        <section className="py-24 px-6">
          <div className="max-w-4xl mx-auto bg-[#111] rounded-3xl border border-white/10 p-8 md:p-12">
            <div className="flex flex-col md:flex-row gap-8 items-center">
              <div className="flex-1">
                <h3 className="text-2xl font-bold mb-4 text-white">Based on First Principles</h3>
                <p className="text-gray-400 leading-relaxed mb-6">
                  SynthID and similar technologies rely on preserving high-frequency correlations across the image spectrum. 
                  Project Silencer introduces controlled entropy to these specific bands, raising the noise floor just enough to decouple the watermark without destroying semantic content.
                </p>
                <div className="flex gap-4 text-sm text-gray-500 font-mono">
                  <span>v1.0.4</span>
                  <span>•</span>
                  <span>CANVAS_API</span>
                  <span>•</span>
                  <span>WEBGL_ACCEL</span>
                </div>
              </div>
              <div className="w-full md:w-64 h-64 bg-black rounded-2xl border border-white/5 relative overflow-hidden flex items-center justify-center">
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
                <div className="w-32 h-32 bg-indigo-500/20 blur-3xl rounded-full absolute animate-pulse"></div>
                <span className="material-symbols-outlined text-6xl text-white/20 relative z-10">science</span>
              </div>
            </div>
          </div>
        </section>

        <Footer />
      </div>
    </AnimatedPage>
  );
};

export default SynthIDRemoverLanding;
