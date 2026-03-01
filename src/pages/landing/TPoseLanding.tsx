import { motion, useScroll, useTransform } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';

const TPoseLanding = () => {
  const [rotationAngle, setRotationAngle] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"]
  });

  const y = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);
  const rotate = useTransform(scrollYProgress, [0, 1], [0, 360]);

  useEffect(() => {
    const interval = setInterval(() => {
      setRotationAngle(prev => (prev + 90) % 360);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    document.title = 'AI T-Pose Generator - 3D Ready Character Poses | Anemoia';
  }, []);

  return (
    <div ref={containerRef} className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950 relative overflow-hidden">
      {/* 3D Grid Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div 
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `
              repeating-linear-gradient(
                0deg,
                transparent,
                transparent 60px,
                rgba(99, 102, 241, 0.15) 60px,
                rgba(99, 102, 241, 0.15) 61px
              ),
              repeating-linear-gradient(
                90deg,
                transparent,
                transparent 60px,
                rgba(99, 102, 241, 0.15) 60px,
                rgba(99, 102, 241, 0.15) 61px
              )
            `,
            transform: 'perspective(600px) rotateX(60deg)',
            transformOrigin: 'center bottom',
          }}
        />
        
        {/* Animated 3D Wireframe Orbs */}
        <motion.div 
          className="absolute top-1/4 left-1/4 w-64 h-64"
          style={{ y }}
        >
          <motion.div 
            className="w-full h-full border-2 border-indigo-500/30 rounded-full"
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          />
        </motion.div>
        
        <motion.div 
          className="absolute bottom-1/4 right-1/4 w-96 h-96"
          style={{ y: useTransform(scrollYProgress, [0, 1], ["0%", "-20%"]) }}
        >
          <motion.div 
            className="w-full h-full border-2 border-violet-500/30 rounded-full"
            animate={{ rotate: [360, 0] }}
            transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          />
        </motion.div>

        {/* Floating Particles */}
        {Array.from({ length: 20 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 bg-indigo-400 rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [0, -30, 0],
              opacity: [0.2, 1, 0.2],
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
        ))}
      </div>

      {/* Content */}
      <div className="relative z-10">
        {/* Header */}
        <motion.header 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-8"
        >
          <Link to="/" className="inline-flex items-center gap-2 text-gray-400 hover:text-indigo-400 transition-colors group">
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
            {/* Animated T-Pose Character */}
            <div className="relative w-64 h-64 mx-auto mb-12">
              <motion.div
                className="absolute inset-0 flex items-center justify-center text-9xl"
                animate={{ rotateY: rotationAngle }}
                transition={{ duration: 1, ease: "easeInOut" }}
                style={{ transformStyle: "preserve-3d" }}
              >
                🧍
              </motion.div>
              
              {/* Rotation Indicators */}
              <motion.div className="absolute -bottom-8 left-0 right-0 flex justify-center gap-2">
                {['0°', '90°', '180°', '270°'].map((angle, i) => (
                  <motion.div
                    key={i}
                    className={`w-3 h-3 rounded-full ${rotationAngle === i * 90 ? 'bg-indigo-500' : 'bg-gray-600'}`}
                    animate={{ scale: rotationAngle === i * 90 ? 1.5 : 1 }}
                  />
                ))}
              </motion.div>

              {/* Glowing Ring */}
              <motion.div
                className="absolute inset-0 border-4 border-indigo-500/30 rounded-full"
                animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.6, 0.3] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            </div>

            <motion.h1 
              className="text-7xl md:text-9xl font-black mb-6 leading-tight"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.8 }}
            >
              <span className="block bg-gradient-to-r from-indigo-400 via-violet-400 to-purple-400 bg-clip-text text-transparent">
                T-Pose
              </span>
              <span className="block text-gray-300 text-5xl md:text-7xl mt-2">
                Generator
              </span>
            </motion.h1>
            
            <motion.p 
              className="text-xl md:text-2xl text-gray-400 mb-12 max-w-3xl mx-auto leading-relaxed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              Transform any photo into a <span className="text-indigo-400 font-semibold">perfect 3D-ready T-pose</span> using 
              Google Gemini AI. Generate <span className="text-violet-400 font-semibold">4 rotation angles</span> for complete 
              360° character reference.
            </motion.p>
          </motion.div>

          {/* Feature Showcase - 4 Angles */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16">
            {[
              { angle: 'Front', degrees: '0°', icon: '👤', color: 'from-indigo-500 to-blue-600' },
              { angle: '3/4 View', degrees: '60°', icon: '🔄', color: 'from-violet-500 to-indigo-600' },
              { angle: 'Side', degrees: '90°', icon: '👥', color: 'from-purple-500 to-violet-600' },
              { angle: 'Back', degrees: '180°', icon: '🔙', color: 'from-fuchsia-500 to-purple-600' },
            ].map((view, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 + i * 0.1 }}
                whileHover={{ scale: 1.05, y: -5 }}
                className="relative group"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${view.color} opacity-20 rounded-2xl blur-xl group-hover:opacity-30 transition-opacity`} />
                <div className="relative bg-gray-900/80 backdrop-blur-xl border border-gray-800 rounded-2xl p-6 text-center">
                  <div className="text-5xl mb-3">{view.icon}</div>
                  <h3 className={`text-xl font-bold bg-gradient-to-r ${view.color} bg-clip-text text-transparent mb-1`}>
                    {view.angle}
                  </h3>
                  <p className="text-gray-500 text-sm font-mono">{view.degrees}</p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* How It Works */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-center mb-12 text-white">
              How It Works
            </h2>
            
            <div className="grid md:grid-cols-3 gap-8">
              {[
                { 
                  step: '1', 
                  title: 'Upload Photo', 
                  desc: 'Upload any photo of a person - full body shots work best for accurate results',
                  icon: '📸',
                  color: 'from-cyan-500 to-teal-600'
                },
                { 
                  step: '2', 
                  title: 'AI Processing', 
                  desc: 'Google Gemini AI analyzes and transforms the pose into perfect T-pose positions',
                  icon: '🤖',
                  color: 'from-indigo-500 to-violet-600'
                },
                { 
                  step: '3', 
                  title: 'Get 4 Angles', 
                  desc: 'Download all 4 rotation angles ready for 3D modeling, game dev, or character design',
                  icon: '🎨',
                  color: 'from-purple-500 to-fuchsia-600'
                },
              ].map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.15 }}
                  className="relative"
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${item.color} opacity-10 rounded-3xl blur-xl`} />
                  <div className="relative bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-3xl p-8 text-center">
                    <div className="text-6xl mb-4">{item.icon}</div>
                    <div className={`inline-block w-12 h-12 bg-gradient-to-br ${item.color} rounded-full flex items-center justify-center text-white font-bold text-xl mb-4`}>
                      {item.step}
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-3">{item.title}</h3>
                    <p className="text-gray-400 leading-relaxed">{item.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* CTA Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1 }}
            className="text-center mb-20"
          >
            <Link to="/t-poser">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="relative group px-16 py-8 overflow-hidden rounded-full"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600" />
                <motion.div 
                  className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity"
                  animate={{ backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] }}
                  transition={{ duration: 3, repeat: Infinity }}
                  style={{ backgroundSize: '200% 200%' }}
                />
                <span className="relative z-10 text-white font-black text-3xl flex items-center gap-4">
                  Generate T-Pose
                  <motion.span 
                    className="text-4xl"
                    animate={{ rotate: [0, 360] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  >
                    🔄
                  </motion.span>
                </span>
              </motion.button>
            </Link>
            <p className="text-gray-500 text-sm mt-6">Powered by Google Gemini AI • Free to Use • 4K Output</p>
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
            Perfect For
          </motion.h2>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: '🎮', title: 'Game Development', desc: 'Create character reference sheets for 3D modeling and game asset creation', color: 'from-emerald-500 to-teal-600' },
              { icon: '🎨', title: '3D Artists', desc: 'Generate consistent multi-angle references for character sculpting and modeling', color: 'from-cyan-500 to-sky-600' },
              { icon: '📐', title: 'Animation', desc: 'Perfect base poses for rigging, animation, and motion capture preparation', color: 'from-violet-500 to-purple-600' },
              { icon: '🖼️', title: 'Concept Art', desc: 'Quick character turnarounds for portfolio pieces and design presentations', color: 'from-rose-500 to-pink-600' },
              { icon: '🏃', title: 'VR/AR', desc: 'Generate avatar references for virtual and augmented reality applications', color: 'from-orange-500 to-amber-600' },
              { icon: '📚', title: 'Education', desc: 'Teaching tool for understanding human proportions and 3D character design', color: 'from-indigo-500 to-blue-600' },
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
                <div className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-10 rounded-2xl blur-xl group-hover:opacity-20 transition-opacity`} />
                <div className="relative bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-6">
                  <div className="text-5xl mb-4">{feature.icon}</div>
                  <h3 className="text-xl font-bold text-white mb-2">{feature.title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">{feature.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Advanced Features */}
        <section className="px-8 py-16 max-w-6xl mx-auto">
          <motion.h2 
            className="text-4xl md:text-5xl font-bold text-center mb-12 text-white"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            Advanced Features
          </motion.h2>

          <div className="grid md:grid-cols-2 gap-6">
            {[
              { icon: '🔄', title: 'Chain Mode', desc: 'Maintains character consistency across all 4 angles using conversation context', color: 'from-teal-500 to-cyan-600' },
              { icon: '⚡', title: 'Separate Mode', desc: 'Independent generation for each angle with detailed prompts', color: 'from-amber-500 to-orange-600' },
              { icon: '💾', title: 'Batch Download', desc: 'Download all angles at once or individually as high-quality images', color: 'from-indigo-500 to-violet-600' },
              { icon: '🎯', title: 'Precision Control', desc: 'Fine-tune each angle with custom prompts and regeneration options', color: 'from-rose-500 to-pink-600' },
            ].map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: i % 2 === 0 ? -30 : 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className={`relative bg-gradient-to-br ${feature.color} p-6 rounded-2xl shadow-2xl`}
              >
                <div className="text-5xl mb-4">{feature.icon}</div>
                <h3 className="text-2xl font-bold text-white mb-2">{feature.title}</h3>
                <p className="text-white/90 leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Final CTA */}
        <section className="px-8 py-16 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-4xl mx-auto"
          >
            <h2 className="text-5xl md:text-6xl font-black mb-6 bg-gradient-to-r from-indigo-400 via-violet-400 to-purple-400 bg-clip-text text-transparent">
              Ready to Create Perfect T-Poses?
            </h2>
            <p className="text-xl text-gray-400 mb-8">
              Join hundreds of game developers, 3D artists, and animators using our AI-powered T-pose generator!
            </p>
            <Link to="/t-poser">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="px-12 py-6 bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 text-white font-black text-2xl rounded-full shadow-2xl"
              >
                Start Generating Now →
              </motion.button>
            </Link>
          </motion.div>
        </section>
      </div>
    </div>
  );
};

export default TPoseLanding;

