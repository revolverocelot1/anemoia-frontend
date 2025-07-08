import React from 'react';
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
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onToggle }) => {
  const navigate = useNavigate();

  const miscTools: ToolItem[] = [
    {
      id: 'doom',
      name: 'DOOM Classic',
      description: 'Play the classic DOOM game in your browser',
      icon: 'videogame_asset',
      onClick: () => {
        navigate('/doom');
        onToggle();
      },
      badge: 'WebASM'
    },
    {
      id: 'anime-gallery',
      name: 'Anime Gallery',
      description: 'Programming books held by anime girls collection',
      icon: 'collections',
      onClick: () => {
        navigate('/anime-gallery');
        onToggle();
      },
      badge: 'Gallery'
    },
    {
      id: 'aghpb-archive',
      name: 'AGHPB Archive',
      description: 'High-quality anime artwork gallery powered by AI',
      icon: 'photo_library',
      onClick: () => {
        navigate('/aghpb-archive');
        onToggle();
      },
      badge: 'New'
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

  return (
    <>
      {/* Toggle Button - Star Wars style */}
      <motion.button
        onClick={onToggle}
        className="fixed top-6 left-6 z-50 w-12 h-12 bg-gray-900/80 backdrop-blur-sm rounded-lg shadow-lg border border-cyan-500/30 flex items-center justify-center hover:bg-gray-800/80 hover:border-cyan-400/50 transition-all group"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        animate={{
          x: isOpen ? 280 : 0,
        }}
        transition={{
          type: "spring",
          stiffness: 300,
          damping: 30
        }}
      >
        <div className="absolute inset-0 bg-cyan-500/10 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"></div>
        <motion.span
          className="material-symbols-outlined text-cyan-400 relative z-10"
          animate={{
            rotate: isOpen ? 180 : 0
          }}
          transition={{ duration: 0.2 }}
        >
          {isOpen ? 'close' : 'menu'}
        </motion.span>
      </motion.button>

      {/* Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black bg-opacity-30 backdrop-blur-sm"
            onClick={onToggle}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ x: -320 }}
            animate={{ x: 0 }}
            exit={{ x: -320 }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 30
            }}
            className="fixed left-0 top-0 z-40 w-80 h-full bg-gray-900/95 backdrop-blur-lg shadow-2xl border-r border-cyan-500/20 overflow-y-auto"
          >
            {/* Holographic scanline effect */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/5 via-transparent to-cyan-500/5 animate-pulse"></div>
            </div>
            
            {/* Header */}
            <div className="p-6 border-b border-cyan-500/20 relative">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-cyan-500/30">
                  <span className="material-symbols-outlined text-white text-xl">build</span>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Miscellaneous Tools</h2>
                  <p className="text-sm text-cyan-400/70">Additional utilities & features</p>
                </div>
              </div>
              {/* Corner accent */}
              <div className="absolute top-0 right-0 w-16 h-16 opacity-30">
                <div className="absolute top-0 right-0 w-full h-full border-t-2 border-r-2 border-cyan-400"></div>
              </div>
            </div>

            {/* Tools Grid */}
            <div className="p-6">
              <div className="space-y-4">
                {miscTools.map((tool, index) => (
                  <motion.div
                    key={tool.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={`relative p-4 rounded-xl border-2 transition-all duration-200 cursor-pointer group ${
                      tool.id === 'doom' 
                        ? 'bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 border-red-200 dark:border-red-800 hover:border-red-400 dark:hover:border-red-600'
                        : tool.id === 'anime-gallery'
                        ? 'bg-gradient-to-r from-cyan-50 to-purple-50 dark:from-cyan-900/20 dark:to-purple-900/20 border-cyan-200 dark:border-cyan-800 hover:border-cyan-400 dark:hover:border-cyan-600'
                        : tool.id === 'aghpb-archive'
                        ? 'bg-gradient-to-r from-pink-50 to-purple-50 dark:from-pink-900/20 dark:to-purple-900/20 border-pink-200 dark:border-pink-800 hover:border-pink-400 dark:hover:border-pink-600'
                        : tool.id === 'color-picker'
                        ? 'bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-purple-200 dark:border-purple-800 hover:border-purple-400 dark:hover:border-purple-600'
                        : tool.id === 'metadata-viewer'
                        ? 'bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 border-blue-200 dark:border-blue-800 hover:border-blue-400 dark:hover:border-blue-600'
                        : 'bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800 hover:border-green-400 dark:hover:border-green-600'
                    }`}
                    onClick={tool.onClick}
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {tool.badge && (
                      <div className="absolute top-3 right-3">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          tool.id === 'doom' 
                            ? 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300'
                            : tool.id === 'anime-gallery'
                            ? 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/50 dark:text-cyan-300'
                            : tool.id === 'aghpb-archive'
                            ? 'bg-pink-100 text-pink-700 dark:bg-pink-900/50 dark:text-pink-300'
                            : 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
                        }`}>
                          {tool.badge}
                        </span>
                      </div>
                    )}
                    
                    <div className="flex items-start space-x-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform ${
                        tool.id === 'doom' 
                          ? 'bg-red-600 group-hover:bg-red-700'
                          : tool.id === 'anime-gallery'
                          ? 'bg-cyan-600 group-hover:bg-cyan-700'
                          : tool.id === 'aghpb-archive'
                          ? 'bg-pink-600 group-hover:bg-pink-700'
                          : tool.id === 'color-picker'
                          ? 'bg-purple-600 group-hover:bg-purple-700'
                          : tool.id === 'metadata-viewer'
                          ? 'bg-blue-600 group-hover:bg-blue-700'
                          : 'bg-green-600 group-hover:bg-green-700'
                      }`}>
                        <span className="material-symbols-outlined text-white text-xl">{tool.icon}</span>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-gray-900 dark:text-white mb-1 group-hover:text-gray-700 dark:group-hover:text-gray-200 transition-colors">
                          {tool.name}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                          {tool.description}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between">
                      <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-500">
                        <span className="material-symbols-outlined text-sm">
                          {tool.id === 'doom' || tool.id === 'anime-gallery' || tool.id === 'aghpb-archive' ? 'launch' : 'build'}
                        </span>
                        <span>{tool.id === 'doom' || tool.id === 'anime-gallery' || tool.id === 'aghpb-archive' ? 'Ready to explore' : 'Coming soon'}</span>
                      </div>
                      
                      <motion.div
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                        whileHover={{ x: 5 }}
                      >
                        <span className="material-symbols-outlined text-gray-400 dark:text-gray-500">arrow_forward</span>
                      </motion.div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Footer Note */}
              <div className="mt-8 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700">
                <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400">
                  <span className="material-symbols-outlined text-sm">info</span>
                  <span className="text-sm">More tools will be added based on user feedback</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Sidebar; 