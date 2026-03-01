import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';

const UpscalerLanding = () => {
  const [pixelSize, setPixelSize] = useState(8);
  
  useEffect(() => {
    document.title = 'AI Image Upscaler - Free 4x Enhancement | Anemoia';
    
    // Animate pixel size for visual effect
    const interval = setInterval(() => {
      setPixelSize(prev => prev === 1 ? 8 : prev - 1);
    }, 500);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-[#0F172A] relative overflow-hidden">
      {/* Pixelated to HD Background Effect */}
      <div className="absolute inset-0">
        {/* Pixel Grid Animation */}
        <div className="absolute inset-0">
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-4 h-4 bg-purple-500/20"
              initial={{ 
                x: Math.random() * window.innerWidth,
                y: Math.random() * window.innerHeight,
                scale: pixelSize
              }}
              animate={{ 
                scale: [pixelSize, 1, pixelSize],
                opacity: [0.2, 0.5, 0.2]
              }}
              transition={{ 
                duration: 4,
                repeat: Infinity,
                delay: i * 0.2
              }}
            />
          ))}
        </div>
        
        {/* Quality Gradient */}
        <div className="absolute inset-0 bg-gradient-to-r from-purple-900/20 via-transparent to-pink-900/20" />
      </div>

      {/* Content */}
      <div className="relative z-10">
        {/* Header */}
        <motion.header 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-8"
        >
          <Link to="/" className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
            <span className="material-symbols-outlined">arrow_back</span>
            Back to Tools
          </Link>
        </motion.header>

        {/* Hero Section */}
        <section className="px-8 py-16 max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            {/* Animated Icon */}
            <motion.div 
              className="w-32 h-32 mx-auto mb-8 relative"
            >
              <motion.div
                className="absolute inset-0 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg"
                animate={{ 
                  filter: [`blur(${pixelSize}px)`, 'blur(0px)', `blur(${pixelSize}px)`]
                }}
                transition={{ duration: 4, repeat: Infinity }}
              />
              <div className="relative w-full h-full bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                <span className="material-symbols-outlined text-white text-6xl">zoom_in</span>
              </div>
            </motion.div>

            <h1 className="text-6xl md:text-8xl font-bold mb-6">
              <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent">
                AI Upscaler
              </span>
            </h1>
            <p className="text-2xl md:text-3xl text-gray-300 mb-8 max-w-3xl mx-auto">
              Enhance Images 4x with Real-ESRGAN & Real-CUGAN
            </p>
            
            {/* Resolution Display */}
            <div className="inline-flex items-center gap-4 mb-8 px-6 py-3 bg-gray-800/50 rounded-full backdrop-blur-sm">
              <span className="text-gray-400">720p</span>
              <motion.div 
                className="flex gap-1"
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                {[...Array(3)].map((_, i) => (
                  <span key={i} className="material-symbols-outlined text-purple-400">arrow_forward</span>
                ))}
              </motion.div>
              <span className="text-purple-400 font-bold">4K</span>
            </div>
            
            {/* CTA Button */}
            <div>
              <Link to="/upscaler">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-12 py-6 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold text-xl rounded-full shadow-2xl hover:shadow-purple-500/50 transition-all duration-300"
                >
                  Upscale Images Now
                  <span className="material-symbols-outlined ml-2 align-middle">auto_awesome</span>
                </motion.button>
              </Link>
            </div>
          </motion.div>

          {/* Features Grid */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16"
          >
            {[
              {
                icon: 'auto_awesome',
                title: 'Multiple AI Models',
                description: 'Choose between Real-ESRGAN for photos and Real-CUGAN for anime/artwork',
                gradient: 'from-purple-500 to-pink-500'
              },
              {
                icon: 'speed',
                title: '5x-10x Faster',
                description: 'Real-CUGAN offers near-identical quality at blazing speeds',
                gradient: 'from-pink-500 to-red-500'
              },
              {
                icon: 'lock',
                title: 'Local Processing',
                description: 'All processing happens in your browser - images never leave your device',
                gradient: 'from-red-500 to-orange-500'
              }
            ].map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + index * 0.1 }}
                className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl p-8 hover:border-purple-500/50 transition-all duration-300"
              >
                <div className={`w-16 h-16 bg-gradient-to-br ${feature.gradient} rounded-full flex items-center justify-center mb-4`}>
                  <span className="material-symbols-outlined text-white text-3xl">{feature.icon}</span>
                </div>
                <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                <p className="text-gray-400">{feature.description}</p>
              </motion.div>
            ))}
          </motion.div>

          {/* Before/After Showcase */}
          <motion.section 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mb-16"
          >
            <h2 className="text-4xl font-bold text-center mb-12">Incredible Results</h2>
            <div className="bg-gray-900/50 backdrop-blur-sm rounded-3xl p-8 border border-gray-800">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Before */}
                <div className="text-center">
                  <h3 className="text-xl font-semibold mb-4 text-gray-400">Original</h3>
                  <div className="aspect-video bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl flex items-center justify-center relative overflow-hidden">
                    <div 
                      className="absolute inset-0" 
                      style={{
                        backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(255,255,255,0.03) 2px, rgba(255,255,255,0.03) 4px)',
                        filter: `blur(${pixelSize/2}px)`
                      }}
                    />
                    <span className="material-symbols-outlined text-6xl text-gray-600">image</span>
                  </div>
                </div>
                {/* After */}
                <div className="text-center">
                  <h3 className="text-xl font-semibold mb-4 text-purple-400">Enhanced 4x</h3>
                  <div className="aspect-video bg-gradient-to-br from-purple-900/20 to-pink-900/20 rounded-xl flex items-center justify-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-pink-500/10" />
                    <span className="material-symbols-outlined text-6xl text-purple-400">high_quality</span>
                  </div>
                </div>
              </div>
              
              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 mt-8">
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-400">4x</div>
                  <div className="text-sm text-gray-400">Resolution Increase</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-pink-400">16x</div>
                  <div className="text-sm text-gray-400">More Pixels</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-orange-400">100%</div>
                  <div className="text-sm text-gray-400">Quality Preserved</div>
                </div>
              </div>
            </div>
          </motion.section>

          {/* Use Cases */}
          <motion.section 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="mb-16"
          >
            <h2 className="text-4xl font-bold text-center mb-12">Perfect For</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[
                { icon: 'photo_camera', label: 'Old Photos' },
                { icon: 'wallpaper', label: 'Wallpapers' },
                { icon: 'brush', label: 'Artwork' },
                { icon: 'print', label: 'Printing' },
                { icon: 'tv', label: 'Display' },
                { icon: 'web', label: 'Web Graphics' },
                { icon: 'videogame_asset', label: 'Game Assets' },
                { icon: 'animation', label: 'Anime' }
              ].map((useCase, index) => (
                <motion.div
                  key={index}
                  whileHover={{ scale: 1.05 }}
                  className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-6 text-center cursor-pointer"
                >
                  <span className="material-symbols-outlined text-4xl text-purple-400 mb-2">{useCase.icon}</span>
                  <p className="text-sm">{useCase.label}</p>
                </motion.div>
              ))}
            </div>
          </motion.section>

          {/* Model Comparison */}
          <motion.section 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="bg-gray-900/50 backdrop-blur-sm rounded-3xl p-12 border border-gray-800"
          >
            <h2 className="text-3xl font-bold mb-8 text-center">Choose Your Model</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="border border-purple-500/50 rounded-2xl p-6">
                <h3 className="text-2xl font-semibold mb-4 text-purple-400">Real-ESRGAN</h3>
                <ul className="space-y-3 text-gray-300">
                  <li className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-green-400 text-sm">check_circle</span>
                    Best for photographs
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-green-400 text-sm">check_circle</span>
                    Natural texture enhancement
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-green-400 text-sm">check_circle</span>
                    Reduces noise & artifacts
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-yellow-400 text-sm">schedule</span>
                    Standard processing speed
                  </li>
                </ul>
              </div>
              <div className="border border-pink-500/50 rounded-2xl p-6">
                <h3 className="text-2xl font-semibold mb-4 text-pink-400">Real-CUGAN</h3>
                <ul className="space-y-3 text-gray-300">
                  <li className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-green-400 text-sm">check_circle</span>
                    Optimized for anime/artwork
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-green-400 text-sm">check_circle</span>
                    Preserves artistic style
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-green-400 text-sm">check_circle</span>
                    Sharp line preservation
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-green-400 text-sm">rocket_launch</span>
                    5-10x faster processing
                  </li>
                </ul>
              </div>
            </div>
          </motion.section>
        </section>

        {/* Footer CTA */}
        <motion.section 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="bg-gradient-to-r from-purple-900/50 to-pink-900/50 backdrop-blur-sm py-16"
        >
          <div className="text-center">
            <h2 className="text-4xl font-bold mb-4">Transform Your Images</h2>
            <p className="text-xl text-gray-300 mb-8">Free. Fast. Private. No watermarks.</p>
            <Link to="/upscaler">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-8 py-4 bg-white text-gray-900 font-bold rounded-full hover:bg-gray-100 transition-colors"
              >
                Start Upscaling
              </motion.button>
            </Link>
          </div>
        </motion.section>
      </div>
    </div>
  );
};

export default UpscalerLanding; 