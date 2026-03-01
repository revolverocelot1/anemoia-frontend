import React, { useRef, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Header from '../components/Header';
import Footer from '../components/Footer';

// Pixel Art Doom Guy Component
const DoomGuyPixelArt: React.FC = () => {
  const [frame, setFrame] = useState(0);
  const [isWalking, setIsWalking] = useState(true);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setFrame(prev => (prev + 1) % 4);
    }, 200);
    return () => clearInterval(interval);
  }, []);
  
  // Toggle walking animation every 3 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setIsWalking(prev => !prev);
    }, 3000);
    return () => clearInterval(interval);
  }, []);
  
  const pixelSize = 3;
  
  // Doom Guy pixel art frames (simplified representation)
  const doomGuyFrames = [
    // Frame 1 - Standing/Walking Frame 1
    [
      [0,0,0,0,1,1,1,1,0,0,0,0],
      [0,0,0,1,2,2,2,2,1,0,0,0],
      [0,0,0,1,2,3,3,2,1,0,0,0],
      [0,0,0,1,2,2,2,2,1,0,0,0],
      [0,0,1,4,4,4,4,4,4,1,0,0],
      [0,1,4,4,5,4,4,5,4,4,1,0],
      [0,1,4,4,4,4,4,4,4,4,1,0],
      [0,1,4,4,4,6,6,4,4,4,1,0],
      [0,0,1,4,4,4,4,4,4,1,0,0],
      [0,0,1,7,7,7,7,7,7,1,0,0],
      [0,1,7,7,7,7,7,7,7,7,1,0],
      [0,1,2,7,7,7,7,7,7,2,1,0],
      [0,1,2,2,7,7,7,7,2,2,1,0],
      [0,0,1,2,7,7,7,7,2,1,0,0],
      [0,0,1,8,8,0,0,8,8,1,0,0],
      [0,0,1,8,8,0,0,8,8,1,0,0],
    ],
    // Frame 2 - Walking Frame 2
    [
      [0,0,0,0,1,1,1,1,0,0,0,0],
      [0,0,0,1,2,2,2,2,1,0,0,0],
      [0,0,0,1,2,3,3,2,1,0,0,0],
      [0,0,0,1,2,2,2,2,1,0,0,0],
      [0,0,1,4,4,4,4,4,4,1,0,0],
      [0,1,4,4,5,4,4,5,4,4,1,0],
      [0,1,4,4,4,4,4,4,4,4,1,0],
      [0,1,4,4,4,6,6,4,4,4,1,0],
      [0,0,1,4,4,4,4,4,4,1,0,0],
      [0,0,1,7,7,7,7,7,7,1,0,0],
      [0,1,7,7,7,7,7,7,7,7,1,0],
      [1,2,7,7,7,7,7,7,7,2,1,0],
      [1,2,2,7,7,7,7,7,2,1,0,0],
      [0,1,2,7,7,7,7,2,1,0,0,0],
      [0,1,8,8,0,0,8,8,1,0,0,0],
      [0,1,8,8,0,0,1,8,8,1,0,0],
    ],
    // Frame 3 - Walking Frame 3
    [
      [0,0,0,0,1,1,1,1,0,0,0,0],
      [0,0,0,1,2,2,2,2,1,0,0,0],
      [0,0,0,1,2,3,3,2,1,0,0,0],
      [0,0,0,1,2,2,2,2,1,0,0,0],
      [0,0,1,4,4,4,4,4,4,1,0,0],
      [0,1,4,4,5,4,4,5,4,4,1,0],
      [0,1,4,4,4,4,4,4,4,4,1,0],
      [0,1,4,4,4,6,6,4,4,4,1,0],
      [0,0,1,4,4,4,4,4,4,1,0,0],
      [0,0,1,7,7,7,7,7,7,1,0,0],
      [0,1,7,7,7,7,7,7,7,7,1,0],
      [0,1,2,7,7,7,7,7,7,2,1,0],
      [0,0,1,2,7,7,7,7,2,2,1,0],
      [0,0,0,1,2,7,7,2,2,1,0,0],
      [0,0,0,1,8,8,8,8,1,0,0,0],
      [0,0,1,8,8,1,1,8,8,1,0,0],
    ],
    // Frame 4 - Shooting
    [
      [0,0,0,0,1,1,1,1,0,0,0,0],
      [0,0,0,1,2,2,2,2,1,0,0,0],
      [0,0,0,1,2,3,3,2,1,0,0,0],
      [0,0,0,1,2,2,2,2,1,0,0,0],
      [0,0,1,4,4,4,4,4,4,1,0,0],
      [0,1,4,4,5,4,4,5,4,4,1,9],
      [1,4,4,4,4,4,4,4,4,4,1,9],
      [1,4,4,4,4,6,6,4,4,4,1,9],
      [0,1,4,4,4,4,4,4,4,1,0,0],
      [0,0,1,7,7,7,7,7,7,1,0,0],
      [0,1,7,7,7,7,7,7,7,7,1,0],
      [0,1,2,7,7,7,7,7,7,2,1,0],
      [0,1,2,2,7,7,7,7,2,2,1,0],
      [0,0,1,2,7,7,7,7,2,1,0,0],
      [0,0,1,8,8,0,0,8,8,1,0,0],
      [0,0,1,8,8,0,0,8,8,1,0,0],
    ]
  ];
  
  const colorMap: { [key: number]: string } = {
    0: 'transparent',
    1: '#000000',     // Black outline
    2: '#8B4513',     // Brown (hair)
    3: '#FFB6C1',     // Light pink (face)
    4: '#228B22',     // Green (armor)
    5: '#FF0000',     // Red (eyes/details)
    6: '#FFD700',     // Gold (belt)
    7: '#696969',     // Gray (pants)
    8: '#4B0082',     // Dark purple (boots)
    9: '#FFA500',     // Orange (muzzle flash)
  };
  
  const currentFrame = isWalking ? doomGuyFrames[frame % 3] : doomGuyFrames[3];
  
  return (
    <motion.div
      className="relative"
      animate={{ 
        x: isWalking ? [0, 100, 0] : 0,
        scaleX: isWalking && frame === 2 ? -1 : 1
      }}
      transition={{ 
        x: { duration: 3, ease: "linear" },
        scaleX: { duration: 0.2 }
      }}
    >
      <div className="grid" style={{ 
        gridTemplateColumns: `repeat(12, ${pixelSize}px)`,
        gap: 0,
        filter: 'drop-shadow(0 0 10px rgba(255, 0, 0, 0.5))'
      }}>
        {currentFrame.map((row, y) => 
          row.map((pixel, x) => (
            <motion.div
              key={`${x}-${y}`}
              style={{
                width: pixelSize,
                height: pixelSize,
                backgroundColor: colorMap[pixel],
              }}
              animate={{
                opacity: pixel === 9 ? [0, 1, 0] : 1,
              }}
              transition={{
                opacity: { duration: 0.1, repeat: Infinity }
              }}
            />
          ))
        )}
      </div>
      
      {/* Health bar */}
      <div className="absolute -bottom-4 left-0 right-0 flex justify-center">
        <div className="bg-gray-800 p-1 rounded" style={{ width: '36px' }}>
          <div className="bg-red-600 h-1 rounded" style={{ width: '100%' }} />
        </div>
      </div>
    </motion.div>
  );
};

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
      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {/* Animated fire particles */}
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 bg-red-500 rounded-full"
            style={{ 
              left: `${Math.random() * 100}%`,
              filter: 'blur(2px)',
              boxShadow: '0 0 10px rgba(255, 0, 0, 0.8)'
            }}
            animate={{
              y: [-20, -100],
              opacity: [0, 1, 0],
              scale: [0.5, 1.5, 0.5]
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 3,
              ease: "easeOut"
            }}
          />
        ))}
        
        {/* Doom logo background pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: `repeating-linear-gradient(
              45deg,
              transparent,
              transparent 35px,
              rgba(255, 0, 0, 0.1) 35px,
              rgba(255, 0, 0, 0.1) 70px
            )`
          }} />
        </div>
      </div>
      
      <div className="layout-container flex h-full grow flex-col relative z-10">
        <Header />
        
        <main className="px-6 md:px-10 lg:px-20 xl:px-40 flex flex-1 justify-center py-8 overflow-y-auto">
          <div className="layout-content-container flex flex-col items-center max-w-6xl flex-1 w-full">
            
            {/* Header Section */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center mb-8 relative"
            >
              <motion.h1 
                className="text-5xl md:text-6xl font-bold mb-4 text-white relative inline-block"
                animate={{
                  textShadow: [
                    "0 0 20px rgba(255, 0, 0, 0.8)",
                    "0 0 40px rgba(255, 0, 0, 1)",
                    "0 0 20px rgba(255, 0, 0, 0.8)"
                  ]
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              >
                DOOM Classic
              </motion.h1>
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
                        className="mb-8 relative"
                      >
                        {/* Animated Doom Guy */}
                        <div className="absolute -left-20 top-1/2 -translate-y-1/2">
                          <DoomGuyPixelArt />
                        </div>
                        
                        <div className="text-8xl font-bold text-red-600 mb-2" style={{ fontFamily: 'Impact, sans-serif' }}>
                          DOOM
                        </div>
                        <div className="text-xl text-gray-400">WebAssembly Edition</div>
                        
                        {/* Animated Doom Guy on right side */}
                        <div className="absolute -right-20 top-1/2 -translate-y-1/2 scale-x-[-1]">
                          <DoomGuyPixelArt />
                        </div>
                      </motion.div>
                      
                      <div className="space-y-4">
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={handleStartGame}
                          className="px-8 py-4 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold text-xl transition-all shadow-lg hover:shadow-red-600/50 w-64 relative overflow-hidden"
                        >
                          <motion.span
                            className="relative z-10"
                          >
                            Start Game
                          </motion.span>
                          <motion.div
                            className="absolute inset-0 bg-gradient-to-r from-red-700 to-red-500"
                            animate={{
                              x: ["-100%", "100%"]
                            }}
                            transition={{
                              duration: 2,
                              repeat: Infinity,
                              ease: "linear"
                            }}
                            style={{
                              maskImage: "linear-gradient(to right, transparent, black, transparent)",
                              WebkitMaskImage: "linear-gradient(to right, transparent, black, transparent)"
                            }}
                          />
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
                      <motion.div 
                        className="text-4xl font-bold text-red-600 mb-8"
                        animate={{
                          opacity: [1, 0.5, 1]
                        }}
                        transition={{
                          duration: 1,
                          repeat: Infinity
                        }}
                      >
                        Loading DOOM...
                      </motion.div>
                      
                      {/* Doom Guy running animation during loading */}
                      <div className="mb-8">
                        <DoomGuyPixelArt />
                      </div>
                      
                      <div className="w-64 h-4 bg-gray-800 rounded-full overflow-hidden mb-4 relative">
                        <motion.div
                          className="h-full bg-gradient-to-r from-red-600 to-red-500"
                          initial={{ width: 0 }}
                          animate={{ width: `${progress}%` }}
                          transition={{ duration: 0.3 }}
                        />
                        {/* Animated glow effect */}
                        <motion.div
                          className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30"
                          animate={{
                            x: ["-100%", "200%"]
                          }}
                          transition={{
                            duration: 1.5,
                            repeat: Infinity,
                            ease: "linear"
                          }}
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
                <motion.div 
                  whileHover={{ scale: 1.05 }}
                  className="bg-gray-800/50 p-6 rounded-lg backdrop-blur border border-red-900/20 hover:border-red-600/50 transition-all"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <span className="material-symbols-outlined text-red-500">speed</span>
                    <h3 className="font-bold text-white">Performance</h3>
                  </div>
                  <p className="text-sm text-gray-300">
                    WebAssembly powered for native-like performance directly in your browser
                  </p>
                </motion.div>
                
                <motion.div 
                  whileHover={{ scale: 1.05 }}
                  className="bg-gray-800/50 p-6 rounded-lg backdrop-blur border border-green-900/20 hover:border-green-600/50 transition-all"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <span className="material-symbols-outlined text-green-500">phone_android</span>
                    <h3 className="font-bold text-white">Mobile Support</h3>
                  </div>
                  <p className="text-sm text-gray-300">
                    Full touch controls for mobile devices with on-screen D-pad and buttons
                  </p>
                </motion.div>
                
                <motion.div 
                  whileHover={{ scale: 1.05 }}
                  className="bg-gray-800/50 p-6 rounded-lg backdrop-blur border border-blue-900/20 hover:border-blue-600/50 transition-all"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <span className="material-symbols-outlined text-blue-500">videogame_asset</span>
                    <h3 className="font-bold text-white">Enhanced Controls</h3>
                  </div>
                  <p className="text-sm text-gray-300">
                    Improved keyboard handling and mouse capture for better gameplay
                  </p>
                </motion.div>
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