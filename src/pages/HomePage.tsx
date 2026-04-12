import Header from '../components/Header';
import Footer from '../components/Footer';
import ToolCard from '../components/ToolCard';
import Sidebar from '../components/Sidebar';
import { motion, type Variants, type Transition } from 'framer-motion';
import { useState, useEffect } from 'react';
import { BsTools } from 'react-icons/bs';
import { Link } from 'react-router-dom';

const containerVariants: Variants = {
  hidden: { opacity: 1 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.2,
    },
  },
};

const itemTransition: Transition = {
  type: 'spring',
  stiffness: 120,
  damping: 12
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: itemTransition
  },
};

interface HomePageProps {
  onToggleSidebar?: () => void;
}

const HomePage: React.FC<HomePageProps> = ({ onToggleSidebar }) => {
  // Debug logging
  useEffect(() => {
    console.log('HomePage mounted');
    
    // Check if elements are visible
    const checkVisibility = () => {
      const toolCards = document.querySelectorAll('.card');
      console.log('Found tool cards:', toolCards.length);
      
      toolCards.forEach((card, index) => {
        const rect = card.getBoundingClientRect();
        const styles = window.getComputedStyle(card);
        console.log(`Card ${index}:`, {
          visible: rect.width > 0 && rect.height > 0,
          position: { top: rect.top, left: rect.left },
          zIndex: styles.zIndex,
          opacity: styles.opacity,
          display: styles.display
        });
      });

      // Check main container
      const mainContainer = document.querySelector('.relative.flex.size-full.min-h-screen.flex-col');
      if (mainContainer) {
        const mainStyles = window.getComputedStyle(mainContainer as Element);
        console.log('Main container styles:', {
          backgroundColor: mainStyles.backgroundColor,
          zIndex: mainStyles.zIndex,
          position: mainStyles.position
        });
      }

      // Check 3D canvas
      const canvas = document.querySelector('canvas');
      if (canvas) {
        const canvasContainer = canvas.closest('div');
        const canvasStyles = window.getComputedStyle(canvasContainer as Element);
        console.log('Canvas container styles:', {
          zIndex: canvasStyles.zIndex,
          position: canvasStyles.position
        });
      }

      // Check Material Symbols font
      const testIcon = document.querySelector('.material-symbols-outlined');
      if (testIcon) {
        const iconStyles = window.getComputedStyle(testIcon);
        console.log('Material Symbols font:', {
          fontFamily: iconStyles.fontFamily,
          fontSize: iconStyles.fontSize,
          fontWeight: iconStyles.fontWeight,
          display: iconStyles.display
        });
      }

      // Check icon containers
      const iconContainers = document.querySelectorAll('.icon-container');
      iconContainers.forEach((container, index) => {
        const rect = container.getBoundingClientRect();
        console.log(`Icon container ${index}:`, {
          width: rect.width,
          height: rect.height,
          display: window.getComputedStyle(container).display
        });
      });
    };

    // Run check after a short delay to ensure DOM is ready
    setTimeout(checkVisibility, 100);

    // Check if Material Symbols font is loaded
    document.fonts.ready.then(() => {
      console.log('Fonts loaded');
      const materialSymbolsLoaded = document.fonts.check('1em Material Symbols Outlined');
      console.log('Material Symbols Outlined loaded:', materialSymbolsLoaded);
    });
  }, []);

  return (
    <div className="relative flex size-full min-h-screen flex-col dark group/design-root overflow-x-hidden" style={{ position: 'relative', zIndex: 10 }}>
      
      <div className="layout-container flex h-full grow flex-col" style={{ position: 'relative', zIndex: 20 }}>
        <Header />
        <main className="px-6 md:px-10 lg:px-20 xl:px-40 flex flex-1 justify-center py-8 overflow-y-auto" style={{ position: 'relative', zIndex: 30 }}>
          <div className="layout-content-container flex flex-col items-center max-w-7xl flex-1 w-full">
            <div className="max-w-7xl mx-auto px-4 py-20">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="text-center mb-16"
              >
                <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 bg-clip-text text-transparent">
                  Anemoia WebGL Studio
                </h1>
                <p className="text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto">
                  Advanced GPU-accelerated AI tools powered by WebGL and WebGPU. 
                  Experience real-time neural processing directly in your browser.
                </p>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="mt-4 text-sm text-cyan-400"
                >
                  <span className="inline-flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                    GPU Acceleration Active
                  </span>
                  <span className="mx-2">•</span>
                  <span className="text-gray-400">
                    Press <kbd className="px-2 py-1 bg-gray-700 rounded text-xs">Ctrl+B</kbd> to toggle 3D background
                  </span>
                </motion.div>
              </motion.div>

              {/* Main Tools Grid */}
              <motion.div
                className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 lg:gap-8 w-full max-w-6xl"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
              >
                <ToolCard
                  variants={itemVariants}
                  title="3D Depth Mapping"
                  description="Real-time depth estimation using WebGL shaders and neural networks. Extract 3D information from 2D images with GPU-accelerated MiDaS models."
                  icon="layers"
                  accent="1"
                  path="/depth-map"
                />
                <ToolCard
                  variants={itemVariants}
                  title="Pose Estimation"
                  description="WebGL-powered human pose detection using MoveNet Thunder. Track 17 keypoints in real-time with hardware-accelerated tensor operations."
                  icon="accessibility_new"
                  accent="2"
                  path="/pose-estimation"
                />
                {/* AI Upscaling Card - Custom Emblem */}
                <motion.div variants={itemVariants}>
                  <Link to="/upscaler" className="card h-full block group relative overflow-hidden" data-accent="3">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/0 via-cyan-500/0 to-emerald-500/0 group-hover:from-blue-500/10 group-hover:via-cyan-500/10 group-hover:to-emerald-500/10 transition-colors duration-500"></div>
                    <div className="p-6 flex flex-col items-start text-left flex-1 h-full relative z-10">
                      <div className="icon-container mb-4 w-full h-32 bg-black/20 rounded-xl overflow-hidden border border-white/5 relative" style={{ perspective: '1000px' }}>
                        {/* 3D Upscaler Animation */}
                        <div className="absolute inset-0">
                          <img src="/emblems/ai_upscaling_emblem.png" alt="AI Upscaling" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                          <div className="absolute inset-0 shadow-[inset_0_0_40px_rgba(0,0,0,0.8)] pointer-events-none" />
                        </div>
                      </div>
                      <h3 className="text-xl font-bold mb-3 text-white group-hover:text-cyan-400 transition-colors">AI Upscaling</h3>
                      <p className="text-base text-gray-300 flex-1 leading-relaxed">
                        GPU-accelerated image enhancement using Real-ESRGAN. Upscale images 4x with WebGL compute shaders for instant results.
                      </p>
                      <div className="mt-4 pt-4 w-full">
                        <div className="flex items-center text-sm font-medium text-cyan-400 group-hover:text-cyan-300 transition-colors">
                          <span>Explore AI Upscaling</span>
                          <span className="material-symbols-outlined text-lg ml-1 group-hover:translate-x-1 transition-transform">arrow_forward</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
                
                {/* SHARP 3D Generator Card - Custom Emblem */}
                <motion.div variants={itemVariants}>
                  <Link to="/sharp" className="card h-full block group relative overflow-hidden" data-accent="5">
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/0 via-violet-500/0 to-fuchsia-500/0 group-hover:from-indigo-500/10 group-hover:via-violet-500/10 group-hover:to-fuchsia-500/10 transition-colors duration-500"></div>
                    <div className="p-6 flex flex-col items-start text-left flex-1 h-full relative z-10">
                      <div className="icon-container mb-4 w-full h-32 bg-black/20 rounded-xl overflow-hidden border border-white/5 relative" style={{ perspective: '1000px' }}>
                        {/* 2D Image to 3D Neural Mesh Animation */}
                        <div className="absolute inset-0">
                          <img src="/emblems/sharp_3d_emblem.png" alt="SHARP 3D Generator" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                          <div className="absolute inset-0 shadow-[inset_0_0_40px_rgba(0,0,0,0.8)] pointer-events-none" />
                        </div>
                      </div>
                      <h3 className="text-xl font-bold mb-3 text-white group-hover:text-indigo-400 transition-colors">SHARP 3D Generator</h3>
                      <p className="text-base text-gray-300 flex-1 leading-relaxed">
                        Transform any image into 3D Gaussian Splats using Apple's neural network. Single-image to photorealistic 3D in seconds.
                      </p>
                      <div className="mt-4 pt-4 w-full">
                        <div className="flex items-center text-sm font-medium text-indigo-400 group-hover:text-indigo-300 transition-colors">
                          <span>Explore SHARP Generator</span>
                          <span className="material-symbols-outlined text-lg ml-1 group-hover:translate-x-1 transition-transform">arrow_forward</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
                {/* 3D Splat Viewer Card - Custom Emblem */}
                <motion.div variants={itemVariants}>
                  <Link to="/splat-viewer" className="card h-full block group relative overflow-hidden" data-accent="6">
                    <div className="absolute inset-0 bg-gradient-to-br from-violet-500/0 via-fuchsia-500/0 to-pink-500/0 group-hover:from-violet-500/10 group-hover:via-fuchsia-500/10 group-hover:to-pink-500/10 transition-colors duration-500"></div>
                    <div className="p-6 flex flex-col items-start text-left flex-1 h-full relative z-10">
                      <div className="icon-container mb-4 w-full h-32 bg-black/20 rounded-xl overflow-hidden border border-white/5 relative" style={{ perspective: '1000px' }}>
                        {/* Swirling Splats Animation */}
                        <div className="absolute inset-0">
                          <img src="/emblems/splat_viewer_emblem.png" alt="3D Splat Viewer" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                          <div className="absolute inset-0 shadow-[inset_0_0_40px_rgba(0,0,0,0.8)] pointer-events-none" />
                        </div>
                      </div>
                      <h3 className="text-xl font-bold mb-3 text-white group-hover:text-violet-400 transition-colors">3D Splat Viewer</h3>
                      <p className="text-base text-gray-300 flex-1 leading-relaxed">
                        WebGL renderer for Gaussian Splats, Triangle Splats, and PLY meshes. Experience cutting-edge 3D reconstruction with GPU-optimized rendering.
                      </p>
                      <div className="mt-4 pt-4 w-full">
                        <div className="flex items-center text-sm font-medium text-violet-400 group-hover:text-violet-300 transition-colors">
                          <span>Explore Splat Viewer</span>
                          <span className="material-symbols-outlined text-lg ml-1 group-hover:translate-x-1 transition-transform">arrow_forward</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>

                {/* M4VGS 4D Viewer Card - DEMO */}
                <motion.div variants={itemVariants}>
                  <a href="/m4vgs/index.html" className="card h-full block group relative overflow-hidden" data-accent="7" target="_blank" rel="noopener noreferrer">
                    <div className="absolute inset-0 bg-gradient-to-br from-violet-600/0 via-purple-500/0 to-cyan-500/0 group-hover:from-violet-600/20 group-hover:via-purple-500/20 group-hover:to-cyan-500/20 transition-colors duration-500"></div>
                    <div className="p-6 flex flex-col items-start text-left flex-1 h-full relative z-10">
                      
                      {/* DEMO BADGE */}
                      <div className="absolute top-4 right-4 z-20">
                        <span className="px-2 py-1 text-[10px] font-bold bg-yellow-500/20 text-yellow-500 rounded-md ring-1 ring-yellow-500/50 uppercase tracking-widest backdrop-blur-sm shadow-lg shadow-yellow-500/10">DEMO</span>
                      </div>

                      <div className="icon-container mb-4 w-full h-32 bg-black/20 rounded-xl overflow-hidden border border-white/5 relative" style={{ perspective: '1000px' }}>
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 group-hover:scale-105 transition-transform duration-700">
                          <div className="font-sans font-black text-4xl tracking-tight bg-gradient-to-br from-cyan-400 via-pink-500 to-purple-600 text-transparent bg-clip-text">
                            M4VGS
                          </div>
                          <div className="text-[10px] text-gray-500 uppercase tracking-[0.2em] mt-1 font-bold">Volumetric</div>
                          <div className="absolute inset-0 shadow-[inset_0_0_40px_rgba(0,0,0,0.8)] pointer-events-none" />
                        </div>
                      </div>
                      <h3 className="text-xl font-bold mb-3 text-white group-hover:text-purple-400 transition-colors">
                        M4VGS Volumetric Viewer
                      </h3>
                      <p className="text-base text-gray-300 flex-1 leading-relaxed">
                        Standalone isolated viewer for 4D Volumetric Video. Features dolly zooming, immersive settings, and experimental tools in a dedicated Preact sandbox.
                      </p>
                      <div className="mt-4 pt-4 w-full">
                        <div className="flex items-center text-sm font-medium text-purple-400 group-hover:text-purple-300 transition-colors">
                          <span>Enter M4VGS Space</span>
                          <span className="material-symbols-outlined text-lg ml-1 group-hover:translate-x-1 transition-transform">open_in_new</span>
                        </div>
                      </div>
                    </div>
                  </a>
                </motion.div>

                {/* Triangle Splatting Card - Custom Emblem */}
                <motion.div variants={itemVariants}>
                  <Link to="/triangle-splatting" className="card h-full block group relative overflow-hidden" data-accent="8">
                    {/* Background glow effect on hover */}
                    <div className="absolute inset-0 bg-gradient-to-br from-pink-500/0 via-purple-500/0 to-cyan-500/0 group-hover:from-pink-500/10 group-hover:via-purple-500/10 group-hover:to-cyan-500/10 transition-colors duration-500"></div>
                    
                    <div className="p-6 flex flex-col items-start text-left flex-1 h-full relative z-10">
                      <div className="icon-container mb-4 w-full h-32 bg-black/20 rounded-xl overflow-hidden border border-white/5 relative" style={{ perspective: '1000px' }}>
                        {/* 3D Triangle Splatting Animation Engine */}
                        <div className="absolute inset-0 flex items-center justify-center">
                          {/* Orbiting ring */}
                          <motion.div 
                            className="absolute w-24 h-24 rounded-full border border-pink-500/20"
                            animate={{ rotateX: [60, 60], rotateZ: [0, 360] }}
                            transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
                          />

                          {/* Triangle 1 - Wireframe Outer Hierarchy */}
                          <motion.div 
                            className="absolute"
                            animate={{ rotateY: [0, 360], rotateX: [10, -10, 10] }}
                            transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
                          >
                            <svg width="70" height="70" viewBox="0 0 100 100" className="overflow-visible drop-shadow-[0_0_8px_rgba(232,121,249,0.5)]">
                              <polygon points="50,10 95,85 5,85" fill="none" stroke="#e879f9" strokeWidth="1.5" strokeLinejoin="round" />
                              <polygon points="50,10 50,85 95,85" fill="none" stroke="#22d3ee" strokeWidth="1" strokeDasharray="3 3" />
                              <polygon points="50,10 5,85 50,85" fill="none" stroke="#a78bfa" strokeWidth="1" strokeDasharray="3 3" />
                              <polygon points="50,85 75,45 25,45" fill="none" stroke="#f472b6" strokeWidth="1" opacity="0.5" />
                            </svg>
                          </motion.div>
                          
                          {/* Triangle 2 - Solid inner glowing core */}
                          <motion.div 
                            className="absolute"
                            animate={{ rotateY: [360, 0], scale: [0.7, 0.9, 0.7] }}
                            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
                          >
                            <svg width="45" height="45" viewBox="0 0 100 100" className="drop-shadow-[0_0_20px_rgba(232,121,249,0.9)]">
                              <polygon points="50,15 85,80 15,80" fill="url(#triangle-grad)" opacity="0.9" />
                              <defs>
                                <linearGradient id="triangle-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                                  <stop offset="0%" stopColor="#c026d3" />
                                  <stop offset="50%" stopColor="#e879f9" />
                                  <stop offset="100%" stopColor="#06b6d4" />
                                </linearGradient>
                              </defs>
                            </svg>
                          </motion.div>

                          {/* Geometric Splat Particles */}
                          {[...Array(12)].map((_, i) => (
                            <motion.div
                              key={i}
                              className="absolute w-0 h-0 border-l-[3px] border-r-[3px] border-b-[5px] border-transparent border-b-cyan-300 drop-shadow-[0_0_5px_#22d3ee]"
                              animate={{
                                y: [0, (Math.random() - 0.5) * 80],
                                x: [0, (Math.random() - 0.5) * 80],
                                rotate: [0, Math.random() * 360],
                                scale: [0, Math.random() + 0.5, 0],
                                opacity: [0, 1, 0]
                              }}
                              transition={{
                                duration: 2 + Math.random() * 3,
                                repeat: Infinity,
                                delay: Math.random() * 2,
                                ease: "easeInOut"
                              }}
                            />
                          ))}
                        </div>
                      </div>
                      <h3 className="text-xl font-bold mb-3 text-white group-hover:text-fuchsia-400 transition-colors">Triangle Splatting</h3>
                      <p className="text-base text-gray-300 flex-1 leading-relaxed">
                        GPU-accelerated triangle-based 3D Gaussian Splatting. A next-gen rendering technique that replaces splat discs with triangle meshes for sharper, more detailed 3D scenes.
                        <br/><span className="text-xs text-yellow-500/80 mt-2 block font-medium">⚠️ Note: Experimental bleeding-edge technology. Barely any ecosystem support exists; primarily intended for researchers.</span>
                      </p>
                      <div className="mt-4 pt-4 w-full">
                        <div className="flex items-center text-sm font-medium text-fuchsia-400 group-hover:text-fuchsia-300 transition-colors">
                          <span>Explore Triangle Splatting</span>
                          <span className="material-symbols-outlined text-lg ml-1 group-hover:translate-x-1 transition-transform">arrow_forward</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
                <ToolCard
                  variants={itemVariants}
                  title="Image Comparison"
                  description="WebGL-based side-by-side comparison with GPU-accelerated transitions. Analyze differences with shader-based blend modes."
                  icon="compare_arrows"
                  accent="4"
                  path="/compare"
                />
                
                {/* ASCII Art Studio Card - Custom */}
                <motion.div variants={itemVariants}>
                  <Link to="/ascii-video-converter" className="card h-full block" data-accent="8">
                    <div className="p-6 flex flex-col items-start text-left flex-1 h-full">
                      <div className="icon-container mb-4" data-accent="8">
                        <div className="relative w-full h-full flex items-center justify-center">
                          {/* Animated ASCII Art Icon */}
                          <motion.div
                            className="font-mono text-[10px] leading-[1.1] text-center text-white"
                            animate={{
                              opacity: [0.7, 1, 0.7],
                              textShadow: [
                                "0 0 10px #00ff41",
                                "0 0 20px #00ff41",
                                "0 0 10px #00ff41"
                              ]
                            }}
                            transition={{
                              duration: 2,
                              repeat: Infinity,
                              ease: "easeInOut"
                            }}
                          >
                            <div>╔═══╗</div>
                            <div>║▓▓▓║</div>
                            <div>╚═══╝</div>
                          </motion.div>
                          
                          {/* Matrix rain effect */}
                          {[...Array(4)].map((_, i) => (
                            <motion.div
                              key={i}
                              className="absolute text-[8px] font-mono text-green-400"
                              style={{
                                left: `${20 + i * 20}%`,
                                top: -5
                              }}
                              animate={{
                                y: [0, 45],
                                opacity: [0, 0.6, 0]
                              }}
                              transition={{
                                duration: 1.5 + i * 0.3,
                                repeat: Infinity,
                                delay: i * 0.2
                              }}
                            >
                              {['@', '#', '%', '&', '*'][i]}
                            </motion.div>
                          ))}
                        </div>
                      </div>
                      <h3 className="text-xl font-bold mb-3 text-white">ASCII Art Studio</h3>
                      <p className="text-base text-gray-300 flex-1 leading-relaxed">
                        Transform videos into animated ASCII art with parallel WebWorker processing. Real-time conversion with multiple retro color themes.
                      </p>
                      <div className="mt-4 pt-4 w-full">
                        <div className="flex items-center text-sm font-medium text-cyan-400 hover:text-cyan-300 transition-colors">
                          <span>Use Tool</span>
                          <span className="material-symbols-outlined text-lg ml-1">arrow_forward</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
                
                {/* Secret Tools Card - Enhanced with glowing aesthetic */}
                <motion.div
                  variants={itemVariants}
                  className="card h-full flex flex-col items-center justify-center text-center p-6 cursor-pointer relative overflow-hidden group"
                  onClick={onToggleSidebar}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  data-accent="7"
                >
                  {/* Invisible button overlay to catch all clicks reliably */}
                  <button className="absolute inset-0 w-full h-full z-20 cursor-pointer rounded-xl bg-transparent border-none appearance-none" onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleSidebar?.(); }} aria-label="Open Secret Tools" />

                  {/* Holographic effect overlay */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                    <div className="absolute inset-0 bg-gradient-to-t from-cyan-500/10 to-transparent"></div>
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,212,255,0.1),transparent_70%)]"></div>
                  </div>
                  
                  {/* High effort animated SVG icon */}
                  <div className="icon-container mb-4 relative z-10 pointer-events-none" data-accent="7">
                    <div className="relative w-16 h-16 flex items-center justify-center">
                      <motion.div 
                        className="absolute inset-0 rounded-full border border-cyan-500/30 border-r-cyan-400/80 border-b-cyan-500/80"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
                      />
                      <motion.div 
                        className="absolute inset-1 rounded-full border border-purple-500/30 border-l-purple-400/80 border-t-purple-500/80"
                        animate={{ rotate: -360 }}
                        transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                      />
                      <motion.div
                        className="relative z-10 text-cyan-400"
                        animate={{ scale: [1, 1.1, 1], filter: ['drop-shadow(0 0 2px rgba(34,211,238,0.5))', 'drop-shadow(0 0 8px rgba(34,211,238,0.9))', 'drop-shadow(0 0 2px rgba(34,211,238,0.5))'] }}
                        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-8 h-8">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                        </svg>
                      </motion.div>
                    </div>
                  </div>
                  <h3 className="text-xl font-bold mb-2 text-white relative z-10 pointer-events-none">Secret Tools</h3>
                  <p className="text-sm text-[var(--text-secondary)] mb-4 relative z-10 pointer-events-none">
                    Hidden utilities and experimental features. Use classified GPU endpoints for special applications.
                  </p>
                  <div className="flex items-center text-sm font-medium text-[var(--primary-color)] relative z-10 pointer-events-none">
                    <span>Unlock access</span>
                    <span className="material-symbols-outlined text-lg ml-1 animate-pulse">lock_open</span>
                  </div>
                  
                  {/* Corner accent */}
                  <div className="absolute top-0 right-0 w-16 h-16 opacity-20 pointer-events-none">
                    <div className="absolute top-0 right-0 w-full h-full border-t-2 border-r-2 border-cyan-400"></div>
                  </div>
                </motion.div>

                {/* Video Caption Studio Card with Under Construction */}
                <motion.div
                  variants={itemVariants}
                  className="relative"
                >
                  <ToolCard
                    title="Video Caption Studio (Beta)"
                    description="AI-powered subtitle generation and editing for videos. Create professional captions with automated transcription and timing."
                    icon="subtitles"
                    accent="7"
                    path="/subtitle"
                  />
                  
                  {/* Under Construction Overlay - Less Blur */}
                  <div className="absolute inset-0 bg-black/70 backdrop-blur-[2px] rounded-xl flex items-center justify-center overflow-hidden pointer-events-auto" style={{ zIndex: 50 }}>
                    {/* Close/Dismiss Button */}
                    <Link
                      to="/subtitle"
                      className="absolute top-3 right-3 text-gray-400 hover:text-white transition-colors z-50"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <motion.span
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        className="material-symbols-outlined block"
                      >
                        close
                      </motion.span>
                    </Link>
                    
                    {/* Proceed Button */}
                    <Link
                      to="/subtitle"
                      className="absolute bottom-4 z-50"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <motion.div
                        className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-xs rounded-full backdrop-blur-sm transition-colors"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        Continue to Caption Studio →
                      </motion.div>
                    </Link>
                    
                    {/* Pixel Art Video Editor Animation */}
                    <div className="relative z-10 pointer-events-none">
                      <div className="flex flex-col items-center gap-4">
                        {/* Animated Computer Screen */}
                        <div className="relative w-32 h-28">
                          {/* Monitor */}
                          <div className="absolute inset-0 grid grid-cols-12 grid-rows-10 gap-0">
                            {/* Screen Frame */}
                            <div className="col-span-12 row-span-8 bg-gray-800 rounded-t-lg border-2 border-gray-600">
                              {/* Screen Content */}
                              <div className="m-1 h-full bg-gray-900 rounded relative overflow-hidden">
                                {/* Video Timeline Animation */}
                                <motion.div
                                  className="absolute top-2 left-2 right-2 h-3 bg-gray-700 rounded"
                                  animate={{
                                    opacity: [0.5, 1, 0.5],
                                  }}
                                  transition={{
                                    duration: 2,
                                    repeat: Infinity,
                                  }}
                                >
                                  <motion.div
                                    className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded"
                                    animate={{
                                      width: ["0%", "100%"],
                                    }}
                                    transition={{
                                      duration: 3,
                                      repeat: Infinity,
                                      ease: "linear"
                                    }}
                                  />
                                </motion.div>
                                
                                {/* Subtitle Text Animation */}
                                <div className="absolute bottom-2 left-2 right-2">
                                  <motion.div
                                    className="text-[4px] text-white text-center font-mono bg-black/80 px-1 py-0.5 rounded"
                                    animate={{
                                      opacity: [0, 1, 1, 0],
                                    }}
                                    transition={{
                                      duration: 3,
                                      repeat: Infinity,
                                      times: [0, 0.2, 0.8, 1],
                                    }}
                                  >
                                    [SUBTITLE TEXT]
                                  </motion.div>
                                </div>
                                
                                {/* Waveform */}
                                <div className="absolute top-6 left-2 right-2 flex items-center justify-center gap-0.5">
                                  {[...Array(12)].map((_, i) => (
                                    <motion.div
                                      key={i}
                                      className="w-0.5 bg-cyan-400"
                                      animate={{
                                        height: [
                                          `${5 + Math.random() * 10}px`,
                                          `${5 + Math.random() * 10}px`,
                                          `${5 + Math.random() * 10}px`,
                                        ],
                                      }}
                                      transition={{
                                        duration: 0.5 + Math.random() * 0.5,
                                        repeat: Infinity,
                                        ease: "easeInOut",
                                      }}
                                    />
                                  ))}
                                </div>
                              </div>
                            </div>
                            
                            {/* Monitor Stand */}
                            <div className="col-start-5 col-span-4 row-start-9 bg-gray-700"></div>
                            <div className="col-start-4 col-span-6 row-start-10 bg-gray-800 rounded-b-lg"></div>
                          </div>
                          
                          {/* Keyboard */}
                          <motion.div
                            className="absolute -bottom-2 left-3 right-3 h-3 bg-gray-700 rounded-sm"
                            animate={{
                              y: [0, -1, 0],
                            }}
                            transition={{
                              duration: 2,
                              repeat: Infinity,
                              ease: "easeInOut",
                            }}
                          >
                            <div className="grid grid-cols-10 gap-0.5 p-0.5">
                              {[...Array(10)].map((_, i) => (
                                <motion.div
                                  key={i}
                                  className="h-1 bg-gray-600 rounded-[1px]"
                                  animate={{
                                    backgroundColor: ["#4b5563", "#60a5fa", "#4b5563"],
                                  }}
                                  transition={{
                                    duration: 1,
                                    repeat: Infinity,
                                    delay: i * 0.1,
                                  }}
                                />
                              ))}
                            </div>
                          </motion.div>
                        </div>
                        
                        {/* Text */}
                        <div className="flex flex-col items-center gap-1">
                          <motion.div
                            animate={{
                              opacity: [1, 0.3, 1],
                            }}
                            transition={{
                              duration: 2,
                              repeat: Infinity,
                              ease: "easeInOut"
                            }}
                          >
                            <span className="text-purple-400 font-mono text-xs font-bold tracking-wider">ENHANCING</span>
                          </motion.div>
                          <motion.div
                            animate={{
                              opacity: [1, 0.3, 1],
                            }}
                            transition={{
                              duration: 2,
                              repeat: Infinity,
                              ease: "easeInOut",
                              delay: 0.2
                            }}
                          >
                            <span className="text-pink-400 font-mono text-xs font-bold tracking-wider">CAPTIONS</span>
                          </motion.div>
                        </div>
                        
                        {/* Progress Indicator */}
                        <div className="flex gap-1">
                          {[0, 1, 2, 3].map((i) => (
                            <motion.div
                              key={i}
                              className="w-2 h-2 bg-purple-500 rounded-full"
                              animate={{
                                scale: [1, 1.5, 1],
                                opacity: [0.3, 1, 0.3],
                              }}
                              transition={{
                                duration: 1.5,
                                repeat: Infinity,
                                delay: i * 0.2,
                              }}
                            />
                          ))}
                        </div>
                        
                        {/* Floating Icons */}
                        <motion.div
                          className="absolute -left-8 top-4 text-lg"
                          animate={{
                            y: [0, -5, 0],
                            rotate: [-10, 10, -10],
                          }}
                          transition={{
                            duration: 3,
                            repeat: Infinity,
                            ease: "easeInOut"
                          }}
                        >
                          💬
                        </motion.div>
                        <motion.div
                          className="absolute -right-8 top-4 text-lg"
                          animate={{
                            y: [0, -5, 0],
                            rotate: [10, -10, 10],
                          }}
                          transition={{
                            duration: 3,
                            repeat: Infinity,
                            ease: "easeInOut",
                            delay: 1.5
                          }}
                        >
                          🎬
                        </motion.div>
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* Face Swap Card with Under Construction Animation - MOVED TO DEAD LAST */}
                <motion.div
                  variants={itemVariants}
                  className="relative"
                >
                  <ToolCard
                    title="Face Swap AI"
                    description="WebGL-powered face swapping using ONNX models. Advanced facial recognition and seamless blending powered by AI."
                    icon="face_retouching_natural"
                    accent="6"
                    path="/face-swap"
                  />
                  
                  {/* Under Construction Overlay */}
                  <div className="absolute inset-0 bg-black/90 backdrop-blur-sm rounded-xl flex items-center justify-center overflow-hidden pointer-events-auto" style={{ zIndex: 50 }}>
                    {/* Close/Dismiss Button */}
                    <Link
                      to="/face-swap"
                      className="absolute top-3 right-3 text-gray-400 hover:text-white transition-colors z-50"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <motion.span
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        className="material-symbols-outlined block"
                      >
                        close
                      </motion.span>
                    </Link>
                    
                    {/* Proceed Button */}
                    <Link
                      to="/face-swap"
                      className="absolute bottom-4 z-50"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <motion.div
                        className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-xs rounded-full backdrop-blur-sm transition-colors"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        Continue to Face Swap →
                      </motion.div>
                    </Link>
                    
                    {/* Pixel Art Construction Animation */}
                    <div className="relative z-10 pointer-events-none">
                      {/* Main Container */}
                      <div className="flex flex-col items-center gap-3">
                        {/* Animated Construction Worker */}
                        <div className="relative w-24 h-24">
                          <motion.div
                            className="absolute inset-0"
                            animate={{
                              y: [0, -8, 0],
                            }}
                            transition={{
                              duration: 2,
                              repeat: Infinity,
                              ease: "easeInOut"
                            }}
                          >
                            {/* Pixel Art Worker */}
                            <div className="grid grid-cols-8 grid-rows-8 w-full h-full gap-0">
                              {/* Hard Hat */}
                              <div className="col-start-3 col-span-4 row-start-1 bg-yellow-400 rounded-sm"></div>
                              <div className="col-start-2 col-span-6 row-start-2 bg-yellow-500 rounded-sm"></div>
                              
                              {/* Face */}
                              <div className="col-start-3 col-span-4 row-start-3 bg-orange-200 rounded-sm"></div>
                              <div className="col-start-3 col-span-4 row-start-4 bg-orange-200 rounded-sm">
                                {/* Eyes */}
                                <div className="grid grid-cols-4 h-full gap-0">
                                  <div className="col-start-1 bg-black rounded-full"></div>
                                  <div className="col-start-3 bg-black rounded-full"></div>
                                </div>
                              </div>
                              
                              {/* Body */}
                              <div className="col-start-2 col-span-6 row-start-5 bg-orange-500 rounded-sm"></div>
                              <div className="col-start-2 col-span-6 row-start-6 bg-orange-500 rounded-sm"></div>
                              
                              {/* Arms */}
                              <div className="col-start-1 row-start-5 bg-orange-200 rounded-sm"></div>
                              <div className="col-start-8 row-start-5 bg-orange-200 rounded-sm"></div>
                              
                              {/* Legs */}
                              <div className="col-start-3 col-span-2 row-start-7 bg-blue-600 rounded-sm"></div>
                              <div className="col-start-5 col-span-2 row-start-7 bg-blue-600 rounded-sm"></div>
                              <div className="col-start-3 col-span-2 row-start-8 bg-gray-800 rounded-sm"></div>
                              <div className="col-start-5 col-span-2 row-start-8 bg-gray-800 rounded-sm"></div>
                            </div>
                          </motion.div>
                          
                          {/* Animated Hammer */}
                          <motion.div
                            className="absolute top-6 -right-6 w-6 h-12"
                            animate={{
                              rotate: [-30, -60, -30],
                              x: [0, -3, 0],
                            }}
                            transition={{
                              duration: 1,
                              repeat: Infinity,
                              ease: "easeInOut"
                            }}
                          >
                            <div className="grid grid-cols-2 grid-rows-6 w-full h-full gap-0">
                              {/* Hammer Head */}
                              <div className="col-span-2 row-span-2 bg-gray-600 rounded-sm"></div>
                              {/* Handle */}
                              <div className="col-start-1 row-start-3 row-span-4 bg-yellow-800 rounded-sm"></div>
                            </div>
                          </motion.div>
                        </div>
                        
                        {/* Pixel Text "UNDER CONSTRUCTION" */}
                        <div className="flex flex-col items-center gap-1">
                          <motion.div
                            className="flex gap-1"
                            animate={{
                              opacity: [1, 0.5, 1],
                            }}
                            transition={{
                              duration: 1.5,
                              repeat: Infinity,
                              ease: "easeInOut"
                            }}
                          >
                            <span className="text-yellow-400 font-mono text-xs font-bold tracking-wider">UNDER</span>
                          </motion.div>
                          <motion.div
                            className="flex gap-1"
                            animate={{
                              opacity: [1, 0.5, 1],
                            }}
                            transition={{
                              duration: 1.5,
                              repeat: Infinity,
                              ease: "easeInOut",
                              delay: 0.2
                            }}
                          >
                            <span className="text-orange-400 font-mono text-xs font-bold tracking-wider">CONSTRUCTION</span>
                          </motion.div>
                        </div>
                        
                        {/* Animated Progress Bar */}
                        <div className="w-full max-w-[150px] h-3 bg-gray-800 rounded-full overflow-hidden">
                          <motion.div
                            className="h-full bg-gradient-to-r from-yellow-400 to-orange-500"
                            animate={{
                              width: ["0%", "100%", "0%"],
                            }}
                            transition={{
                              duration: 3,
                              repeat: Infinity,
                              ease: "easeInOut"
                            }}
                          />
                        </div>
                        
                        {/* Pixel Bricks Animation */}
                        <div className="absolute -bottom-2 left-0 right-0 flex justify-center gap-1">
                          {[0, 1, 2, 3].map((index) => (
                            <motion.div
                              key={index}
                              className="w-3 h-3 bg-red-600 border border-red-800 rounded-sm"
                              animate={{
                                y: [0, -15, 0],
                                opacity: [0, 1, 0],
                              }}
                              transition={{
                                duration: 2,
                                repeat: Infinity,
                                delay: index * 0.2,
                                ease: "easeInOut"
                              }}
                            />
                          ))}
                        </div>
                        
                        {/* Flashing Warning Lights */}
                        <motion.div
                          className="absolute -top-2 -left-2 w-2 h-2 bg-red-500 rounded-full"
                          animate={{
                            opacity: [0, 1, 0],
                          }}
                          transition={{
                            duration: 1,
                            repeat: Infinity,
                            ease: "easeInOut"
                          }}
                        />
                        <motion.div
                          className="absolute -top-2 -right-2 w-2 h-2 bg-red-500 rounded-full"
                          animate={{
                            opacity: [0, 1, 0],
                          }}
                          transition={{
                            duration: 1,
                            repeat: Infinity,
                            ease: "easeInOut",
                            delay: 0.5
                          }}
                        />
                      </div>
                      
                      {/* Pixel Dust Particles */}
                      {[...Array(6)].map((_, i) => (
                        <motion.div
                          key={i}
                          className="absolute w-1 h-1 bg-gray-400 rounded-full"
                          style={{
                            left: `${20 + Math.random() * 60}%`,
                            top: `${20 + Math.random() * 60}%`,
                          }}
                          animate={{
                            y: [0, -20, 0],
                            x: [0, (Math.random() - 0.5) * 15, 0],
                            opacity: [0, 1, 0],
                          }}
                          transition={{
                            duration: 2 + Math.random() * 2,
                            repeat: Infinity,
                            delay: Math.random() * 2,
                            ease: "easeOut"
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </motion.div>
              </motion.div>

              {/* Features Section */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8"
              >
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold mb-2">WebGL Acceleration</h3>
                  <p className="text-gray-400">Harness the power of your GPU for real-time AI processing directly in the browser</p>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Neural Networks</h3>
                  <p className="text-gray-400">State-of-the-art AI models optimized for WebGL execution with ONNX Runtime</p>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-green-500 to-teal-600 rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Real-time Processing</h3>
                  <p className="text-gray-400">Instant results with GPU-optimized shaders and parallel compute operations</p>
                </div>
              </motion.div>

              {/* Background control hint */}
              <div className="text-center text-gray-500 text-sm mt-6">
                Press <kbd className="px-2 py-1 bg-gray-700 rounded text-xs">Ctrl+B</kbd> to toggle 3D background
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
};

export default HomePage; 