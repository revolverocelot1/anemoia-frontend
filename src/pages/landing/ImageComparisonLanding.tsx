import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';

const ImageComparisonLanding = () => {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Set document title
  useEffect(() => {
    document.title = 'Free Online Image Comparison Tool - Anemoia WebGL Tools';
  }, []);

  return (
    <div className="min-h-screen bg-[#0F172A] relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0">
        {/* Grid Pattern */}
        <div 
          className="absolute inset-0 opacity-20" 
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3Cpattern id='grid' width='60' height='60' patternUnits='userSpaceOnUse'%3E%3Cpath d='M 60 0 L 0 0 0 60' fill='none' stroke='rgba(59,130,246,0.1)' stroke-width='1'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width='100%25' height='100%25' fill='url(%23grid)' /%3E%3C/svg%3E")`
          }} 
        />
        
        {/* Gradient Orbs */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        
        {/* Mouse Follow Effect */}
        <div 
          className="absolute w-64 h-64 bg-cyan-400/10 rounded-full blur-3xl pointer-events-none transition-transform duration-1000 ease-out"
          style={{ 
            transform: `translate(${mousePosition.x - 128}px, ${mousePosition.y - 128}px)` 
          }}
        />
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
            {/* Icon */}
            <motion.div 
              className="w-32 h-32 mx-auto mb-8 relative"
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-full opacity-20 blur-xl" />
              <div className="relative w-full h-full bg-gradient-to-br from-blue-500 to-cyan-400 rounded-full flex items-center justify-center">
                <span className="material-symbols-outlined text-white text-6xl">compare_arrows</span>
              </div>
            </motion.div>

            <h1 className="text-6xl md:text-8xl font-bold mb-6">
              <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent">
                Image Comparison
              </span>
            </h1>
            <p className="text-2xl md:text-3xl text-gray-300 mb-8 max-w-3xl mx-auto">
              GPU-Accelerated Visual Analysis in Your Browser
            </p>
            
            {/* CTA Button */}
            <Link to="/compare">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-12 py-6 bg-gradient-to-r from-blue-500 to-cyan-400 text-white font-bold text-xl rounded-full shadow-2xl hover:shadow-cyan-500/50 transition-all duration-300"
              >
                Launch Tool
                <span className="material-symbols-outlined ml-2 align-middle">rocket_launch</span>
              </motion.button>
            </Link>
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
                icon: 'compare',
                title: 'Side-by-Side View',
                description: 'Drag the slider to reveal differences between images instantly'
              },
              {
                icon: 'difference',
                title: 'Difference Detection',
                description: 'Highlight pixel-level changes with advanced GPU shaders'
              },
              {
                icon: 'speed',
                title: 'Real-Time Processing',
                description: 'WebGL acceleration for instant results without uploads'
              }
            ].map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + index * 0.1 }}
                className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl p-8 hover:border-cyan-500/50 transition-all duration-300"
              >
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500/20 to-cyan-400/20 rounded-full flex items-center justify-center mb-4">
                  <span className="material-symbols-outlined text-cyan-400 text-3xl">{feature.icon}</span>
                </div>
                <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                <p className="text-gray-400">{feature.description}</p>
              </motion.div>
            ))}
          </motion.div>

          {/* Use Cases */}
          <motion.section 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mb-16"
          >
            <h2 className="text-4xl font-bold text-center mb-12">Perfect For</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[
                { icon: 'design_services', label: 'Design Reviews' },
                { icon: 'photo_camera', label: 'Photo Editing' },
                { icon: 'code', label: 'UI Testing' },
                { icon: 'science', label: 'Research' }
              ].map((useCase, index) => (
                <motion.div
                  key={index}
                  whileHover={{ scale: 1.05 }}
                  className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-6 text-center cursor-pointer"
                >
                  <span className="material-symbols-outlined text-4xl text-cyan-400 mb-2">{useCase.icon}</span>
                  <p className="text-sm">{useCase.label}</p>
                </motion.div>
              ))}
            </div>
          </motion.section>

          {/* Technical Specs */}
          <motion.section 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="bg-gray-900/50 backdrop-blur-sm rounded-3xl p-12 border border-gray-800"
          >
            <h2 className="text-3xl font-bold mb-8 text-center">Technical Specifications</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-xl font-semibold mb-4 text-cyan-400">Supported Formats</h3>
                <ul className="space-y-2 text-gray-300">
                  <li className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-green-400 text-sm">check_circle</span>
                    JPEG, PNG, WebP, GIF
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-green-400 text-sm">check_circle</span>
                    Up to 8K resolution
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-green-400 text-sm">check_circle</span>
                    No file size limits
                  </li>
                </ul>
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-4 text-cyan-400">Features</h3>
                <ul className="space-y-2 text-gray-300">
                  <li className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-green-400 text-sm">check_circle</span>
                    Adjustable comparison slider
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-green-400 text-sm">check_circle</span>
                    Multiple blend modes
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-green-400 text-sm">check_circle</span>
                    Export comparison results
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
          transition={{ delay: 1 }}
          className="bg-gradient-to-r from-blue-900/50 to-purple-900/50 backdrop-blur-sm py-16"
        >
          <div className="text-center">
            <h2 className="text-4xl font-bold mb-4">Ready to Compare?</h2>
            <p className="text-xl text-gray-300 mb-8">No signup required. 100% free. Process locally.</p>
            <Link to="/compare">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-8 py-4 bg-white text-gray-900 font-bold rounded-full hover:bg-gray-100 transition-colors"
              >
                Start Comparing Images
              </motion.button>
            </Link>
          </div>
        </motion.section>
      </div>
    </div>
  );
};

export default ImageComparisonLanding; 