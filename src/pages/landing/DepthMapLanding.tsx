import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';

const DepthMapLanding = () => {
  const [depth, setDepth] = useState(0);

  useEffect(() => {
    document.title = '3D Depth Map Generator - Free Online Tool | Anemoia';
    
    // Animate depth value for visual effect
    const interval = setInterval(() => {
      setDepth(prev => (prev + 1) % 100);
    }, 50);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-[#0F172A] relative overflow-hidden">
      {/* 3D Depth Background Effect */}
      <div className="absolute inset-0">
        {/* Depth Layers */}
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="absolute inset-0"
            style={{
              background: `radial-gradient(circle at 50% 50%, rgba(16, 185, 129, ${0.1 - i * 0.02}) 0%, transparent 70%)`,
              transform: `translateZ(${i * 20}px) scale(${1 + i * 0.1})`,
            }}
          />
        ))}
        
        {/* Animated Depth Grid */}
        <div 
          className="absolute inset-0"
          style={{
            backgroundImage: `linear-gradient(rgba(16, 185, 129, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(16, 185, 129, 0.1) 1px, transparent 1px)`,
            backgroundSize: '50px 50px',
            transform: `perspective(1000px) rotateX(60deg) translateZ(${depth}px)`,
            transformOrigin: 'center center',
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
            {/* 3D Icon */}
            <motion.div 
              className="w-32 h-32 mx-auto mb-8 relative"
              animate={{ 
                rotateY: 360,
                rotateX: [0, 10, 0, -10, 0],
              }}
              transition={{ 
                rotateY: { duration: 20, repeat: Infinity, ease: "linear" },
                rotateX: { duration: 4, repeat: Infinity, ease: "easeInOut" }
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-green-500 to-emerald-400 rounded-2xl opacity-20 blur-xl" />
              <div className="relative w-full h-full bg-gradient-to-br from-green-500 to-emerald-400 rounded-2xl flex items-center justify-center transform-gpu"
                   style={{ transformStyle: 'preserve-3d' }}>
                <span className="material-symbols-outlined text-white text-6xl">layers</span>
              </div>
            </motion.div>

            <h1 className="text-6xl md:text-8xl font-bold mb-6">
              <span className="bg-gradient-to-r from-green-400 via-emerald-400 to-teal-400 bg-clip-text text-transparent">
                Depth Mapping
              </span>
            </h1>
            <p className="text-2xl md:text-3xl text-gray-300 mb-8 max-w-3xl mx-auto">
              Extract 3D Information from 2D Images with AI
            </p>
            
            {/* Live Depth Indicator */}
            <div className="inline-flex items-center gap-4 mb-8 px-6 py-3 bg-gray-800/50 rounded-full backdrop-blur-sm">
              <span className="text-emerald-400">Depth Analysis</span>
              <div className="w-32 h-2 bg-gray-700 rounded-full overflow-hidden">
                <motion.div 
                  className="h-full bg-gradient-to-r from-green-400 to-emerald-400"
                  animate={{ width: `${depth}%` }}
                  transition={{ duration: 0.1 }}
                />
              </div>
              <span className="text-emerald-400 font-mono">{depth.toFixed(0)}%</span>
            </div>
            
            {/* CTA Button */}
            <div>
              <Link to="/depth-map">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-12 py-6 bg-gradient-to-r from-green-500 to-emerald-400 text-white font-bold text-xl rounded-full shadow-2xl hover:shadow-emerald-500/50 transition-all duration-300"
                >
                  Generate Depth Maps
                  <span className="material-symbols-outlined ml-2 align-middle">view_in_ar</span>
                </motion.button>
              </Link>
            </div>
          </motion.div>

          {/* 3D Features Showcase */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16"
          >
            {[
              {
                icon: 'view_in_ar',
                title: 'MiDaS Neural Network',
                description: 'State-of-the-art AI model for monocular depth estimation',
                color: 'from-green-500 to-emerald-400'
              },
              {
                icon: 'speed',
                title: 'Real-Time Processing',
                description: 'GPU-accelerated inference with WebGL compute shaders',
                color: 'from-emerald-500 to-teal-400'
              },
              {
                icon: 'download',
                title: 'Export Options',
                description: 'Save as depth map, 3D mesh, or point cloud data',
                color: 'from-teal-500 to-cyan-400'
              }
            ].map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20, rotateX: -20 }}
                animate={{ opacity: 1, y: 0, rotateX: 0 }}
                transition={{ delay: 0.4 + index * 0.1 }}
                className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl p-8 hover:border-emerald-500/50 transition-all duration-300"
                style={{ transformStyle: 'preserve-3d' }}
              >
                <div className={`w-16 h-16 bg-gradient-to-br ${feature.color} rounded-full flex items-center justify-center mb-4 transform translateZ-10`}>
                  <span className="material-symbols-outlined text-white text-3xl">{feature.icon}</span>
                </div>
                <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                <p className="text-gray-400">{feature.description}</p>
              </motion.div>
            ))}
          </motion.div>

          {/* Visual Demo Section */}
          <motion.section 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mb-16"
          >
            <h2 className="text-4xl font-bold text-center mb-12">See It In Action</h2>
            <div className="bg-gray-900/50 backdrop-blur-sm rounded-3xl p-8 border border-gray-800">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Before */}
                <div className="text-center">
                  <h3 className="text-xl font-semibold mb-4 text-gray-400">Original Image</h3>
                  <div className="aspect-video bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl flex items-center justify-center">
                    <span className="material-symbols-outlined text-6xl text-gray-600">image</span>
                  </div>
                </div>
                {/* After */}
                <div className="text-center">
                  <h3 className="text-xl font-semibold mb-4 text-emerald-400">Depth Map Output</h3>
                  <div className="aspect-video bg-gradient-to-br from-green-900/20 to-emerald-900/20 rounded-xl flex items-center justify-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-emerald-500/10 to-emerald-500/30" />
                    <span className="material-symbols-outlined text-6xl text-emerald-400">terrain</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.section>

          {/* Applications */}
          <motion.section 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="mb-16"
          >
            <h2 className="text-4xl font-bold text-center mb-12">Applications</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[
                { icon: 'view_in_ar', label: '3D Reconstruction' },
                { icon: 'videogame_asset', label: 'Game Development' },
                { icon: 'movie', label: 'VFX & Film' },
                { icon: 'architecture', label: 'Architecture' },
                { icon: 'camera', label: 'Photography' },
                { icon: 'view_comfy', label: 'Interior Design' },
                { icon: 'brush', label: 'Digital Art' },
                { icon: 'psychology', label: 'Computer Vision' }
              ].map((app, index) => (
                <motion.div
                  key={index}
                  whileHover={{ scale: 1.05, z: 20 }}
                  className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-6 text-center cursor-pointer"
                  style={{ transformStyle: 'preserve-3d' }}
                >
                  <span className="material-symbols-outlined text-4xl text-emerald-400 mb-2">{app.icon}</span>
                  <p className="text-sm">{app.label}</p>
                </motion.div>
              ))}
            </div>
          </motion.section>

          {/* Technical Details */}
          <motion.section 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="bg-gray-900/50 backdrop-blur-sm rounded-3xl p-12 border border-gray-800"
          >
            <h2 className="text-3xl font-bold mb-8 text-center">Technical Specifications</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div>
                <h3 className="text-xl font-semibold mb-4 text-emerald-400">Input Support</h3>
                <ul className="space-y-2 text-gray-300">
                  <li className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-green-400 text-sm">check_circle</span>
                    JPEG, PNG, WebP
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-green-400 text-sm">check_circle</span>
                    Up to 4K resolution
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-green-400 text-sm">check_circle</span>
                    Batch processing
                  </li>
                </ul>
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-4 text-emerald-400">AI Models</h3>
                <ul className="space-y-2 text-gray-300">
                  <li className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-green-400 text-sm">check_circle</span>
                    MiDaS v3.1
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-green-400 text-sm">check_circle</span>
                    DPT-Hybrid
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-green-400 text-sm">check_circle</span>
                    WebGL optimized
                  </li>
                </ul>
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-4 text-emerald-400">Export Formats</h3>
                <ul className="space-y-2 text-gray-300">
                  <li className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-green-400 text-sm">check_circle</span>
                    PNG depth map
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-green-400 text-sm">check_circle</span>
                    OBJ 3D mesh
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-green-400 text-sm">check_circle</span>
                    PLY point cloud
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
          className="bg-gradient-to-r from-green-900/50 to-emerald-900/50 backdrop-blur-sm py-16"
        >
          <div className="text-center">
            <h2 className="text-4xl font-bold mb-4">Ready to Add Depth?</h2>
            <p className="text-xl text-gray-300 mb-8">Transform flat images into 3D data. No signup required.</p>
            <Link to="/depth-map">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-8 py-4 bg-white text-gray-900 font-bold rounded-full hover:bg-gray-100 transition-colors"
              >
                Start Creating Depth Maps
              </motion.button>
            </Link>
          </div>
        </motion.section>
      </div>
    </div>
  );
};

export default DepthMapLanding; 