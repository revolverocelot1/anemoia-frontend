import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Header from '../components/Header';
import Footer from '../components/Footer';

interface DoomOption {
  id: string;
  name: string;
  description: string;
  url: string;
  features: string[];
  icon: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Expert';
}

const DoomPage: React.FC = () => {
  const [selectedGame, setSelectedGame] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const doomOptions: DoomOption[] = [
    {
      id: 'webdoom',
      name: 'webDOOM Classic',
      description: 'The authentic DOOM experience compiled with WebAssembly for modern browsers.',
      url: 'https://ustymukhman.github.io/webDOOM/public/',
      features: [
        'Classic DOOM gameplay',
        'Original graphics and sound',
        'Fast loading times',
        'Authentic retro experience',
        'Mobile-friendly controls'
      ],
      icon: 'play_arrow',
      difficulty: 'Beginner'
    },
    {
      id: 'dwasm',
      name: 'Dwasm Enhanced',
      description: 'Enhanced DOOM port with modern improvements and advanced features.',
      url: 'https://dwasm.m-h.org.uk/',
      features: [
        'Widescreen aspect ratios',
        'Custom resolutions above 320x200',
        'Frame rates above 35FPS',
        'Texture upscaling',
        'Realtime MIDI synthesis',
        'WebGL acceleration',
        'Multiple HUD options'
      ],
      icon: 'enhanced_encryption',
      difficulty: 'Intermediate'
    }
  ];

  const handleGameSelect = (gameId: string) => {
    setSelectedGame(gameId);
  };

  const handleFullscreen = () => {
    setIsFullscreen(true);
  };

  const exitFullscreen = () => {
    setIsFullscreen(false);
    setSelectedGame(null);
  };

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        exitFullscreen();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isFullscreen]);

  if (isFullscreen && selectedGame) {
    const game = doomOptions.find(g => g.id === selectedGame);
    return (
      <div className="fixed inset-0 bg-black z-50 flex flex-col">
        {/* Fullscreen Header */}
        <div className="bg-gray-900 text-white p-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center">
              <span className="material-symbols-outlined text-white text-lg">videogame_asset</span>
            </div>
            <div>
              <h1 className="font-bold">{game?.name}</h1>
              <p className="text-sm text-gray-300">Press ESC to exit fullscreen</p>
            </div>
          </div>
          <button
            onClick={exitFullscreen}
            className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Game Frame */}
        <div className="flex-1">
          <iframe
            src={game?.url}
            className="w-full h-full border-none"
            title={game?.name}
            allow="gamepad; midi; encrypted-media;"
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
                Experience the legendary first-person shooter that defined a genre. Choose your preferred version and dive into the action—all powered by WebAssembly technology.
              </p>
            </motion.div>

            {/* Game Selection */}
            {!selectedGame && (
              <motion.div
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="w-full max-w-4xl"
              >
                <h2 className="text-2xl font-bold text-center mb-8">Choose Your DOOM Experience</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {doomOptions.map((game, index) => (
                    <motion.div
                      key={game.id}
                      initial={{ opacity: 0, x: index % 2 === 0 ? -40 : 40 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.4 + index * 0.1 }}
                      className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-xl border border-gray-200 dark:border-gray-700 hover:border-red-500 dark:hover:border-red-400 transition-all duration-300 cursor-pointer group"
                      onClick={() => handleGameSelect(game.id)}
                      whileHover={{ scale: 1.02, y: -5 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div className="flex items-center space-x-4 mb-6">
                        <div className="w-16 h-16 bg-red-600 rounded-xl flex items-center justify-center group-hover:bg-red-700 transition-colors">
                          <span className="material-symbols-outlined text-white text-2xl">{game.icon}</span>
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-gray-900 dark:text-white">{game.name}</h3>
                          <div className="flex items-center space-x-2 mt-1">
                            <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                              game.difficulty === 'Beginner' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' :
                              game.difficulty === 'Intermediate' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' :
                              'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                            }`}>
                              {game.difficulty}
                            </span>
                          </div>
                        </div>
                      </div>

                      <p className="text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
                        {game.description}
                      </p>

                      <div className="space-y-3 mb-6">
                        <h4 className="font-semibold text-gray-900 dark:text-white">Features:</h4>
                        <div className="grid grid-cols-1 gap-2">
                          {game.features.map((feature, featureIndex) => (
                            <div key={featureIndex} className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300">
                              <span className="material-symbols-outlined text-green-500 text-sm">check_circle</span>
                              <span>{feature}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <motion.button
                        className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-xl transition-colors flex items-center justify-center space-x-2"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <span className="material-symbols-outlined">play_arrow</span>
                        <span>Launch Game</span>
                      </motion.button>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Game Preview */}
            {selectedGame && !isFullscreen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-6xl"
              >
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden">
                  <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-red-600 rounded-lg flex items-center justify-center">
                        <span className="material-symbols-outlined text-white text-xl">videogame_asset</span>
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                          {doomOptions.find(g => g.id === selectedGame)?.name}
                        </h3>
                        <p className="text-gray-600 dark:text-gray-300">Ready to play</p>
                      </div>
                    </div>
                    <div className="flex space-x-3">
                      <button
                        onClick={handleFullscreen}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors flex items-center space-x-2"
                      >
                        <span className="material-symbols-outlined text-sm">fullscreen</span>
                        <span>Fullscreen</span>
                      </button>
                      <button
                        onClick={() => setSelectedGame(null)}
                        className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors"
                      >
                        Back
                      </button>
                    </div>
                  </div>
                  
                  <div className="aspect-video">
                    <iframe
                      src={doomOptions.find(g => g.id === selectedGame)?.url}
                      className="w-full h-full"
                      title="DOOM Game"
                      allow="gamepad; midi; encrypted-media;"
                      sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {/* Info Section */}
            {!selectedGame && (
              <motion.div
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="mt-16 w-full max-w-4xl"
              >
                <div className="bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/10 dark:to-orange-900/10 rounded-2xl p-8">
                  <div className="text-center">
                    <h3 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">About DOOM</h3>
                    <p className="text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
                      Released in 1993, DOOM revolutionized the gaming industry and popularized the first-person shooter genre. 
                      These WebAssembly ports allow you to experience this classic game directly in your browser with no downloads required.
                    </p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
                      <div className="text-center">
                        <div className="w-12 h-12 bg-red-600 rounded-xl flex items-center justify-center mx-auto mb-3">
                          <span className="material-symbols-outlined text-white">speed</span>
                        </div>
                        <h4 className="font-bold mb-2">Instant Play</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-300">No downloads or installation required</p>
                      </div>
                      
                      <div className="text-center">
                        <div className="w-12 h-12 bg-red-600 rounded-xl flex items-center justify-center mx-auto mb-3">
                          <span className="material-symbols-outlined text-white">security</span>
                        </div>
                        <h4 className="font-bold mb-2">Safe & Secure</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-300">Runs in browser sandbox for security</p>
                      </div>
                      
                      <div className="text-center">
                        <div className="w-12 h-12 bg-red-600 rounded-xl flex items-center justify-center mx-auto mb-3">
                          <span className="material-symbols-outlined text-white">devices</span>
                        </div>
                        <h4 className="font-bold mb-2">Cross-Platform</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-300">Works on desktop, tablet, and mobile</p>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

          </div>
        </main>
        
        <Footer />
      </div>
    </div>
  );
};

export default DoomPage; 