import React, { useRef, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform, useSpring } from 'framer-motion';
import Header from '../../components/Header';
import Footer from '../../components/Footer';

const SplatViewerLanding: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  const [rotation, setRotation] = useState(0);
  const springConfig = { damping: 15, stiffness: 100 };
  const rotationSpring = useSpring(rotation, springConfig);

  useEffect(() => {
    const interval = setInterval(() => {
      setRotation(prev => prev + 1);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    rotationSpring.set(rotation);
  }, [rotation, rotationSpring]);

  const splatScale = useTransform(scrollYProgress, [0, 0.5], [1, 1.2]);
  const splatOpacity = useTransform(scrollYProgress, [0, 0.3, 0.7, 1], [1, 1, 0.8, 0]);

  return (
    <div ref={containerRef} className="relative flex flex-col min-h-screen bg-gradient-to-b from-gray-950 via-cyan-950/20 to-gray-950 overflow-x-hidden">
      <Header />
      
      {/* Hero Section with 3D Animation */}
      <section className="relative min-h-screen flex items-center justify-center px-6 py-20">
        {/* Background Effects */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute inset-0 opacity-30">
            <div className="absolute top-1/3 left-1/3 w-96 h-96 bg-cyan-500 rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-1/3 right-1/3 w-96 h-96 bg-blue-500 rounded-full blur-3xl animate-pulse" />
          </div>
        </div>

        <div className="relative z-10 text-center max-w-6xl mx-auto">
          <motion.h1 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-6xl md:text-8xl font-bold mb-6 bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent"
          >
            3D Gaussian Splatting
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-xl md:text-2xl text-gray-300 mb-8 max-w-3xl mx-auto"
          >
            Experience next-gen 3D visualization with real-time Gaussian Splat rendering in your browser
          </motion.p>

          {/* 3D Splat Visualization */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            style={{ scale: splatScale, opacity: splatOpacity }}
            className="relative w-full max-w-2xl mx-auto h-96 mb-12 perspective-1000"
          >
            <motion.div
              style={{ rotateY: rotationSpring }}
              className="relative w-full h-full transform-style-3d"
            >
              {/* 3D Points Cloud Visualization */}
              <svg viewBox="0 0 400 400" className="w-full h-full">
                <defs>
                  <radialGradient id="splatGradient">
                    <stop offset="0%" stopColor="#06B6D4" stopOpacity="0.8" />
                    <stop offset="100%" stopColor="#06B6D4" stopOpacity="0" />
                  </radialGradient>
                  <filter id="glow">
                    <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                    <feMerge>
                      <feMergeNode in="coloredBlur"/>
                      <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                  </filter>
                </defs>
                
                {/* Generate 3D point cloud */}
                {Array.from({ length: 100 }, (_, i) => {
                  const angle = (i / 100) * Math.PI * 2;
                  const radius = 100 + Math.sin(i * 0.5) * 50;
                  const x = 200 + Math.cos(angle) * radius;
                  const y = 200 + Math.sin(angle) * radius * 0.5;
                  const z = Math.sin(i * 0.3) * 50;
                  const size = 8 + z / 10;
                  
                  return (
                    <motion.circle
                      key={i}
                      cx={x}
                      cy={y}
                      r={size}
                      fill="url(#splatGradient)"
                      filter="url(#glow)"
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ 
                        opacity: [0.3, 0.8, 0.3],
                        scale: [0.8, 1.2, 0.8],
                        y: y + Math.sin(rotation * 0.01 + i) * 10
                      }}
                      transition={{
                        duration: 3,
                        repeat: Infinity,
                        delay: i * 0.01,
                        ease: "easeInOut"
                      }}
                    />
                  );
                })}
                
                {/* Connection lines */}
                {Array.from({ length: 20 }, (_, i) => {
                  const angle1 = (i / 20) * Math.PI * 2;
                  const angle2 = ((i + 1) / 20) * Math.PI * 2;
                  const r = 100;
                  return (
                    <motion.line
                      key={`line-${i}`}
                      x1={200 + Math.cos(angle1) * r}
                      y1={200 + Math.sin(angle1) * r * 0.5}
                      x2={200 + Math.cos(angle2) * r}
                      y2={200 + Math.sin(angle2) * r * 0.5}
                      stroke="#06B6D4"
                      strokeWidth="0.5"
                      opacity="0.3"
                    />
                  );
                })}
              </svg>
              
              {/* 3D Text Labels */}
              <div className="absolute inset-0 flex items-center justify-center">
                <motion.div
                  animate={{
                    opacity: [0.5, 1, 0.5],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                  className="text-cyan-400 font-mono text-sm"
                >
                  REAL-TIME 3D
                </motion.div>
              </div>
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Link
              to="/splat-viewer"
              className="px-8 py-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white rounded-lg font-semibold text-lg transition-all transform hover:scale-105 shadow-lg hover:shadow-cyan-500/25"
            >
              <span className="flex items-center gap-2">
                <span className="material-symbols-outlined">view_in_ar</span>
                Open 3D Viewer
              </span>
            </Link>
            <button className="px-8 py-4 bg-gray-800 hover:bg-gray-700 text-white rounded-lg font-semibold text-lg transition-all border border-gray-700">
              View Sample Splats
            </button>
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-4xl md:text-5xl font-bold text-center mb-16 bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent"
          >
            Revolutionary 3D Technology
          </motion.h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: 'speed',
                title: 'Ultra-Fast Rendering',
                description: 'Real-time 3D visualization at 60+ FPS using WebGL acceleration'
              },
              {
                icon: 'cloud_upload',
                title: 'PLY File Support',
                description: 'Upload and view Gaussian Splat files in standard PLY format'
              },
              {
                icon: 'touch_app',
                title: 'Interactive Controls',
                description: 'Rotate, zoom, and pan with mouse or touch gestures'
              },
              {
                icon: 'photo_camera',
                title: 'High Quality',
                description: 'Photorealistic 3D reconstructions from real-world captures'
              },
              {
                icon: 'devices',
                title: 'Cross-Platform',
                description: 'Works on desktop, tablet, and mobile browsers'
              },
              {
                icon: 'visibility',
                title: 'View Modes',
                description: 'Toggle between point cloud, splat, and wireframe views'
              }
            ].map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="bg-gray-900/50 backdrop-blur-sm p-8 rounded-xl border border-cyan-500/20 hover:border-cyan-500/40 transition-all"
              >
                <span className="material-symbols-outlined text-4xl text-cyan-400 mb-4 block">
                  {feature.icon}
                </span>
                <h3 className="text-xl font-bold mb-3 text-white">{feature.title}</h3>
                <p className="text-gray-400">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Demo Section */}
      <section className="py-20 px-6 bg-gradient-to-b from-transparent via-cyan-950/10 to-transparent">
        <div className="max-w-6xl mx-auto">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-4xl md:text-5xl font-bold text-center mb-16 text-white"
          >
            See It In Action
          </motion.h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="bg-gray-900/50 backdrop-blur-sm p-8 rounded-xl border border-cyan-500/20"
            >
              <h3 className="text-2xl font-bold mb-4 text-cyan-400">What are Gaussian Splats?</h3>
              <p className="text-gray-300 mb-4">
                Gaussian Splatting is a revolutionary 3D representation technique that uses millions of 
                3D Gaussians to create photorealistic scenes. Unlike traditional mesh-based 3D models, 
                splats can capture complex details like fur, foliage, and transparent objects.
              </p>
              <ul className="space-y-2 text-gray-400">
                <li className="flex items-start gap-2">
                  <span className="material-symbols-outlined text-cyan-400 mt-1">check_circle</span>
                  <span>Captures real-world scenes in full detail</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="material-symbols-outlined text-cyan-400 mt-1">check_circle</span>
                  <span>No complex mesh generation required</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="material-symbols-outlined text-cyan-400 mt-1">check_circle</span>
                  <span>Smaller file sizes than volumetric video</span>
                </li>
              </ul>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="bg-gray-900/50 backdrop-blur-sm p-8 rounded-xl border border-cyan-500/20"
            >
              <h3 className="text-2xl font-bold mb-4 text-blue-400">Perfect For</h3>
              <div className="space-y-3">
                {[
                  { title: 'Virtual Tours', desc: 'Create immersive property walkthroughs' },
                  { title: 'Cultural Heritage', desc: 'Preserve historical sites in 3D' },
                  { title: 'Product Visualization', desc: 'Show products from every angle' },
                  { title: 'Game Development', desc: 'Import real environments into games' },
                  { title: 'Research & Education', desc: 'Study complex 3D structures' },
                  { title: 'Art & Design', desc: 'Create unique 3D artworks' }
                ].map((use, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <span className="material-symbols-outlined text-blue-400">arrow_right</span>
                    <div>
                      <h4 className="font-semibold text-white">{use.title}</h4>
                      <p className="text-sm text-gray-400">{use.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Technical Specs */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-gradient-to-r from-cyan-900/20 to-blue-900/20 p-8 rounded-2xl backdrop-blur-sm border border-cyan-500/20"
          >
            <h3 className="text-2xl font-bold mb-6 text-white">Technical Specifications</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold text-cyan-400 mb-2">File Format</h4>
                <p className="text-gray-300">PLY (Polygon File Format)</p>
              </div>
              <div>
                <h4 className="font-semibold text-cyan-400 mb-2">Rendering Engine</h4>
                <p className="text-gray-300">Three.js with WebGL 2.0</p>
              </div>
              <div>
                <h4 className="font-semibold text-cyan-400 mb-2">Max Points</h4>
                <p className="text-gray-300">10+ million splats (device dependent)</p>
              </div>
              <div>
                <h4 className="font-semibold text-cyan-400 mb-2">Compression</h4>
                <p className="text-gray-300">Supports compressed PLY files</p>
              </div>
              <div>
                <h4 className="font-semibold text-cyan-400 mb-2">Performance</h4>
                <p className="text-gray-300">60+ FPS on modern GPUs</p>
              </div>
              <div>
                <h4 className="font-semibold text-cyan-400 mb-2">Memory Usage</h4>
                <p className="text-gray-300">Optimized streaming for large files</p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-4xl mx-auto text-center"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
            Experience the Future of 3D
          </h2>
          <p className="text-xl text-gray-300 mb-8">
            Upload your Gaussian Splat files or try our demo scenes. No installation required.
          </p>
          <Link
            to="/splat-viewer"
            className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white rounded-lg font-semibold text-lg transition-all transform hover:scale-105 shadow-lg hover:shadow-cyan-500/25"
          >
            <span className="material-symbols-outlined">view_in_ar</span>
            Launch 3D Viewer
          </Link>
        </motion.div>
      </section>

      <Footer />
    </div>
  );
};

export default SplatViewerLanding; 