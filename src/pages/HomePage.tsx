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

const HomePage = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

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
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onToggle={toggleSidebar} />
      
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
                <ToolCard
                  variants={itemVariants}
                  title="AI Upscaling"
                  description="GPU-accelerated image enhancement using Real-ESRGAN. Upscale images 4x with WebGL compute shaders for instant results."
                  icon="zoom_in"
                  accent="3"
                  path="/upscaler"
                />
                
                <ToolCard
                  variants={itemVariants}
                  title="3D Splat Viewer"
                  description="WebGL renderer for Gaussian Splats, Triangle Splats, and PLY meshes. Experience cutting-edge 3D reconstruction with GPU-optimized rendering."
                  icon="camera_invert"
                  accent="5"
                  path="/splat-viewer"
                />
                <ToolCard
                  variants={itemVariants}
                  title="Image Comparison"
                  description="WebGL-based side-by-side comparison with GPU-accelerated transitions. Analyze differences with shader-based blend modes."
                  icon="compare_arrows"
                  accent="4"
                  path="/compare"
                />
                
                <ToolCard
                  variants={itemVariants}
                  title="ASCII Video Art"
                  description="Transform videos into animated ASCII art with parallel WebWorker processing. Real-time conversion with multiple retro color themes."
                  icon="text_fields"
                  accent="8"
                  path="/ascii-video-converter"
                />
                
                {/* Miscellaneous Tools Card - Enhanced with Star Wars styling */}
                <motion.div
                  variants={itemVariants}
                  className="card h-full flex flex-col items-center justify-center text-center p-6 cursor-pointer relative overflow-hidden group"
                  onClick={toggleSidebar}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  data-accent="7"
                >
                  {/* Holographic effect overlay */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="absolute inset-0 bg-gradient-to-t from-cyan-500/10 to-transparent"></div>
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,212,255,0.1),transparent_70%)]"></div>
                  </div>
                  
                  <div className="icon-container mb-4 relative z-10" data-accent="7">
                    <BsTools className="text-current w-8 h-8"/>
                  </div>
                  <h3 className="text-xl font-bold mb-2 text-white relative z-10">Miscellaneous Tools</h3>
                  <p className="text-sm text-[var(--text-secondary)] mb-4 relative z-10">
                    Additional WebGL experiments and GPU-accelerated utilities. Explore advanced graphics techniques and neural rendering.
                  </p>
                  <div className="flex items-center text-sm font-medium text-[var(--primary-color)] relative z-10">
                    <span>Click to explore</span>
                    <span className="material-symbols-outlined text-lg ml-1 animate-pulse">arrow_forward</span>
                  </div>
                  
                  {/* Corner accent */}
                  <div className="absolute top-0 right-0 w-16 h-16 opacity-20">
                    <div className="absolute top-0 right-0 w-full h-full border-t-2 border-r-2 border-cyan-400"></div>
                  </div>
                </motion.div>

                {/* Video Caption Studio Card with Under Construction */}
                <motion.div
                  variants={itemVariants}
                  className="relative"
                >
                  <ToolCard
                    title="Video Caption Studio"
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