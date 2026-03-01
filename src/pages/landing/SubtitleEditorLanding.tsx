import React, { useRef, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'framer-motion';
import Header from '../../components/Header';
import Footer from '../../components/Footer';

const SubtitleEditorLanding: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  const [typedText, setTypedText] = useState('');
  const fullText = 'Create perfect subtitles with AI';
  
  useEffect(() => {
    let currentIndex = 0;
    const interval = setInterval(() => {
      if (currentIndex <= fullText.length) {
        setTypedText(fullText.slice(0, currentIndex));
        currentIndex++;
      } else {
        clearInterval(interval);
        setTimeout(() => {
          currentIndex = 0;
          setTypedText('');
        }, 2000);
      }
    }, 100);
    return () => clearInterval(interval);
  }, []);

  const timelineY = useTransform(scrollYProgress, [0, 0.5], [0, -50]);
  const waveformScale = useTransform(scrollYProgress, [0, 0.3], [1, 1.1]);

  return (
    <div ref={containerRef} className="relative flex flex-col min-h-screen bg-gradient-to-b from-gray-950 via-orange-950/20 to-gray-950 overflow-x-hidden">
      <Header />
      
      {/* Hero Section with Animated Subtitle */}
      <section className="relative min-h-screen flex items-center justify-center px-6 py-20">
        {/* Background Effects */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute inset-0 opacity-30">
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-orange-500 rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-yellow-500 rounded-full blur-3xl animate-pulse delay-300" />
          </div>
        </div>

        <div className="relative z-10 text-center max-w-6xl mx-auto">
          <motion.h1 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-6xl md:text-8xl font-bold mb-6 bg-gradient-to-r from-orange-400 via-yellow-400 to-red-400 bg-clip-text text-transparent"
          >
            AI Subtitle Editor
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-xl md:text-2xl text-gray-300 mb-8 max-w-3xl mx-auto"
          >
            Transcribe, edit, and style subtitles with OpenAI Whisper - all in your browser
          </motion.p>

          {/* Animated Subtitle Preview */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="relative w-full max-w-4xl mx-auto h-64 mb-12 bg-gray-900/50 backdrop-blur-sm rounded-xl border border-orange-500/20 overflow-hidden"
          >
            {/* Video placeholder */}
            <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-900">
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="material-symbols-outlined text-6xl text-gray-700">play_circle</span>
              </div>
            </div>
            
            {/* Animated subtitle */}
            <div className="absolute bottom-8 left-0 right-0 flex justify-center">
              <motion.div
                animate={{
                  opacity: typedText.length > 0 ? 1 : 0,
                }}
                className="bg-black/80 backdrop-blur-sm px-6 py-3 rounded-lg"
              >
                <p className="text-white text-xl font-semibold">
                  {typedText}<span className="animate-pulse">|</span>
                </p>
              </motion.div>
            </div>
            
            {/* Waveform animation */}
            <motion.div
              style={{ scaleX: waveformScale }}
              className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-orange-500/20 to-transparent"
            >
              <svg viewBox="0 0 800 64" className="w-full h-full">
                {Array.from({ length: 100 }, (_, i) => {
                  const height = Math.random() * 40 + 10;
                  return (
                    <motion.rect
                      key={i}
                      x={i * 8}
                      y={32 - height / 2}
                      width="6"
                      height={height}
                      fill="url(#waveGradient)"
                      animate={{
                        height: [height, height * 1.5, height],
                        opacity: [0.5, 1, 0.5]
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        delay: i * 0.02,
                        ease: "easeInOut"
                      }}
                    />
                  );
                })}
                <defs>
                  <linearGradient id="waveGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#FB923C" stopOpacity="0.8" />
                    <stop offset="100%" stopColor="#FB923C" stopOpacity="0.2" />
                  </linearGradient>
                </defs>
              </svg>
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Link
              to="/subtitle"
              className="px-8 py-4 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white rounded-lg font-semibold text-lg transition-all transform hover:scale-105 shadow-lg hover:shadow-orange-500/25"
            >
              <span className="flex items-center gap-2">
                <span className="material-symbols-outlined">subtitles</span>
                Start Creating Subtitles
              </span>
            </Link>
            <button className="px-8 py-4 bg-gray-800 hover:bg-gray-700 text-white rounded-lg font-semibold text-lg transition-all border border-gray-700">
              Watch Demo
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
            className="text-4xl md:text-5xl font-bold text-center mb-16 bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent"
          >
            Professional Subtitle Tools
          </motion.h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: 'mic',
                title: 'AI Transcription',
                description: 'Powered by OpenAI Whisper for accurate speech-to-text in 100+ languages'
              },
              {
                icon: 'edit_note',
                title: 'Visual Editor',
                description: 'Timeline-based editing with waveform visualization and precise timing'
              },
              {
                icon: 'style',
                title: 'Custom Styling',
                description: 'Full control over fonts, colors, positions, and animations'
              },
              {
                icon: 'translate',
                title: 'Multi-Language',
                description: 'Automatic language detection and translation support'
              },
              {
                icon: 'timer',
                title: 'Auto-Sync',
                description: 'Smart timing adjustment and overlap detection'
              },
              {
                icon: 'download',
                title: 'Export Options',
                description: 'Export as SRT, VTT, or burn subtitles directly into video'
              }
            ].map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="bg-gray-900/50 backdrop-blur-sm p-8 rounded-xl border border-orange-500/20 hover:border-orange-500/40 transition-all"
              >
                <span className="material-symbols-outlined text-4xl text-orange-400 mb-4 block">
                  {feature.icon}
                </span>
                <h3 className="text-xl font-bold mb-3 text-white">{feature.title}</h3>
                <p className="text-gray-400">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Workflow Section */}
      <section className="py-20 px-6 bg-gradient-to-b from-transparent via-orange-950/10 to-transparent">
        <div className="max-w-6xl mx-auto">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-4xl md:text-5xl font-bold text-center mb-16 text-white"
          >
            Simple 3-Step Process
          </motion.h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: '1',
                title: 'Upload Video',
                description: 'Drop your video file or paste a YouTube link',
                icon: 'upload_file'
              },
              {
                step: '2',
                title: 'Auto-Transcribe',
                description: 'AI generates accurate subtitles in seconds',
                icon: 'auto_awesome'
              },
              {
                step: '3',
                title: 'Edit & Export',
                description: 'Fine-tune and download in your preferred format',
                icon: 'file_download'
              }
            ].map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.2 }}
                className="relative"
              >
                <div className="bg-gray-900/50 backdrop-blur-sm p-8 rounded-xl border border-orange-500/20 text-center">
                  <div className="w-16 h-16 bg-gradient-to-r from-orange-600 to-red-600 rounded-full flex items-center justify-center text-2xl font-bold text-white mx-auto mb-4">
                    {item.step}
                  </div>
                  <span className="material-symbols-outlined text-4xl text-orange-400 mb-4 block">
                    {item.icon}
                  </span>
                  <h3 className="text-xl font-bold mb-3 text-white">{item.title}</h3>
                  <p className="text-gray-400">{item.description}</p>
                </div>
                {index < 2 && (
                  <div className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2">
                    <span className="material-symbols-outlined text-4xl text-orange-500/50">arrow_forward</span>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-4xl md:text-5xl font-bold text-center mb-16 text-white"
          >
            Perfect For
          </motion.h2>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { title: 'Content Creators', icon: 'video_camera_front', color: 'from-orange-500 to-red-500' },
              { title: 'Educators', icon: 'school', color: 'from-yellow-500 to-orange-500' },
              { title: 'Marketers', icon: 'campaign', color: 'from-red-500 to-pink-500' },
              { title: 'Filmmakers', icon: 'movie', color: 'from-purple-500 to-red-500' },
              { title: 'Podcasters', icon: 'podcasts', color: 'from-green-500 to-yellow-500' },
              { title: 'Translators', icon: 'g_translate', color: 'from-blue-500 to-orange-500' },
              { title: 'Accessibility', icon: 'accessibility', color: 'from-pink-500 to-orange-500' },
              { title: 'Social Media', icon: 'share', color: 'from-orange-500 to-yellow-500' }
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
            className="bg-gradient-to-r from-orange-900/20 to-red-900/20 p-8 rounded-2xl backdrop-blur-sm border border-orange-500/20"
          >
            <h3 className="text-2xl font-bold mb-6 text-white">Technical Specifications</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold text-orange-400 mb-2">AI Model</h4>
                <p className="text-gray-300">OpenAI Whisper (Large-v3)</p>
              </div>
              <div>
                <h4 className="font-semibold text-orange-400 mb-2">Languages</h4>
                <p className="text-gray-300">100+ languages supported</p>
              </div>
              <div>
                <h4 className="font-semibold text-orange-400 mb-2">Video Formats</h4>
                <p className="text-gray-300">MP4, WebM, MOV, AVI, MKV</p>
              </div>
              <div>
                <h4 className="font-semibold text-orange-400 mb-2">Export Formats</h4>
                <p className="text-gray-300">SRT, VTT, ASS, Burned-in MP4</p>
              </div>
              <div>
                <h4 className="font-semibold text-orange-400 mb-2">Processing</h4>
                <p className="text-gray-300">100% client-side, no uploads</p>
              </div>
              <div>
                <h4 className="font-semibold text-orange-400 mb-2">Max Duration</h4>
                <p className="text-gray-300">Unlimited (device dependent)</p>
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
          <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent">
            Start Creating Professional Subtitles
          </h2>
          <p className="text-xl text-gray-300 mb-8">
            No registration, no watermarks, no limits. Your videos stay private on your device.
          </p>
          <Link
            to="/subtitle"
            className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white rounded-lg font-semibold text-lg transition-all transform hover:scale-105 shadow-lg hover:shadow-orange-500/25"
          >
            <span className="material-symbols-outlined">rocket_launch</span>
            Launch Subtitle Editor
          </Link>
        </motion.div>
      </section>

      <Footer />
    </div>
  );
};

export default SubtitleEditorLanding; 