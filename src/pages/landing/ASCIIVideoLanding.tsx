import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';

const ASCIIVideoLanding = () => {
  const [asciiFrame, setAsciiFrame] = useState(0);
  const [glitchActive, setGlitchActive] = useState(false);

  const asciiArt = [
    `  ▓▓▓▓▓\n ▓░░░░▓\n▓░▓▓▓░▓\n ▓░░░░▓\n  ▓▓▓▓▓`,
    `  ▒▒▒▒▒\n ▒░░░░▒\n▒░▒▒▒░▒\n ▒░░░░▒\n  ▒▒▒▒▒`,
    `  ░░░░░\n ░▓▓▓▓░\n░▓░░░▓░\n ░▓▓▓▓░\n  ░░░░░`,
  ];

  useEffect(() => {
    const frameInterval = setInterval(() => {
      setAsciiFrame((prev) => (prev + 1) % asciiArt.length);
    }, 500);

    const glitchInterval = setInterval(() => {
      setGlitchActive(true);
      setTimeout(() => setGlitchActive(false), 100);
    }, 3000);

    return () => {
      clearInterval(frameInterval);
      clearInterval(glitchInterval);
    };
  }, []);

  useEffect(() => {
    document.title = 'ASCII Video Converter - Transform Videos into Retro Art | Anemoia';
  }, []);

  return (
    <div className="min-h-screen bg-black relative overflow-hidden font-mono">
      {/* CRT Scanlines Effect */}
      <div className="absolute inset-0 pointer-events-none z-20 opacity-10">
        <div 
          className="absolute inset-0"
          style={{
            backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0, 255, 0, 0.3) 2px, rgba(0, 255, 0, 0.3) 4px)',
          }}
        />
      </div>

      {/* Matrix Rain Background */}
      <div className="absolute inset-0 overflow-hidden">
        {Array.from({ length: 30 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute text-green-500 opacity-20 text-xs"
            style={{
              left: `${(i * 100) / 30}%`,
              top: '-50%',
            }}
            animate={{
              y: ['0%', '150%'],
            }}
            transition={{
              duration: 5 + Math.random() * 5,
              repeat: Infinity,
              delay: Math.random() * 5,
              ease: 'linear',
            }}
          >
            {Array.from({ length: 50 }, () => 
              String.fromCharCode(Math.random() * (126 - 33) + 33)
            ).join('\n')}
          </motion.div>
        ))}
      </div>

      {/* Glitch Overlay */}
      {glitchActive && (
        <div className="absolute inset-0 z-30 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-r from-red-500/20 via-transparent to-cyan-500/20 mix-blend-screen" />
        </div>
      )}

      {/* Content */}
      <div className="relative z-10">
        {/* Header */}
        <motion.header 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-8"
        >
          <Link to="/" className="inline-flex items-center gap-2 text-green-500 hover:text-green-400 transition-colors group">
            <motion.span 
              className="text-2xl"
              whileHover={{ x: -5 }}
            >
              {'<'}
            </motion.span>
            <span className="font-bold text-lg">[BACK]</span>
          </Link>
        </motion.header>

        {/* Hero Section */}
        <section className="px-8 py-12 max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1 }}
            className="text-center mb-16"
          >
            {/* ASCII Art Display */}
            <div className="relative mb-12">
              <motion.div
                className="inline-block"
                animate={{
                  textShadow: [
                    '0 0 10px rgba(0, 255, 0, 0.5)',
                    '0 0 20px rgba(0, 255, 0, 0.8)',
                    '0 0 10px rgba(0, 255, 0, 0.5)',
                  ],
                }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <pre className="text-green-500 text-4xl md:text-6xl leading-tight whitespace-pre">
                  {asciiArt[asciiFrame]}
                </pre>
              </motion.div>

              {/* CRT Frame */}
              <div className="absolute inset-0 border-4 border-green-500/30 rounded-lg pointer-events-none" />
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className={glitchActive ? 'glitch' : ''}
            >
              <h1 className="text-5xl md:text-8xl font-black mb-6 leading-tight">
                <span className="block text-green-500 drop-shadow-[0_0_20px_rgba(0,255,0,0.5)]">
                  {'>'} ASCII VIDEO
                </span>
                <span className="block text-green-400 text-4xl md:text-6xl mt-4">
                  {'>'} CONVERTER_
                </span>
              </h1>
              
              <motion.p 
                className="text-xl md:text-2xl text-green-400 mb-12 max-w-3xl mx-auto leading-relaxed"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                {'>'} TRANSFORM_VIDEOS_INTO_<span className="text-green-500 font-bold">RETRO_ASCII_ART</span>
                <br />
                {'>'} BROWSER_BASED_PROCESSING_NO_UPLOADS_REQUIRED
                <br />
                {'>'} CUSTOMIZABLE_CHARACTERS_AND_EFFECTS
              </motion.p>
            </motion.div>

            {/* Terminal Window */}
            <motion.div 
              className="max-w-2xl mx-auto bg-black/80 border-4 border-green-500 rounded-lg p-6 mb-12 shadow-[0_0_50px_rgba(0,255,0,0.3)]"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.7 }}
            >
              <div className="flex gap-2 mb-4">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <div className="w-3 h-3 rounded-full bg-green-500" />
              </div>
              <div className="text-left space-y-2 text-sm md:text-base">
                <motion.div 
                  className="text-green-400"
                  initial={{ width: 0 }}
                  animate={{ width: '100%' }}
                  transition={{ delay: 1, duration: 1 }}
                >
                  {'>'} LOADING_ASCII_CONVERTER...
                </motion.div>
                <motion.div 
                  className="text-green-500"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.5 }}
                >
                  {'>'} [OK] FFMPEG_INITIALIZED
                </motion.div>
                <motion.div 
                  className="text-green-500"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 2 }}
                >
                  {'>'} [OK] WEBASSEMBLY_READY
                </motion.div>
                <motion.div 
                  className="text-green-400"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 2.5 }}
                >
                  {'>'} SYSTEM_READY_TO_CONVERT █
                </motion.div>
              </div>
            </motion.div>

            {/* CTA Button */}
            <Link to="/ascii-video-converter">
              <motion.button
                whileHover={{ 
                  scale: 1.05,
                  boxShadow: '0 0 40px rgba(0, 255, 0, 0.6)',
                }}
                whileTap={{ scale: 0.95 }}
                className="relative px-12 py-6 border-4 border-green-500 bg-black text-green-500 font-black text-2xl hover:bg-green-500 hover:text-black transition-all duration-300"
              >
                <motion.span
                  animate={{ opacity: [1, 0.5, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                >
                  {'>'} [START_CONVERTING] █
                </motion.span>
              </motion.button>
            </Link>
            
            <motion.p 
              className="text-green-600 text-sm mt-6"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              {'>'} NO_INSTALLATION_REQUIRED • BROWSER_BASED • OFFLINE_CAPABLE
            </motion.p>
          </motion.div>
        </section>

        {/* Features Grid */}
        <section className="px-8 py-16 max-w-7xl mx-auto">
          <motion.h2 
            className="text-4xl md:text-5xl font-black text-center mb-16 text-green-500"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            {'>'} FEATURES_
          </motion.h2>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: '▓', title: 'CUSTOM_ASCII', desc: 'Choose from multiple ASCII character sets or create your own for unique visual styles' },
              { icon: '▒', title: 'REAL_TIME_PREVIEW', desc: 'Watch your video transform to ASCII art in real-time with live preview' },
              { icon: '░', title: 'COLOR_MODES', desc: 'Black & white, colored ASCII, or inverted modes for different aesthetics' },
              { icon: '█', title: 'RESOLUTION_CONTROL', desc: 'Adjust output resolution and character density for perfect results' },
              { icon: '▄', title: 'EXPORT_OPTIONS', desc: 'Download as video file or animated GIF to share your retro creations' },
              { icon: '▀', title: 'NO_UPLOAD', desc: 'All processing happens locally in your browser - your files never leave your device' },
            ].map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                whileHover={{ 
                  scale: 1.05,
                  boxShadow: '0 0 30px rgba(0, 255, 0, 0.3)',
                }}
                className="relative border-2 border-green-500/50 bg-black/50 p-6 hover:border-green-500 transition-all"
              >
                <div className="text-6xl text-green-500 mb-4 font-bold">{feature.icon}</div>
                <h3 className="text-xl font-black text-green-400 mb-2 tracking-wider">
                  {'>'} {feature.title}
                </h3>
                <p className="text-green-600 text-sm leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Character Sets Showcase */}
        <section className="px-8 py-16 max-w-5xl mx-auto">
          <motion.h2 
            className="text-4xl md:text-5xl font-black text-center mb-12 text-green-500"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            {'>'} CHARACTER_SETS
          </motion.h2>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              { name: 'STANDARD', chars: '█▓▒░ ', desc: 'Classic block characters' },
              { name: 'DETAILED', chars: '@%#*+=-:. ', desc: 'Rich detail levels' },
              { name: 'MINIMAL', chars: '■□▪▫ ', desc: 'Simple geometric shapes' },
            ].map((set, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="border-4 border-green-500 bg-black p-6 text-center"
              >
                <h3 className="text-xl font-black text-green-400 mb-3">
                  {'>'} {set.name}
                </h3>
                <div className="text-3xl text-green-500 mb-3 tracking-widest font-bold">
                  {set.chars}
                </div>
                <p className="text-green-600 text-sm">{set.desc}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Use Cases */}
        <section className="px-8 py-16 max-w-6xl mx-auto">
          <motion.h2 
            className="text-4xl md:text-5xl font-black text-center mb-12 text-green-500"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            {'>'} USE_CASES
          </motion.h2>

          <div className="space-y-4">
            {[
              { icon: '🎵', title: 'MUSIC_VIDEOS', desc: 'Create retro-style music videos with ASCII aesthetics for unique visual appeal' },
              { icon: '🎮', title: 'GAME_CONTENT', desc: 'Generate nostalgic game trailers or intro sequences with terminal-style graphics' },
              { icon: '🎨', title: 'ART_PROJECTS', desc: 'Transform videos into ASCII art for installations, exhibitions, or digital art pieces' },
              { icon: '📱', title: 'SOCIAL_MEDIA', desc: 'Stand out with unique ASCII video content that grabs attention in feeds' },
              { icon: '📺', title: 'RETRO_CONTENT', desc: 'Create authentic vintage computer aesthetics for vaporwave or retrowave projects' },
              { icon: '🎬', title: 'FILM_EFFECTS', desc: 'Add terminal/hacker-style effects to video projects and films' },
            ].map((useCase, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                whileHover={{ x: 10 }}
                className="border-2 border-green-500/50 bg-black/50 p-6 hover:border-green-500 transition-all"
              >
                <div className="flex items-center gap-4">
                  <span className="text-4xl">{useCase.icon}</span>
                  <div>
                    <h3 className="text-xl font-bold text-green-400">
                      {'>'} {useCase.title}
                    </h3>
                    <p className="text-green-600">{useCase.desc}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Tech Stack */}
        <section className="px-8 py-16 max-w-4xl mx-auto">
          <motion.div
            className="border-4 border-green-500 bg-black/80 p-8"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl font-black text-green-500 mb-6 text-center">
              {'>'} POWERED_BY
            </h2>
            <div className="grid md:grid-cols-2 gap-4 text-green-400">
              <div>
                <p className="mb-2">{'>'} [✓] FFMPEG.WASM</p>
                <p className="mb-2">{'>'} [✓] WEBASSEMBLY</p>
                <p className="mb-2">{'>'} [✓] CANVAS_API</p>
              </div>
              <div>
                <p className="mb-2">{'>'} [✓] WEB_WORKERS</p>
                <p className="mb-2">{'>'} [✓] HTML5_VIDEO</p>
                <p className="mb-2">{'>'} [✓] ZERO_BACKEND</p>
              </div>
            </div>
          </motion.div>
        </section>

        {/* Final CTA */}
        <section className="px-8 py-16 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-4xl mx-auto"
          >
            <h2 className="text-5xl md:text-7xl font-black mb-6 text-green-500">
              {'>'} READY_TO_CONVERT?_
            </h2>
            <p className="text-xl text-green-400 mb-8">
              {'>'} TRANSFORM_YOUR_VIDEOS_INTO_RETRO_ASCII_MASTERPIECES
            </p>
            <Link to="/ascii-video-converter">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                animate={{
                  boxShadow: [
                    '0 0 20px rgba(0, 255, 0, 0.3)',
                    '0 0 40px rgba(0, 255, 0, 0.6)',
                    '0 0 20px rgba(0, 255, 0, 0.3)',
                  ],
                }}
                transition={{ duration: 2, repeat: Infinity }}
                className="px-16 py-8 border-4 border-green-500 bg-black text-green-500 font-black text-3xl hover:bg-green-500 hover:text-black transition-all"
              >
                {'>'} [LAUNCH_CONVERTER] █
              </motion.button>
            </Link>
          </motion.div>
        </section>
      </div>

      {/* Custom Glitch Animation */}
      <style>{`
        @keyframes glitch {
          0% { transform: translate(0); }
          20% { transform: translate(-2px, 2px); }
          40% { transform: translate(-2px, -2px); }
          60% { transform: translate(2px, 2px); }
          80% { transform: translate(2px, -2px); }
          100% { transform: translate(0); }
        }
        .glitch {
          animation: glitch 0.3s infinite;
        }
      `}</style>
    </div>
  );
};

export default ASCIIVideoLanding;

