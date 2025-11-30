import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import AnimatedPage from '../../components/AnimatedPage';
import Footer from '../../components/Footer';
import Header from '../../components/Header';

const SynthIDRemoverLanding: React.FC = () => {
  return (
    <AnimatedPage>
      <div className="min-h-screen bg-black text-white overflow-hidden relative">
        {/* Header */}
        <Header />

        {/* Hero Section */}
        <div className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 px-6">
          
          {/* Glitch Background */}
          <div className="absolute inset-0 z-0 overflow-hidden">
              <div className="absolute top-[-10%] left-[-10%] w-[120%] h-[120%] bg-[radial-gradient(circle_at_50%_50%,rgba(0,240,255,0.15),transparent_50%)] animate-pulse" />
              <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20" />
          </div>

          <div className="max-w-7xl mx-auto relative z-10 text-center">
            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
            >
                <div className="inline-block border border-[#00f0ff]/50 bg-[#00f0ff]/10 px-4 py-1 rounded-full text-[#00f0ff] font-mono text-sm mb-6 tracking-widest">
                    INTERNAL TOOL // CLASSIFIED
                </div>
                <h1 className="text-6xl lg:text-8xl font-bold tracking-tighter mb-6 glitch-text" data-text="PROJECT SILENCER">
                    PROJECT <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00f0ff] to-blue-600">SILENCER</span>
                </h1>
                <p className="text-xl lg:text-2xl text-gray-400 max-w-3xl mx-auto mb-10 font-light">
                    First-principles based signal neutralization for robust AI watermarks.
                    <br/>
                    <span className="text-[#00f0ff]">Frequency Shredding</span> • <span className="text-blue-400">Adversarial Jamming</span> • <span className="text-purple-400">Diffusion Washing</span>
                </p>
                
                <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                    <Link to="/synthid-remover">
                        <button className="px-8 py-4 bg-[#00f0ff] text-black font-bold tracking-widest hover:bg-white hover:scale-105 transition-all shadow-[0_0_30px_rgba(0,240,255,0.4)] clip-path-polygon">
                            LAUNCH TOOL
                        </button>
                    </Link>
                    <Link to="/compare">
                        <button className="px-8 py-4 border border-gray-700 text-gray-300 font-mono hover:border-[#00f0ff] hover:text-[#00f0ff] transition-all">
                            VIEW BENCHMARKS
                        </button>
                    </Link>
                </div>
            </motion.div>
          </div>
        </div>

        {/* Technical Breakdown Section */}
        <div className="bg-[#050505] border-t border-gray-900 py-20">
            <div className="max-w-7xl mx-auto px-6">
                <div className="grid md:grid-cols-3 gap-8">
                    {[
                        {
                            title: "SIGNAL DECOMPOSITION",
                            desc: "Wavelet transform analysis isolates high-frequency watermark embeddings from semantic content.",
                            icon: "waveform"
                        },
                        {
                            title: "ADVERSARIAL PERTURBATION",
                            desc: "Injects calculated noise patterns that specifically blind classifier detection logic.",
                            icon: "noise_control_off"
                        },
                        {
                            title: "DIFFUSION RECONSTRUCTION",
                            desc: "Stochastic differential equation editing rebuilds pixel history from scratch.",
                            icon: "auto_fix_high"
                        }
                    ].map((feature, i) => (
                        <motion.div 
                            key={i}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.2 }}
                            className="bg-black/50 border border-gray-800 p-8 hover:border-[#00f0ff]/50 transition-colors group"
                        >
                            <div className="mb-6 text-[#00f0ff] group-hover:scale-110 transition-transform origin-left">
                                <span className="material-symbols-outlined text-4xl">{feature.icon}</span>
                            </div>
                            <h3 className="text-xl font-bold text-white mb-4 font-mono">{feature.title}</h3>
                            <p className="text-gray-400 leading-relaxed">{feature.desc}</p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </div>

        <Footer />
      </div>
    </AnimatedPage>
  );
};

export default SynthIDRemoverLanding;

