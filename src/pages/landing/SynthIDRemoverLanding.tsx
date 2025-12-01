import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import AnimatedPage from '../../components/AnimatedPage';
import Footer from '../../components/Footer';
import Header from '../../components/Header';

const SynthIDRemoverLanding: React.FC = () => {
  return (
    <AnimatedPage>
      <div className="min-h-screen bg-slate-950 text-white">
        <Header />

        {/* Hero Section */}
        <section className="relative pt-32 pb-24 px-6 overflow-hidden">
          {/* Background */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-indigo-600/10 blur-[100px] rounded-full" />
            <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-purple-600/10 blur-[100px] rounded-full" />
          </div>

          <div className="max-w-5xl mx-auto relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-center"
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-800/50 border border-slate-700 mb-8">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                <span className="text-sm text-slate-300">Based on arXiv:2510.09263v1</span>
              </div>

              <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6">
                SynthID
                <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent"> Processor</span>
              </h1>

              <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
                Advanced signal processing tool for analyzing and processing AI watermarks.
                Built on research-backed techniques for maximum effectiveness.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link to="/synthid-remover">
                  <button className="px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-xl hover:from-indigo-500 hover:to-purple-500 transition-all shadow-lg shadow-indigo-500/25">
                    Launch Tool
                  </button>
                </Link>
                <a 
                  href="https://arxiv.org/abs/2510.09263" 
                  target="_blank" 
                  rel="noreferrer"
                  className="px-8 py-4 text-slate-400 hover:text-white transition-colors flex items-center gap-2"
                >
                  Read Research
                  <span className="material-symbols-outlined text-sm">open_in_new</span>
                </a>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Features */}
        <section className="py-24 px-6 bg-slate-900/50">
          <div className="max-w-6xl mx-auto">
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <h2 className="text-3xl font-bold mb-4">Research-Backed Approach</h2>
              <p className="text-slate-400 max-w-2xl mx-auto">
                Our processing pipeline is based on vulnerabilities identified in the SynthID research paper.
              </p>
            </motion.div>

            <div className="grid md:grid-cols-3 gap-6">
              {[
                {
                  icon: "transform",
                  title: "Geometric Jitter",
                  desc: "Small rotations (0.5-2°) are more effective than 90/180/270° rotations according to the paper's findings."
                },
                {
                  icon: "palette",
                  title: "YCbCr Attack",
                  desc: "Targets the chroma channels where watermarks are typically embedded, as humans are less sensitive to these changes."
                },
                {
                  icon: "waves",
                  title: "Frequency Perturbation",
                  desc: "DCT-based processing disrupts the high-frequency patterns used by the watermark encoder."
                },
                {
                  icon: "blur_on",
                  title: "Adversarial Noise",
                  desc: "Spatially-varying noise patterns designed to confuse the neural network decoder."
                },
                {
                  icon: "compress",
                  title: "JPEG Re-encoding",
                  desc: "Lossy compression breaks the precise pixel values required for watermark detection."
                },
                {
                  icon: "auto_fix_high",
                  title: "Quality Preservation",
                  desc: "Sharpening and cleanup stages restore visual quality lost during processing."
                }
              ].map((feature, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="p-6 rounded-2xl bg-slate-800/50 border border-slate-700/50 hover:border-slate-600 transition-colors"
                >
                  <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 mb-4">
                    <span className="material-symbols-outlined">{feature.icon}</span>
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">{feature.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Paper Insights */}
        <section className="py-24 px-6">
          <div className="max-w-4xl mx-auto">
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl p-8 md:p-12 border border-slate-700">
              <div className="flex items-start gap-4 mb-6">
                <div className="p-3 bg-indigo-500/10 rounded-xl">
                  <span className="material-symbols-outlined text-2xl text-indigo-400">science</span>
                </div>
                <div>
                  <h3 className="text-2xl font-bold mb-2">Key Paper Findings</h3>
                  <p className="text-slate-400">From arXiv:2510.09263v1 - SynthID-Image: Image watermarking at internet scale</p>
                </div>
              </div>

              <div className="space-y-4 text-slate-300">
                <div className="flex gap-3">
                  <span className="text-indigo-400 font-mono">01</span>
                  <p>"CombinationWorst" attack category shows lowest TPR (98.06%) - our primary attack vector</p>
                </div>
                <div className="flex gap-3">
                  <span className="text-indigo-400 font-mono">02</span>
                  <p>"Neural networks may be more vulnerable to small rotations than 90, 180 or 270 degree rotations"</p>
                </div>
                <div className="flex gap-3">
                  <span className="text-indigo-400 font-mono">03</span>
                  <p>Watermarks are embedded in chroma channels (Cb/Cr) where humans are less sensitive</p>
                </div>
                <div className="flex gap-3">
                  <span className="text-indigo-400 font-mono">04</span>
                  <p>The 4-pointed star is a separate visual indicator, not the invisible watermark itself</p>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-slate-700 flex items-center justify-between">
                <div className="text-sm text-slate-500">
                  <span className="font-mono">SynthID-O</span> • 136-bit payload • 512×512 images
                </div>
                <Link to="/synthid-remover">
                  <button className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors">
                    Try Now
                  </button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Modes */}
        <section className="py-24 px-6 bg-slate-900/50">
          <div className="max-w-5xl mx-auto">
            <div className="grid md:grid-cols-2 gap-8">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="p-8 rounded-2xl bg-gradient-to-br from-emerald-900/20 to-slate-900 border border-emerald-700/30"
              >
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 mb-6">
                  <span className="material-symbols-outlined text-3xl">shield</span>
                </div>
                <h3 className="text-2xl font-bold mb-3">Neutralize Mode</h3>
                <p className="text-slate-400 mb-6">
                  Remove SynthID watermarks from AI-generated images using our multi-stage processing pipeline.
                </p>
                <ul className="space-y-2 text-sm text-slate-300">
                  <li className="flex items-center gap-2">
                    <span className="text-emerald-400">✓</span> Visual star removal
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-emerald-400">✓</span> Invisible watermark neutralization
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-emerald-400">✓</span> Quality preservation
                  </li>
                </ul>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="p-8 rounded-2xl bg-gradient-to-br from-indigo-900/20 to-slate-900 border border-indigo-700/30"
              >
                <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 mb-6">
                  <span className="material-symbols-outlined text-3xl">fingerprint</span>
                </div>
                <h3 className="text-2xl font-bold mb-3">Imprint Mode</h3>
                <p className="text-slate-400 mb-6">
                  Add a SynthID-like watermark pattern to real images for testing and analysis purposes.
                </p>
                <ul className="space-y-2 text-sm text-slate-300">
                  <li className="flex items-center gap-2">
                    <span className="text-indigo-400">✓</span> YCbCr pattern injection
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-indigo-400">✓</span> Visual star indicator
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-indigo-400">✓</span> Configurable strength
                  </li>
                </ul>
              </motion.div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-24 px-6">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-4xl font-bold mb-6">Ready to Process?</h2>
            <p className="text-slate-400 mb-10">
              All processing happens locally in your browser. No images are uploaded to any server.
            </p>
            <Link to="/synthid-remover">
              <button className="px-10 py-5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-lg font-semibold rounded-xl hover:from-indigo-500 hover:to-purple-500 transition-all shadow-xl shadow-indigo-500/25">
                Launch SynthID Processor
              </button>
            </Link>
          </div>
        </section>

        <Footer />
      </div>
    </AnimatedPage>
  );
};

export default SynthIDRemoverLanding;
