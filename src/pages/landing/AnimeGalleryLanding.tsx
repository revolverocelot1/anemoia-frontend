import { motion, useScroll, useTransform } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';

const AnimeGalleryLanding = () => {
  const [sparkles, setSparkles] = useState<Array<{ id: number; x: number; y: number; delay: number }>>([]);
  const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"]
  });

  const backgroundY = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);
  const headerOpacity = useTransform(scrollYProgress, [0, 0.3], [1, 0]);

  // Generate random sparkles
  useEffect(() => {
    const generateSparkles = () => {
      const newSparkles = Array.from({ length: 50 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        delay: Math.random() * 3,
      }));
      setSparkles(newSparkles);
    };
    generateSparkles();
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setCursorPosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  useEffect(() => {
    document.title = 'AGHPB - Anime Girls Holding Programming Books | Kawaii Terminal Gallery';
  }, []);

  // Kawaii programming language icons
  const languages = [
    { name: 'Python', emoji: '🐍', color: 'from-yellow-400 to-amber-500' },
    { name: 'JavaScript', emoji: '✨', color: 'from-yellow-300 to-orange-400' },
    { name: 'Rust', emoji: '🦀', color: 'from-orange-500 to-red-600' },
    { name: 'Go', emoji: '🔵', color: 'from-cyan-400 to-teal-500' },
    { name: 'Ruby', emoji: '💎', color: 'from-red-400 to-rose-600' },
    { name: 'C++', emoji: '⚡', color: 'from-indigo-400 to-purple-600' },
  ];

  return (
    <div ref={containerRef} className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-cyan-50 relative overflow-hidden">
      {/* Kawaii Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Floating Sparkles */}
        {sparkles.map((sparkle) => (
          <motion.div
            key={sparkle.id}
            className="absolute w-2 h-2"
            style={{
              left: `${sparkle.x}%`,
              top: `${sparkle.y}%`,
            }}
            animate={{
              scale: [0, 1, 0],
              opacity: [0, 1, 0],
              rotate: [0, 180, 360],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              delay: sparkle.delay,
              ease: "easeInOut",
            }}
          >
            <div className="w-full h-full bg-gradient-to-br from-pink-400 to-purple-400 rounded-full" 
                 style={{ boxShadow: '0 0 10px rgba(236, 72, 153, 0.5)' }} />
          </motion.div>
        ))}

        {/* Cute Cloud Shapes */}
        <motion.div 
          className="absolute top-20 left-10 w-32 h-20 bg-white/60 rounded-full blur-sm"
          animate={{ x: [0, 30, 0], y: [0, -20, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div 
          className="absolute top-40 right-20 w-40 h-24 bg-white/60 rounded-full blur-sm"
          animate={{ x: [0, -40, 0], y: [0, 20, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div 
          className="absolute bottom-40 left-1/4 w-36 h-22 bg-white/60 rounded-full blur-sm"
          animate={{ x: [0, 50, 0], y: [0, -30, 0] }}
          transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Gradient Orbs */}
        <motion.div 
          className="absolute top-1/4 right-1/4 w-64 h-64 rounded-full opacity-20"
          style={{
            background: 'radial-gradient(circle, rgba(236, 72, 153, 0.4) 0%, transparent 70%)',
            y: backgroundY,
          }}
        />
        <motion.div 
          className="absolute bottom-1/4 left-1/4 w-64 h-64 rounded-full opacity-20"
          style={{
            background: 'radial-gradient(circle, rgba(167, 139, 250, 0.4) 0%, transparent 70%)',
            y: useTransform(scrollYProgress, [0, 1], ["0%", "-30%"]),
          }}
        />

        {/* Cursor Trail Hearts */}
        <motion.div
          className="absolute w-8 h-8 pointer-events-none"
          style={{
            left: cursorPosition.x - 16,
            top: cursorPosition.y - 16,
          }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
          <motion.div
            animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1, repeat: Infinity }}
            className="text-3xl"
          >
            💖
          </motion.div>
        </motion.div>
      </div>

      {/* Content */}
      <motion.div className="relative z-10" style={{ opacity: headerOpacity }}>
        {/* Header */}
        <motion.header 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-8"
        >
          <Link to="/" className="inline-flex items-center gap-2 text-purple-600 hover:text-pink-500 transition-colors group">
            <motion.span 
              className="material-symbols-outlined text-2xl"
              whileHover={{ x: -5 }}
            >
              arrow_back
            </motion.span>
            <span className="font-bold text-lg">Back to Tools</span>
          </Link>
        </motion.header>

        {/* Hero Section */}
        <section className="px-8 py-12 max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            {/* Kawaii Terminal Icon */}
            <motion.div 
              className="relative w-48 h-48 mx-auto mb-8"
              animate={{ 
                rotate: [0, -5, 5, -5, 0],
              }}
              transition={{ 
                duration: 2, 
                repeat: Infinity, 
                ease: "easeInOut" 
              }}
            >
              {/* Main monitor */}
              <div className="absolute inset-0 bg-gradient-to-br from-pink-400 via-purple-400 to-cyan-400 rounded-3xl p-2 shadow-2xl">
                <div className="w-full h-full bg-gray-900 rounded-2xl p-4 flex flex-col">
                  {/* Window buttons */}
                  <div className="flex gap-2 mb-2">
                    <div className="w-3 h-3 rounded-full bg-red-400" />
                    <div className="w-3 h-3 rounded-full bg-yellow-400" />
                    <div className="w-3 h-3 rounded-full bg-green-400" />
                  </div>
                  {/* Anime character silhouette */}
                  <div className="flex-1 flex items-center justify-center text-6xl">
                    👧💻📚
                  </div>
                </div>
              </div>
              
              {/* Floating sparkles around icon */}
              {[0, 1, 2, 3].map((i) => (
                <motion.div
                  key={i}
                  className="absolute w-4 h-4"
                  style={{
                    top: `${20 + Math.sin(i * Math.PI / 2) * 60}%`,
                    left: `${50 + Math.cos(i * Math.PI / 2) * 60}%`,
                  }}
                  animate={{
                    scale: [1, 1.5, 1],
                    rotate: [0, 360],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    delay: i * 0.3,
                  }}
                >
                  ✨
                </motion.div>
              ))}
            </motion.div>

            <motion.h1 
              className="text-6xl md:text-8xl font-black mb-6 leading-tight"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.8 }}
            >
              <span className="block bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 bg-clip-text text-transparent drop-shadow-lg">
                AGHPB
              </span>
              <span className="block text-3xl md:text-5xl mt-4 font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                Anime Girls Holding<br/>Programming Books 📚✨
              </span>
            </motion.h1>
            
            <motion.p 
              className="text-xl md:text-2xl text-gray-700 mb-12 max-w-3xl mx-auto leading-relaxed font-medium"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              A <span className="text-pink-600 font-bold">kawaii terminal interface</span> to explore 
              the legendary GitHub repository of anime girls holding programming books! 
              <span className="text-purple-600 font-bold"> 💖 Cyberpunk meets cuteness!</span>
            </motion.p>

            {/* Language Icons Row */}
            <motion.div 
              className="flex justify-center gap-4 mb-12 flex-wrap"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              {languages.map((lang, i) => (
                <motion.div
                  key={i}
                  whileHover={{ scale: 1.2, rotate: 360 }}
                  className={`px-6 py-3 bg-gradient-to-r ${lang.color} rounded-full shadow-lg flex items-center gap-2 text-white font-bold cursor-pointer`}
                >
                  <span className="text-2xl">{lang.emoji}</span>
                  <span>{lang.name}</span>
                </motion.div>
              ))}
            </motion.div>

            {/* CTA Button */}
            <Link to="/anime-gallery">
              <motion.button
                whileHover={{ scale: 1.05, boxShadow: "0 20px 60px rgba(236, 72, 153, 0.4)" }}
                whileTap={{ scale: 0.95 }}
                className="relative group px-12 py-6 overflow-hidden rounded-full"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 animate-gradient-x" />
                <motion.div 
                  className="absolute inset-0 bg-gradient-to-r from-pink-400 via-purple-400 to-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  animate={{ rotate: [0, 360] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                  style={{ backgroundSize: '200% 200%' }}
                />
                <span className="relative z-10 text-white font-black text-2xl flex items-center gap-3 drop-shadow-lg">
                  <span className="text-3xl">⌘</span>
                  Open Terminal
                  <span className="text-3xl">✨</span>
                </span>
              </motion.button>
            </Link>
            
            <motion.p 
              className="text-gray-600 text-sm mt-6 font-medium"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              💫 No sign-up • 100% Kawaii • Cyberpunk Terminal Vibes 💫
            </motion.p>
          </motion.div>
        </section>

        {/* Features Section - Kawaii Cards */}
        <section className="px-8 py-16 max-w-7xl mx-auto">
          <motion.h2 
            className="text-5xl md:text-6xl font-black text-center mb-16 bg-gradient-to-r from-pink-600 via-purple-600 to-cyan-600 bg-clip-text text-transparent"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            ✨ Kawaii Features ✨
          </motion.h2>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { 
                emoji: '⌘', 
                title: 'Terminal UI', 
                desc: 'Experience a cyberpunk-inspired terminal interface with real command-line controls and keyboard shortcuts!',
                gradient: 'from-cyan-400 to-teal-500',
                bg: 'from-cyan-50 to-teal-50'
              },
              { 
                emoji: '🎨', 
                title: '3 View Modes', 
                desc: 'Switch between Grid, List, and Terminal views with smooth animations and transitions. Press 1, 2, or 3!',
                gradient: 'from-pink-400 to-rose-500',
                bg: 'from-pink-50 to-rose-50'
              },
              { 
                emoji: '📚', 
                title: '1000+ Images', 
                desc: 'Browse thousands of curated anime girl illustrations holding programming books across 20+ languages!',
                gradient: 'from-purple-400 to-violet-500',
                bg: 'from-purple-50 to-violet-50'
              },
              { 
                emoji: '🔍', 
                title: 'Smart Search', 
                desc: 'Find your favorite programming language or search by category with instant results and fuzzy matching!',
                gradient: 'from-orange-400 to-amber-500',
                bg: 'from-orange-50 to-amber-50'
              },
              { 
                emoji: '⌨️', 
                title: 'Keyboard Shortcuts', 
                desc: 'Navigate like a pro with vim-style shortcuts. Press "?" to see all available commands!',
                gradient: 'from-indigo-400 to-purple-500',
                bg: 'from-indigo-50 to-purple-50'
              },
              { 
                emoji: '🔊', 
                title: 'Sound Effects', 
                desc: 'Immersive terminal sounds for clicks, commands, and interactions. Toggle with "S" key!',
                gradient: 'from-green-400 to-emerald-500',
                bg: 'from-green-50 to-emerald-50'
              },
            ].map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                whileHover={{ y: -10, scale: 1.02 }}
                className="relative group cursor-pointer"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${feature.bg} rounded-3xl blur-xl group-hover:blur-2xl transition-all duration-300`} />
                <div className={`relative bg-gradient-to-br ${feature.bg} rounded-3xl p-8 shadow-xl border-4 border-white overflow-hidden`}>
                  {/* Decorative corner elements */}
                  <div className="absolute top-2 right-2 text-4xl opacity-20">✨</div>
                  <div className="absolute bottom-2 left-2 text-4xl opacity-20">💖</div>
                  
                  <motion.div 
                    className={`w-20 h-20 bg-gradient-to-br ${feature.gradient} rounded-2xl flex items-center justify-center mb-6 shadow-lg`}
                    whileHover={{ rotate: 360 }}
                    transition={{ duration: 0.6 }}
                  >
                    <span className="text-5xl">{feature.emoji}</span>
                  </motion.div>
                  <h3 className={`text-2xl font-black mb-3 bg-gradient-to-r ${feature.gradient} bg-clip-text text-transparent`}>
                    {feature.title}
                  </h3>
                  <p className="text-gray-700 leading-relaxed font-medium">{feature.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Command Examples Section */}
        <section className="px-8 py-16 max-w-5xl mx-auto">
          <motion.h2 
            className="text-4xl md:text-5xl font-black text-center mb-12 bg-gradient-to-r from-cyan-600 via-purple-600 to-pink-600 bg-clip-text text-transparent"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            🖥️ Terminal Commands
          </motion.h2>

          <motion.div 
            className="bg-gray-900 rounded-3xl p-8 shadow-2xl border-4 border-cyan-500/30 font-mono"
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
          >
            <div className="flex gap-2 mb-6">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <div className="w-3 h-3 rounded-full bg-green-500" />
            </div>
            <div className="space-y-3 text-sm md:text-base">
              {[
                { cmd: 'ls', desc: 'List all categories', color: 'text-green-400' },
                { cmd: 'cd Python', desc: 'Navigate to Python category', color: 'text-cyan-400' },
                { cmd: 'search rust', desc: 'Search for Rust images', color: 'text-yellow-400' },
                { cmd: 'view grid', desc: 'Switch to grid view', color: 'text-pink-400' },
                { cmd: 'stats', desc: 'Show database statistics', color: 'text-purple-400' },
                { cmd: 'help', desc: 'Show all available commands', color: 'text-orange-400' },
              ].map((cmd, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="flex items-center gap-4"
                >
                  <span className="text-cyan-400">{'>'}</span>
                  <span className={`${cmd.color} font-bold w-32`}>{cmd.cmd}</span>
                  <span className="text-gray-500">//</span>
                  <span className="text-gray-400">{cmd.desc}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </section>

        {/* Fun Facts Section */}
        <section className="px-8 py-16 max-w-6xl mx-auto">
          <motion.h2 
            className="text-4xl md:text-5xl font-black text-center mb-12 bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            💖 Fun Facts 💖
          </motion.h2>

          <div className="grid md:grid-cols-2 gap-6">
            {[
              { icon: '⭐', text: 'Based on the viral GitHub repo with 10,000+ stars!', color: 'from-yellow-400 to-orange-500' },
              { icon: '🌍', text: '20+ programming languages represented in beautiful anime art', color: 'from-green-400 to-teal-500' },
              { icon: '🎨', text: 'Hundreds of talented artists contributing cute illustrations', color: 'from-pink-400 to-rose-500' },
              { icon: '⚡', text: 'Live fetching from GitHub API for always fresh content', color: 'from-purple-400 to-indigo-500' },
            ].map((fact, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                whileHover={{ scale: 1.05 }}
                className={`relative bg-gradient-to-br ${fact.color} rounded-2xl p-6 text-white shadow-xl`}
              >
                <div className="flex items-center gap-4">
                  <span className="text-5xl">{fact.icon}</span>
                  <p className="text-lg font-bold leading-relaxed">{fact.text}</p>
                </div>
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
            className="max-w-3xl mx-auto"
          >
            <h2 className="text-4xl md:text-6xl font-black mb-6 bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 bg-clip-text text-transparent">
              Ready for Kawaii Programming? 💻✨
            </h2>
            <p className="text-xl text-gray-700 mb-8 font-medium">
              Join thousands of developers enjoying the cutest programming resource on the internet!
            </p>
            <Link to="/anime-gallery">
              <motion.button
                whileHover={{ scale: 1.1, rotate: [0, -5, 5, -5, 0] }}
                whileTap={{ scale: 0.9 }}
                className="px-16 py-8 bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 text-white font-black text-3xl rounded-full shadow-2xl"
              >
                <span className="flex items-center gap-4">
                  <span>💖</span>
                  Start Browsing
                  <span>✨</span>
                </span>
              </motion.button>
            </Link>
          </motion.div>
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

export default AnimeGalleryLanding;

