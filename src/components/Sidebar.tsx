import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

interface ToolItem {
  id: string;
  name: string;
  description: string;
  icon: string;
  onClick: () => void;
  badge?: string;
  external?: boolean;
  hasNavigation?: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onToggle }) => {
  const navigate = useNavigate();
  const [selectedTool, setSelectedTool] = useState<string | null>(null);
  const [showDoomModal, setShowDoomModal] = useState(false);

  const miscTools: ToolItem[] = [
    {
      id: 'doom',
      name: 'DOOM Classic',
      description: 'Play the classic DOOM game in your browser via WebAssembly',
      icon: 'videogame_asset',
      onClick: () => setShowDoomModal(true),
      badge: 'WebASM',
      external: true,
      hasNavigation: true
    },
    {
      id: 'color-picker',
      name: 'Color Picker',
      description: 'Extract color palettes from images',
      icon: 'palette',
      onClick: () => {
        // TODO: Implement color picker
        console.log('Color picker clicked');
      }
    },
    {
      id: 'metadata-viewer',
      name: 'Image Metadata',
      description: 'View and edit image EXIF data',
      icon: 'info',
      onClick: () => {
        // TODO: Implement metadata viewer
        console.log('Metadata viewer clicked');
      }
    },
    {
      id: 'batch-converter',
      name: 'Batch Converter',
      description: 'Convert multiple images between formats',
      icon: 'transform',
      onClick: () => {
        // TODO: Implement batch converter
        console.log('Batch converter clicked');
      }
    }
  ];

  const DoomModal = () => (
    <AnimatePresence>
      {showDoomModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black bg-opacity-80 flex items-center justify-center p-4"
          onClick={() => setShowDoomModal(false)}
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl max-w-6xl w-full h-full max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-red-600 rounded-lg flex items-center justify-center">
                  <span className="material-symbols-outlined text-white text-2xl">videogame_asset</span>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">DOOM Classic</h2>
                  <p className="text-gray-600 dark:text-gray-300">WebAssembly Edition</p>
                </div>
              </div>
              <button
                onClick={() => setShowDoomModal(false)}
                className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                <span className="material-symbols-outlined text-gray-600 dark:text-gray-300">close</span>
              </button>
            </div>
            
            <div className="p-6 h-full flex flex-col">
              <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-8 flex-1 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-24 h-24 bg-red-600 rounded-xl flex items-center justify-center mx-auto mb-6">
                    <span className="material-symbols-outlined text-white text-4xl">videogame_asset</span>
                  </div>
                  <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Choose Your DOOM Experience</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto mb-6">
                    <motion.button
                      onClick={() => {
                        navigate('/doom');
                        setShowDoomModal(false);
                        onToggle();
                      }}
                      className="p-6 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 hover:border-red-500 dark:hover:border-red-400 transition-all duration-200 group"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div className="flex items-center space-x-3 mb-3">
                        <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center">
                          <span className="material-symbols-outlined text-white text-sm">launch</span>
                        </div>
                        <h4 className="font-bold text-gray-900 dark:text-white">Dedicated Page</h4>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-300 text-left">
                        Visit the full DOOM experience page with game selection and info.
                      </p>
                      <div className="flex items-center mt-3 text-xs text-red-600 dark:text-red-400">
                        <span className="material-symbols-outlined text-sm mr-1">arrow_forward</span>
                        Navigate to Page
                      </div>
                    </motion.button>

                    <motion.a
                      href="https://ustymukhman.github.io/webDOOM/public/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block p-6 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 hover:border-red-500 dark:hover:border-red-400 transition-all duration-200 group"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div className="flex items-center space-x-3 mb-3">
                        <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center">
                          <span className="material-symbols-outlined text-white text-sm">play_arrow</span>
                        </div>
                        <h4 className="font-bold text-gray-900 dark:text-white">webDOOM</h4>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-300 text-left">
                        Classic DOOM experience with WebAssembly. Fast loading and authentic gameplay.
                      </p>
                      <div className="flex items-center mt-3 text-xs text-red-600 dark:text-red-400">
                        <span className="material-symbols-outlined text-sm mr-1">open_in_new</span>
                        Open External
                      </div>
                    </motion.a>

                    <motion.a
                      href="https://dwasm.m-h.org.uk/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block p-6 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 hover:border-red-500 dark:hover:border-red-400 transition-all duration-200 group"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div className="flex items-center space-x-3 mb-3">
                        <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center">
                          <span className="material-symbols-outlined text-white text-sm">enhanced_encryption</span>
                        </div>
                        <h4 className="font-bold text-gray-900 dark:text-white">Dwasm Enhanced</h4>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-300 text-left">
                        Enhanced DOOM with widescreen support, higher framerates, and modern features.
                      </p>
                      <div className="flex items-center mt-3 text-xs text-red-600 dark:text-red-400">
                        <span className="material-symbols-outlined text-sm mr-1">open_in_new</span>
                        Open External
                      </div>
                    </motion.a>
                  </div>

                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div className="flex items-center justify-center space-x-2 text-blue-600 dark:text-blue-400">
                      <span className="material-symbols-outlined text-sm">info</span>
                      <span className="text-sm font-medium">All games run entirely in your browser via WebAssembly</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <>
      {/* Sidebar Toggle Button */}
      <motion.button
        onClick={onToggle}
        className="fixed top-4 left-4 z-40 p-3 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        style={{ zIndex: 40 }}
      >
        <motion.span
          className="material-symbols-outlined text-gray-700 dark:text-gray-300"
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.3 }}
        >
          {isOpen ? 'menu_open' : 'menu'}
        </motion.span>
      </motion.button>

      {/* Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 z-30"
            onClick={onToggle}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.div
        initial={{ x: -320 }}
        animate={{ x: isOpen ? 0 : -320 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="fixed top-0 left-0 h-full w-80 bg-white dark:bg-gray-900 shadow-2xl z-30 overflow-hidden"
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="material-symbols-outlined text-white text-xl">build</span>
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Tools</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">Miscellaneous utilities</p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-3">
              <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-2">
                Miscellaneous Tools
              </div>
              
              {miscTools.map((tool, index) => (
                <motion.div
                  key={tool.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`relative group cursor-pointer rounded-xl p-4 transition-all duration-200 ${
                    selectedTool === tool.id
                      ? 'bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-700'
                      : 'bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 border-2 border-transparent'
                  }`}
                  onClick={() => {
                    setSelectedTool(tool.id);
                    tool.onClick();
                  }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="flex items-start space-x-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      tool.id === 'doom' ? 'bg-red-600' :
                      tool.id === 'color-picker' ? 'bg-pink-500' :
                      tool.id === 'metadata-viewer' ? 'bg-blue-500' :
                      'bg-green-500'
                    }`}>
                      <span className="material-symbols-outlined text-white text-lg">{tool.icon}</span>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <h3 className="font-semibold text-gray-900 dark:text-white text-sm">{tool.name}</h3>
                        {tool.badge && (
                          <span className="px-2 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 text-xs rounded-full font-medium">
                            {tool.badge}
                          </span>
                        )}
                        {tool.external && (
                          <span className="material-symbols-outlined text-gray-400 text-sm">open_in_new</span>
                        )}
                        {tool.hasNavigation && (
                          <span className="material-symbols-outlined text-blue-500 text-sm">launch</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 leading-relaxed">
                        {tool.description}
                      </p>
                    </div>
                  </div>

                  {/* Hover effect */}
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                </motion.div>
              ))}
            </div>

            {/* Footer Section */}
            <div className="mt-8 p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl">
              <div className="flex items-center space-x-2 mb-2">
                <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-sm">lightbulb</span>
                <span className="text-sm font-medium text-blue-900 dark:text-blue-100">Pro Tip</span>
              </div>
              <p className="text-xs text-blue-700 dark:text-blue-300">
                All tools run locally in your browser for maximum privacy and speed!
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* DOOM Modal */}
      <DoomModal />
    </>
  );
};

export default Sidebar; 