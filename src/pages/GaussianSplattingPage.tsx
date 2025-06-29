import React, { useState } from 'react';
import { motion } from 'framer-motion';
import Header from '../components/Header';
import Footer from '../components/Footer';

const GaussianSplattingPage: React.FC = () => {
  const [_sceneLoaded, _setSceneLoaded] = useState(false);

  return (
    <div className="relative flex min-h-screen flex-col bg-gray-950 text-white overflow-hidden">
      <Header />
      <main className="flex-1 relative z-10">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <motion.div
            className="text-center mb-8"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h1 className="text-5xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-indigo-400 via-purple-400 to-indigo-400 bg-clip-text text-transparent">
              Gaussian Splatting Viewer
            </h1>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto">
              Real-time 3D Gaussian Splatting powered by WebGPU acceleration
            </p>
          </motion.div>
          
          <div className="text-center">
            <p className="text-gray-400">Coming soon - WebGPU Gaussian Splatting implementation</p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default GaussianSplattingPage; 