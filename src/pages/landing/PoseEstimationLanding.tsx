import React, { useRef, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform, useSpring } from 'framer-motion';
import Header from '../../components/Header';
import Footer from '../../components/Footer';

const PoseEstimationLanding: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const springConfig = { damping: 25, stiffness: 100 };
  const mouseX = useSpring(0, springConfig);
  const mouseY = useSpring(0, springConfig);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const { clientX, clientY } = e;
      const { innerWidth, innerHeight } = window;
      const x = (clientX / innerWidth - 0.5) * 2;
      const y = (clientY / innerHeight - 0.5) * 2;
      mouseX.set(x);
      mouseY.set(y);
      setMousePosition({ x: clientX, y: clientY });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [mouseX, mouseY]);

  const pose1Y = useTransform(scrollYProgress, [0, 0.5], [0, -100]);
  const pose2Y = useTransform(scrollYProgress, [0, 0.5], [0, 100]);
  const pose3Y = useTransform(scrollYProgress, [0.2, 0.7], [100, -50]);

  return (
    <div ref={containerRef} className="relative flex flex-col min-h-screen bg-gradient-to-b from-gray-950 via-purple-950/20 to-gray-950 overflow-x-hidden">
      <Header />
      
      {/* Hero Section with Animated Skeleton */}
      <section className="relative min-h-screen flex items-center justify-center px-6 py-20">
        {/* Background Effects */}
        <div className="absolute inset-0 overflow-hidden">
          <motion.div
            style={{ x: mouseX, y: mouseY }}
            className="absolute inset-0 opacity-30"
          >
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500 rounded-full blur-3xl" />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500 rounded-full blur-3xl" />
          </motion.div>
        </div>

        <div className="relative z-10 text-center max-w-6xl mx-auto">
          <motion.h1 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-6xl md:text-8xl font-bold mb-6 bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent"
          >
            AI Pose Detection
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-xl md:text-2xl text-gray-300 mb-8 max-w-3xl mx-auto"
          >
            Track 17 key body points in real-time with advanced MoveNet AI - no server needed
          </motion.p>

          {/* Animated Skeleton Visualization */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="relative w-full max-w-2xl mx-auto h-96 mb-12"
          >
            <svg viewBox="0 0 500 400" className="w-full h-full">
              {/* Animated pose skeleton */}
              <motion.g
                animate={{
                  rotate: [0, 5, -5, 0],
                }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              >
                {/* Head */}
                <motion.circle
                  cx="250" cy="80"
                  r="25"
                  fill="none"
                  stroke="url(#poseGradient)"
                  strokeWidth="3"
                  animate={{
                    r: [25, 28, 25],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                />
                
                {/* Spine */}
                <motion.line
                  x1="250" y1="105"
                  x2="250" y2="200"
                  stroke="url(#poseGradient)"
                  strokeWidth="3"
                />
                
                {/* Arms */}
                <motion.path
                  d="M 250 120 L 200 150 L 180 200"
                  fill="none"
                  stroke="url(#poseGradient)"
                  strokeWidth="3"
                  animate={{
                    d: [
                      "M 250 120 L 200 150 L 180 200",
                      "M 250 120 L 190 140 L 160 180",
                      "M 250 120 L 200 150 L 180 200"
                    ]
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                />
                <motion.path
                  d="M 250 120 L 300 150 L 320 200"
                  fill="none"
                  stroke="url(#poseGradient)"
                  strokeWidth="3"
                  animate={{
                    d: [
                      "M 250 120 L 300 150 L 320 200",
                      "M 250 120 L 310 140 L 340 180",
                      "M 250 120 L 300 150 L 320 200"
                    ]
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 0.5
                  }}
                />
                
                {/* Legs */}
                <motion.path
                  d="M 250 200 L 220 260 L 210 320"
                  fill="none"
                  stroke="url(#poseGradient)"
                  strokeWidth="3"
                />
                <motion.path
                  d="M 250 200 L 280 260 L 290 320"
                  fill="none"
                  stroke="url(#poseGradient)"
                  strokeWidth="3"
                />
                
                {/* Joint circles */}
                {[
                  { cx: 200, cy: 150 }, { cx: 300, cy: 150 }, // Shoulders
                  { cx: 180, cy: 200 }, { cx: 320, cy: 200 }, // Elbows
                  { cx: 220, cy: 260 }, { cx: 280, cy: 260 }, // Knees
                  { cx: 210, cy: 320 }, { cx: 290, cy: 320 }, // Ankles
                ].map((joint, index) => (
                  <motion.circle
                    key={index}
                    cx={joint.cx}
                    cy={joint.cy}
                    r="8"
                    fill="url(#poseGradient)"
                    animate={{
                      scale: [1, 1.2, 1],
                      opacity: [0.8, 1, 0.8]
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      delay: index * 0.1,
                      ease: "easeInOut"
                    }}
                  />
                ))}
              </motion.g>
              
              <defs>
                <linearGradient id="poseGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#8B5CF6" />
                  <stop offset="50%" stopColor="#EC4899" />
                  <stop offset="100%" stopColor="#3B82F6" />
                </linearGradient>
              </defs>
            </svg>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Link
              to="/pose-estimation"
              className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg font-semibold text-lg transition-all transform hover:scale-105 shadow-lg hover:shadow-purple-500/25"
            >
              <span className="flex items-center gap-2">
                <span className="material-symbols-outlined">accessibility_new</span>
                Try Pose Detection
              </span>
            </Link>
            <button className="px-8 py-4 bg-gray-800 hover:bg-gray-700 text-white rounded-lg font-semibold text-lg transition-all border border-gray-700">
              View Documentation
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
            className="text-4xl md:text-5xl font-bold text-center mb-16 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent"
          >
            Advanced Pose Tracking
          </motion.h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: 'speed',
                title: 'Real-Time Processing',
                description: 'Lightning-fast pose detection at 30+ FPS using GPU acceleration'
              },
              {
                icon: 'visibility',
                title: '17 Key Points',
                description: 'Track nose, eyes, shoulders, elbows, wrists, hips, knees, and ankles'
              },
              {
                icon: 'lock',
                title: 'Privacy First',
                description: 'All processing happens locally - your data never leaves your device'
              },
              {
                icon: 'videocam',
                title: 'Live Camera',
                description: 'Real-time pose detection from webcam or uploaded videos'
              },
              {
                icon: 'analytics',
                title: 'Confidence Scores',
                description: 'Get accuracy metrics for each detected keypoint'
              },
              {
                icon: 'download',
                title: 'Export Results',
                description: 'Save pose data as JSON or overlay on video'
              }
            ].map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="bg-gray-900/50 backdrop-blur-sm p-8 rounded-xl border border-purple-500/20 hover:border-purple-500/40 transition-all"
              >
                <span className="material-symbols-outlined text-4xl text-purple-400 mb-4 block">
                  {feature.icon}
                </span>
                <h3 className="text-xl font-bold mb-3 text-white">{feature.title}</h3>
                <p className="text-gray-400">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="py-20 px-6 bg-gradient-to-b from-transparent via-purple-950/10 to-transparent">
        <div className="max-w-6xl mx-auto">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-4xl md:text-5xl font-bold text-center mb-16 text-white"
          >
            Perfect For
          </motion.h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { title: 'Fitness Apps', icon: 'fitness_center', color: 'from-purple-500 to-pink-500' },
              { title: 'Motion Analysis', icon: 'sports_martial_arts', color: 'from-blue-500 to-purple-500' },
              { title: 'Game Development', icon: 'sports_esports', color: 'from-pink-500 to-orange-500' },
              { title: 'Healthcare', icon: 'medical_services', color: 'from-green-500 to-blue-500' },
              { title: 'Dance Training', icon: 'music_note', color: 'from-yellow-500 to-pink-500' },
              { title: 'Sports Coaching', icon: 'sports', color: 'from-red-500 to-purple-500' },
              { title: 'AR Filters', icon: 'camera', color: 'from-purple-500 to-blue-500' },
              { title: 'Research', icon: 'science', color: 'from-cyan-500 to-purple-500' }
            ].map((useCase, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ y: -5 }}
                className={`p-6 rounded-xl bg-gradient-to-br ${useCase.color} p-[1px]`}
              >
                <div className="bg-gray-950 h-full rounded-xl p-6 text-center">
                  <span className="material-symbols-outlined text-4xl text-white mb-3 block">
                    {useCase.icon}
                  </span>
                  <p className="text-white font-semibold">{useCase.title}</p>
                </div>
              </motion.div>
            ))}
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
            className="bg-gradient-to-r from-purple-900/20 to-pink-900/20 p-8 rounded-2xl backdrop-blur-sm border border-purple-500/20"
          >
            <h3 className="text-2xl font-bold mb-6 text-white">Technical Specifications</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold text-purple-400 mb-2">Model</h4>
                <p className="text-gray-300">MoveNet Thunder (High Accuracy)</p>
              </div>
              <div>
                <h4 className="font-semibold text-purple-400 mb-2">Framework</h4>
                <p className="text-gray-300">TensorFlow.js with WebGL backend</p>
              </div>
              <div>
                <h4 className="font-semibold text-purple-400 mb-2">Input Resolution</h4>
                <p className="text-gray-300">256x256 pixels (auto-scaled)</p>
              </div>
              <div>
                <h4 className="font-semibold text-purple-400 mb-2">Output Format</h4>
                <p className="text-gray-300">17 keypoints with (x, y, confidence)</p>
              </div>
              <div>
                <h4 className="font-semibold text-purple-400 mb-2">Performance</h4>
                <p className="text-gray-300">30-60 FPS on modern GPUs</p>
              </div>
              <div>
                <h4 className="font-semibold text-purple-400 mb-2">Browser Support</h4>
                <p className="text-gray-300">Chrome, Firefox, Safari, Edge</p>
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
          <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            Start Tracking Motion Today
          </h2>
          <p className="text-xl text-gray-300 mb-8">
            No installation, no signup, no server uploads. Just pure AI pose detection in your browser.
          </p>
          <Link
            to="/pose-estimation"
            className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg font-semibold text-lg transition-all transform hover:scale-105 shadow-lg hover:shadow-purple-500/25"
          >
            <span className="material-symbols-outlined">rocket_launch</span>
            Launch Pose Detector
          </Link>
        </motion.div>
      </section>

      <Footer />
    </div>
  );
};

export default PoseEstimationLanding; 