import React, { useRef, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Header from '../components/Header';
import Footer from '../components/Footer';

const DoomPage: React.FC = () => {
  const gameContainerRef = useRef<HTMLDivElement>(null);
  const [gameState, setGameState] = useState<'menu' | 'loading' | 'playing'>('menu');
  const [progress, setProgress] = useState(0);
  const [isIframeLoaded, setIsIframeLoaded] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Detect mobile device
    const checkMobile = () => {
      setIsMobile(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    // Simulate initial loading progress
    if (gameState === 'loading' && !isIframeLoaded) {
      const interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 50) {
            clearInterval(interval);
            return 50; // Wait at 50% for iframe to load
          }
          return prev + Math.random() * 10;
        });
      }, 200);
      return () => clearInterval(interval);
    }
  }, [gameState, isIframeLoaded]);

  const handleStartGame = () => {
    setGameState('loading');
    setProgress(0);
    setIsIframeLoaded(false);
  };

  const handleIframeLoad = () => {
    setIsIframeLoaded(true);
    // Complete the loading progress
    const completeInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(completeInterval);
          setTimeout(() => setGameState('playing'), 500);
          return 100;
        }
        return prev + 10;
      });
    }, 100);
  };

  const handleFullscreen = () => {
    if (gameContainerRef.current) {
      const iframe = gameContainerRef.current.querySelector('iframe');
      if (iframe) {
        iframe.requestFullscreen().catch(err => {
          console.error(`Error attempting to enable full-screen mode: ${err.message}`);
        });
      }
    }
  };

  // Listen for messages from iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.action === 'exitDoom') {
        setGameState('menu');
        setIsIframeLoaded(false);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  return (
    <div className="relative flex size-full min-h-screen flex-col dark group/design-root overflow-x-hidden" style={{ backgroundColor: 'rgba(0, 0, 0, 0.95)' }}>
      <div className="layout-container flex h-full grow flex-col">
        <Header />
        
        <main className="px-6 md:px-10 lg:px-20 xl:px-40 flex flex-1 justify-center py-8 overflow-y-auto">
          <div className="layout-content-container flex flex-col items-center max-w-6xl flex-1 w-full">
            
            {/* Header Section */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center mb-8"
            >
              <h1 className="text-5xl md:text-6xl font-bold mb-4 text-white">
                DOOM Classic
              </h1>
              <p className="text-lg text-gray-300 max-w-2xl mx-auto">
                The legendary first-person shooter running in your browser via WebAssembly
              </p>
              {isMobile && (
                <p className="text-sm text-cyan-400 mt-2">
                  🎮 Mobile controls available!
                </p>
              )}
            </motion.div>

            {/* Game Container */}
            <div ref={gameContainerRef} className="w-full max-w-5xl">
              <div className="relative aspect-[16/10] bg-black rounded-lg overflow-hidden shadow-2xl border border-red-900/20">
                
                {/* Menu State */}
                {gameState === 'menu' && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-gray-900 to-black"
                  >
                    <div className="text-center">
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 200 }}
                        className="mb-8"
                      >
                        <div className="text-8xl font-bold text-red-600 mb-2" style={{ fontFamily: 'Impact, sans-serif' }}>
                          DOOM
                        </div>
                        <div className="text-xl text-gray-400">WebAssembly Edition</div>
                      </motion.div>
                      
                      <div className="space-y-4">
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={handleStartGame}
                          className="px-8 py-4 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold text-xl transition-all shadow-lg hover:shadow-red-600/50 w-64"
                        >
                          Start Game
                        </motion.button>
                      </div>
                      
                      <div className="mt-8 text-sm text-gray-500">
                        {isMobile ? (
                          <div className="space-y-1">
                            <p>📱 Touch controls enabled</p>
                            <p>Use on-screen D-pad and buttons</p>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <p>🖱️ Click game to capture mouse</p>
                            <p>Press F11 for fullscreen • Use WASD to move</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Loading State */}
                {gameState === 'loading' && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black z-10">
                    <div className="text-center">
                      <div className="text-4xl font-bold text-red-600 mb-8">Loading DOOM...</div>
                      <div className="w-64 h-4 bg-gray-800 rounded-full overflow-hidden mb-4">
                        <motion.div
                          className="h-full bg-gradient-to-r from-red-600 to-red-500"
                          initial={{ width: 0 }}
                          animate={{ width: `${progress}%` }}
                          transition={{ duration: 0.3 }}
                        />
                      </div>
                      <div className="text-gray-400">{Math.round(progress)}%</div>
                    </div>
                  </div>
                )}

                {/* Playing State - Enhanced DOOM */}
                {(gameState === 'playing' || gameState === 'loading') && (
                  <iframe
                    src="/doom/doom-game-enhanced.html"  // Using enhanced version
                    className={`w-full h-full border-0 ${gameState === 'loading' ? 'invisible' : 'visible'}`}
                    onLoad={handleIframeLoad}
                    allow="fullscreen; autoplay; gamepad; keyboard-lock; pointer-lock"
                    title="DOOM Game"
                  />
                )}

                {/* Game Controls Overlay */}
                <div className="absolute bottom-4 right-4 flex gap-2">
                  {gameState === 'playing' && !isMobile && (
                    <>
                      <button
                        onClick={() => {
                          setGameState('menu');
                          setIsIframeLoaded(false);
                        }}
                        className="px-4 py-2 bg-gray-800/80 hover:bg-gray-700/80 text-white rounded-lg text-sm backdrop-blur transition-all"
                      >
                        Exit Game
                      </button>
                      <button
                        onClick={handleFullscreen}
                        className="px-4 py-2 bg-gray-800/80 hover:bg-gray-700/80 text-white rounded-lg text-sm backdrop-blur transition-all flex items-center gap-2"
                      >
                        <span className="material-symbols-outlined text-lg">fullscreen</span>
                        Fullscreen
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Game Info */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6"
              >
                <div className="bg-gray-800/50 p-6 rounded-lg backdrop-blur">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="material-symbols-outlined text-red-500">speed</span>
                    <h3 className="font-bold text-white">Performance</h3>
                  </div>
                  <p className="text-sm text-gray-300">
                    WebAssembly powered for native-like performance directly in your browser
                  </p>
                </div>
                
                <div className="bg-gray-800/50 p-6 rounded-lg backdrop-blur">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="material-symbols-outlined text-green-500">phone_android</span>
                    <h3 className="font-bold text-white">Mobile Support</h3>
                  </div>
                  <p className="text-sm text-gray-300">
                    Full touch controls for mobile devices with on-screen D-pad and buttons
                  </p>
                </div>
                
                <div className="bg-gray-800/50 p-6 rounded-lg backdrop-blur">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="material-symbols-outlined text-blue-500">videogame_asset</span>
                    <h3 className="font-bold text-white">Enhanced Controls</h3>
                  </div>
                  <p className="text-sm text-gray-300">
                    Improved keyboard handling and mouse capture for better gameplay
                  </p>
                </div>
              </motion.div>

              {/* Controls Reference */}
              {gameState === 'playing' && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="mt-6 p-4 bg-gray-800/30 rounded-lg"
                >
                  <h3 className="font-bold text-white mb-2">Controls:</h3>
                  {isMobile ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-300">
                      <div>
                        <strong className="text-cyan-400">Movement:</strong> On-screen D-pad
                      </div>
                      <div>
                        <strong className="text-cyan-400">Look:</strong> Swipe on upper screen
                      </div>
                      <div>
                        <strong className="text-cyan-400">Fire:</strong> Red button (bottom right)
                      </div>
                      <div>
                        <strong className="text-cyan-400">Use/Open:</strong> USE button
                      </div>
                      <div>
                        <strong className="text-cyan-400">Run:</strong> RUN button
                      </div>
                      <div>
                        <strong className="text-cyan-400">Menu:</strong> ☰ button (top right)
                      </div>
                    </div>
                  ) : (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm text-gray-300">
                    <div><kbd className="px-2 py-1 bg-gray-700 rounded text-xs">W/A/S/D</kbd> Movement</div>
                    <div><kbd className="px-2 py-1 bg-gray-700 rounded text-xs">Mouse</kbd> Look/Aim</div>
                      <div><kbd className="px-2 py-1 bg-gray-700 rounded text-xs">Left Click</kbd> Fire</div>
                    <div><kbd className="px-2 py-1 bg-gray-700 rounded text-xs">E</kbd> Use/Open</div>
                    <div><kbd className="px-2 py-1 bg-gray-700 rounded text-xs">Shift</kbd> Run</div>
                    <div><kbd className="px-2 py-1 bg-gray-700 rounded text-xs">1-7</kbd> Weapons</div>
                    <div><kbd className="px-2 py-1 bg-gray-700 rounded text-xs">Tab</kbd> Map</div>
                    <div><kbd className="px-2 py-1 bg-gray-700 rounded text-xs">Esc</kbd> Menu</div>
                  </div>
                  )}
                </motion.div>
              )}

              {/* Tips */}
              <div className="mt-6 p-4 bg-yellow-900/20 border border-yellow-700/30 rounded-lg">
                <p className="text-sm text-yellow-200">
                  <strong>💡 Tips:</strong> 
                  {isMobile ? (
                    " For best experience on mobile, use landscape orientation and enable fullscreen mode."
                  ) : (
                    " Click on the game area to capture your mouse for better control. Press Esc to release."
                  )}
                </p>
              </div>
            </div>

          </div>
        </main>
        
        <Footer />
      </div>
    </div>
  );
};

export default DoomPage; 