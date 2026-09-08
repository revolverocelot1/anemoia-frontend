import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import AnimatedPage from '../../components/AnimatedPage';
import Footer from '../../components/Footer';
import Header from '../../components/Header';
import {
  Sparkles,
  Zap,
  ShieldCheck,
  Film,
  Layers,
  CheckCircle2,
  ArrowRight,
  Sliders,
  Maximize2,
} from 'lucide-react';

export const GeminiWatermarkLanding: React.FC = () => {
  return (
    <AnimatedPage>
      <div className="min-h-screen bg-[#07060D] text-white selection:bg-purple-500 selection:text-white">
        <Header />

        {/* Hero Section */}
        <section className="relative pt-36 pb-24 px-6 overflow-hidden">
          {/* Ambient Glows */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-12 left-1/2 -translate-x-1/2 w-[750px] h-[350px] bg-purple-600/15 blur-[120px] rounded-full" />
            <div className="absolute bottom-10 right-1/4 w-[400px] h-[400px] bg-indigo-600/10 blur-[100px] rounded-full" />
          </div>

          <div className="max-w-5xl mx-auto relative z-10 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-semibold tracking-wider uppercase mb-8 shadow-[0_0_20px_rgba(168,85,247,0.15)]">
                <Sparkles className="w-4 h-4 text-purple-400" />
                The Ultimate Gemini & Veo Watermark Remover · 2026
              </div>

              <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight mb-6 leading-[1.1]">
                Clean Every Frame. <br />
                <span className="bg-gradient-to-r from-purple-400 via-indigo-300 to-pink-400 bg-clip-text text-transparent">
                  100% Original Quality.
                </span>
              </h1>

              <p className="text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed font-normal">
                Erase the visible Gemini & Veo sparkle logo from images and videos locally in your browser. 
                Powered by mathematical Reverse Alpha Blending with zero quality degradation.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link to="/gemini-watermark-remover">
                  <button className="px-8 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-purple-500 hover:to-indigo-500 transition-all shadow-xl shadow-purple-600/30 flex items-center gap-2.5 text-base">
                    Launch Watermark Remover
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </Link>
                <a
                  href="#how-it-works"
                  className="px-7 py-4 rounded-xl border border-slate-800 bg-slate-900/50 hover:bg-slate-800/80 text-slate-300 hover:text-white transition-colors text-base"
                >
                  How Reverse Alpha Works
                </a>
              </div>

              {/* Trust Badges */}
              <div className="flex flex-wrap items-center justify-center gap-6 mt-12 text-xs text-slate-400">
                <span className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  100% Private (No Uploads)
                </span>
                <span className="flex items-center gap-2">
                  <Film className="w-4 h-4 text-purple-400" />
                  Supports 4K Videos & Audio Pass-Through
                </span>
                <span className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-400" />
                  GPU Hardware Accelerated
                </span>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Feature Grid */}
        <section id="how-it-works" className="py-20 px-6 border-t border-slate-900 bg-[#090812]">
          <div className="max-w-6xl mx-auto">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <h2 className="text-3xl font-bold text-white tracking-tight mb-4">
                Why Mathematical Inversion Beats AI Inpainting
              </h2>
              <p className="text-sm sm:text-base text-slate-400">
                AI inpainting algorithms hallucinate pixels and leave blurry patches. Our engine solves the exact compositing equation used to apply the logo.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="p-8 rounded-2xl bg-[#0E0C1A] border border-slate-800/80 flex flex-col items-start shadow-xl">
                <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-6">
                  <Sparkles className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Deterministic Restoration</h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  We reverse the exact alpha transparency equation applied by Google Gemini, restoring original underlying pixels with near-lossless accuracy.
                </p>
              </div>

              <div className="p-8 rounded-2xl bg-[#0E0C1A] border border-slate-800/80 flex flex-col items-start shadow-xl">
                <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-6">
                  <Zap className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">WebCodecs Video Engine</h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Leveraging native browser GPU video decoders and encoders for 60–120+ FPS processing. A 10-second Veo clip is processed in seconds.
                </p>
              </div>

              <div className="p-8 rounded-2xl bg-[#0E0C1A] border border-slate-800/80 flex flex-col items-start shadow-xl">
                <div className="w-12 h-12 rounded-xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400 mb-6">
                  <Layers className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Batch Queue & ZIP</h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Drag and drop multiple images and videos. Clean entire batches simultaneously with our multi-core worker pool and download as a single ZIP.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Bottom Section */}
        <section className="py-24 px-6 border-t border-slate-900 relative overflow-hidden">
          <div className="max-w-4xl mx-auto text-center relative z-10">
            <h2 className="text-3xl sm:text-5xl font-extrabold text-white mb-6">
              Ready to post clean, unbranded AI media?
            </h2>
            <p className="text-base text-slate-400 max-w-xl mx-auto mb-8">
              No signups, no cloud uploads, no monthly paywalls. Free and unlimited client-side processing on Anemoia.
            </p>
            <Link to="/gemini-watermark-remover">
              <button className="px-9 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-xl shadow-purple-600/30 transition-all text-base inline-flex items-center gap-2">
                Launch Remover Now
                <ArrowRight className="w-5 h-5" />
              </button>
            </Link>
          </div>
        </section>

        <Footer />
      </div>
    </AnimatedPage>
  );
};

export default GeminiWatermarkLanding;
