import Header from '../components/Header';
import Footer from '../components/Footer';
import ToolCard from '../components/ToolCard';
import Sidebar from '../components/Sidebar';
import { motion, type Variants, type Transition } from 'framer-motion';
import { useState } from 'react';
import { BsTools } from 'react-icons/bs';

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

  return (
    <div className="relative flex size-full min-h-screen flex-col dark group/design-root overflow-x-hidden">
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onToggle={toggleSidebar} />
      
      <div className="layout-container flex h-full grow flex-col">
        <Header />
        <main className="px-6 md:px-10 lg:px-20 xl:px-40 flex flex-1 justify-center py-8 overflow-y-auto">
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
                
                {/* Miscellaneous Tools Card - Enhanced with Star Wars styling */}
                <motion.div
                  variants={itemVariants}
                  className="card h-full flex flex-col items-center justify-center text-center p-6 cursor-pointer relative overflow-hidden group"
                  onClick={toggleSidebar}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  data-accent="6"
                >
                  {/* Holographic effect overlay */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="absolute inset-0 bg-gradient-to-t from-cyan-500/10 to-transparent"></div>
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,212,255,0.1),transparent_70%)]"></div>
                  </div>
                  
                  <div className="icon-container mb-4 relative z-10" data-accent="6">
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
            </div>
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
};

export default HomePage;