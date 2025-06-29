import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import Header from '../components/Header';
import Footer from '../components/Footer';

const DoomPage: React.FC = () => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const gameContainerRef = useRef<HTMLDivElement>(null);

  const handleFullscreen = async () => {
    if (!gameContainerRef.current) return;

    try {
      // Use the browser's native Fullscreen API
      if (gameContainerRef.current.requestFullscreen) {
        await gameContainerRef.current.requestFullscreen();
      } else if ((gameContainerRef.current as any).webkitRequestFullscreen) {
        await (gameContainerRef.current as any).webkitRequestFullscreen();
      } else if ((gameContainerRef.current as any).msRequestFullscreen) {
        await (gameContainerRef.current as any).msRequestFullscreen();
      }
    } catch (error) {
      console.warn('Fullscreen request failed:', error);
    }
  };

  const exitFullscreen = async () => {
    try {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
      } else if ((document as any).webkitExitFullscreen) {
        await (document as any).webkitExitFullscreen();
      } else if ((document as any).msExitFullscreen) {
        await (document as any).msExitFullscreen();
      }
    } catch (error) {
      console.warn('Exit fullscreen failed:', error);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).msFullscreenElement
      );
      setIsFullscreen(isCurrentlyFullscreen);
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        exitFullscreen();
      }
    };

    // Listen for fullscreen changes
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('msfullscreenchange', handleFullscreenChange);
    
    // Listen for escape key
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('msfullscreenchange', handleFullscreenChange);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isFullscreen]);

  if (isFullscreen) {
    return (
      <div className="w-full h-full bg-black flex flex-col">
        {/* Minimal fullscreen header */}
        <div className="bg-gray-900 text-white p-2 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-6 h-6 bg-red-600 rounded flex items-center justify-center">
              <span className="material-symbols-outlined text-white text-sm">videogame_asset</span>
            </div>
            <span className="text-sm font-medium">DOOM Classic</span>
            <span className="text-xs text-gray-400">Press ESC or click X to exit fullscreen</span>
          </div>
          <button
            onClick={exitFullscreen}
            className="p-1 bg-gray-800 hover:bg-gray-700 rounded transition-colors"
          >
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>

        {/* Game takes remaining space */}
        <div className="flex-1 w-full h-full">
          <iframe
            src="https://ustymukhman.github.io/webDOOM/public/"
            className="w-full h-full border-none"
            title="DOOM Classic"
            allow="gamepad; midi; encrypted-media; fullscreen"
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex size-full min-h-screen flex-col dark group/design-root overflow-x-hidden">
      <div className="layout-container flex h-full grow flex-col">
        <Header />
        
        <main className="px-6 md:px-10 lg:px-20 xl:px-40 flex flex-1 justify-center py-8 overflow-y-auto">
          <div className="layout-content-container flex flex-col items-center max-w-6xl flex-1 w-full">
            
            {/* Header Section */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center mb-12"
            >
              <div className="flex items-center justify-center space-x-4 mb-6">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                  className="w-20 h-20 bg-gradient-to-r from-red-600 to-red-800 rounded-2xl flex items-center justify-center shadow-xl"
                >
                  <span className="material-symbols-outlined text-white text-4xl">videogame_asset</span>
                </motion.div>
              </div>
              
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4 tracking-tighter">
                DOOM Classic
              </h1>
              <p className="text-lg md:text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
                Experience the legendary first-person shooter that defined a genre. 
                Powered by WebAssembly technology for authentic gameplay directly in your browser.
              </p>
            </motion.div>

            {/* Game Interface */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
              className="w-full max-w-6xl"
            >
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-red-600 rounded-xl flex items-center justify-center shadow-lg">
                      <span className="material-symbols-outlined text-white text-2xl">videogame_asset</span>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                        DOOM Classic WebAssembly Edition
                      </h3>
                      <p className="text-gray-600 dark:text-gray-300">Ready to play • No downloads required</p>
                    </div>
                  </div>
                  <div className="flex space-x-3">
                    <motion.button
                      onClick={handleFullscreen}
                      className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold transition-colors flex items-center space-x-2 shadow-lg hover:shadow-xl"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <span className="material-symbols-outlined text-lg">fullscreen</span>
                      <span>Play Fullscreen</span>
                    </motion.button>
                  </div>
                </div>
                
                <div ref={gameContainerRef} className="aspect-video bg-black">
                  <iframe
                    src="https://ustymukhman.github.io/webDOOM/public/"
                    className="w-full h-full"
                    title="DOOM Classic"
                    allow="gamepad; midi; encrypted-media; fullscreen"
                    sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
                  />
                </div>

                {/* Game Info Footer */}
                <div className="p-6 bg-gray-50 dark:bg-gray-900/50">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="text-center">
                      <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center mx-auto mb-3">
                        <span className="material-symbols-outlined text-white">speed</span>
                      </div>
                      <h4 className="font-bold text-gray-900 dark:text-white mb-2">Instant Play</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-300">No downloads or installation required</p>
                    </div>
                    
                    <div className="text-center">
                      <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center mx-auto mb-3">
                        <span className="material-symbols-outlined text-white">security</span>
                      </div>
                      <h4 className="font-bold text-gray-900 dark:text-white mb-2">Safe & Secure</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-300">Runs in browser sandbox for security</p>
                    </div>
                    
                    <div className="text-center">
                      <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center mx-auto mb-3">
                        <span className="material-symbols-outlined text-white">devices</span>
                      </div>
                      <h4 className="font-bold text-gray-900 dark:text-white mb-2">Cross-Platform</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-300">Works on desktop, tablet, and mobile</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* About Section */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="mt-16 w-full max-w-4xl"
            >
              <div className="bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/10 dark:to-orange-900/10 rounded-2xl p-8 border border-red-100 dark:border-red-800/20">
                <div className="text-center">
                  <h3 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">About DOOM</h3>
                  <p className="text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
                    Released in 1993, DOOM revolutionized the gaming industry and popularized the first-person shooter genre. 
                    This WebAssembly port allows you to experience this classic game directly in your browser with no downloads required.
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                    <div className="text-left">
                      <h4 className="font-bold mb-3 text-gray-900 dark:text-white flex items-center">
                        <span className="material-symbols-outlined text-red-500 mr-2">gamepad</span>
                        Controls
                      </h4>
                      <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                        <li><strong>WASD</strong> - Move around</li>
                        <li><strong>Mouse</strong> - Look and aim</li>
                        <li><strong>Left Click</strong> - Shoot</li>
                        <li><strong>Space</strong> - Open doors/activate</li>
                        <li><strong>Shift</strong> - Run</li>
                      </ul>
                    </div>
                    
                    <div className="text-left">
                      <h4 className="font-bold mb-3 text-gray-900 dark:text-white flex items-center">
                        <span className="material-symbols-outlined text-red-500 mr-2">settings</span>
                        Features
                      </h4>
                      <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                        <li>• Classic DOOM gameplay</li>
                        <li>• Original graphics and sound</li>
                        <li>• Save game functionality</li>
                        <li>• Configurable controls</li>
                        <li>• Multiple difficulty levels</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

          </div>
        </main>
        
        <Footer />
      </div>
    </div>
  );
};

export default DoomPage; 