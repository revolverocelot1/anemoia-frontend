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

// Custom SVG icons for tools
const customIcons: { [key: string]: React.ReactElement } = {
  't-pose-icon': (
    <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6">
      <circle cx="12" cy="5" r="2" stroke="currentColor" strokeWidth="2"/>
      <path d="M12 7V14M12 14V18M12 14L8 10M12 14L16 10M12 18L10 20M12 18L14 20" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
  'image-chat-icon': (
    <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6">
      <rect x="3" y="4" width="18" height="12" rx="2" stroke="currentColor" strokeWidth="2"/>
      <path d="M7 11L10 8L14 12L18 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="8" cy="8" r="1" fill="currentColor"/>
      <path d="M8 16L8 19C8 19.5523 8.44772 20 9 20H15C15.5523 20 16 19.5523 16 19V16" stroke="currentColor" strokeWidth="2"/>
      <path d="M11 18H13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
  'doom-icon': (
    <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6">
      <path d="M12 2L4 8V16L12 22L20 16V8L12 2Z" stroke="currentColor" strokeWidth="2" fill="currentColor" fillOpacity="0.2"/>
      <path d="M8 10H9V12H8V10ZM15 10H16V12H15V10Z" fill="currentColor"/>
      <path d="M8 15C8 15 9.5 17 12 17C14.5 17 16 15 16 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <path d="M7 6L12 3L17 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
  'terminal-icon': (
    <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6">
      <rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="2"/>
      <path d="M7 9L10 12L7 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M13 15H17" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <path d="M3 8H21" stroke="currentColor" strokeWidth="2"/>
      <circle cx="6" cy="6" r="0.5" fill="currentColor"/>
      <circle cx="8" cy="6" r="0.5" fill="currentColor"/>
      <circle cx="10" cy="6" r="0.5" fill="currentColor"/>
    </svg>
  ),
  'color-picker-icon': (
    <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6">
      <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C12.55 22 13 21.55 13 21C13 20.45 12.55 20 12 20C7.58 20 4 16.42 4 12C4 7.58 7.58 4 12 4C16.42 4 20 7.58 20 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <circle cx="12" cy="12" r="3" fill="currentColor" fillOpacity="0.3" stroke="currentColor" strokeWidth="2"/>
      <circle cx="19" cy="19" r="3" fill="currentColor" fillOpacity="0.5" stroke="currentColor" strokeWidth="2"/>
      <circle cx="8" cy="8" r="2" fill="#FF0000"/>
      <circle cx="16" cy="8" r="2" fill="#00FF00"/>
      <circle cx="8" cy="16" r="2" fill="#0000FF"/>
    </svg>
  ),
  'metadata-icon': (
    <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6">
      <rect x="4" y="4" width="16" height="16" rx="2" stroke="currentColor" strokeWidth="2"/>
      <path d="M4 8H20" stroke="currentColor" strokeWidth="2"/>
      <path d="M8 12H16M8 16H14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <circle cx="12" cy="6" r="1" fill="currentColor"/>
    </svg>
  ),
  'batch-icon': (
    <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6">
      <rect x="5" y="5" width="10" height="10" rx="1" stroke="currentColor" strokeWidth="2"/>
      <rect x="9" y="9" width="10" height="10" rx="1" stroke="currentColor" strokeWidth="2" fill="currentColor" fillOpacity="0.2"/>
      <path d="M12 12L14 14M14 12L12 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
  'video-object-remover-icon': (
    <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6">
      <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="2"/>
      <path d="M3 9H21" stroke="currentColor" strokeWidth="2"/>
      <circle cx="8" cy="7" r="1" fill="currentColor"/>
      <circle cx="12" cy="7" r="1" fill="currentColor"/>
      <circle cx="16" cy="7" r="1" fill="currentColor"/>
      <path d="M10 12V16L14 14L10 12Z" fill="currentColor" fillOpacity="0.3" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
      <path d="M17 11L19 13M19 11L17 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <circle cx="18" cy="12" r="3" stroke="currentColor" strokeWidth="2" strokeDasharray="2 2"/>
    </svg>
  )
};

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onToggle }) => {
  const navigate = useNavigate();

  const miscTools: ToolItem[] = [
    {
      id: 'video-object-remover',
      name: 'Video Object Remover',
      description: 'Remove objects from videos with AI & frame interpolation',
      icon: 'video-object-remover-icon',
      onClick: () => {
        navigate('/video-object-remover');
        onToggle();
      },
      badge: 'NEW'
    },
    {
      id: 'doom',
      name: 'DOOM Classic',
      description: 'Play the classic DOOM game in your browser',
      icon: 'doom-icon',
      onClick: () => {
        navigate('/doom');
        onToggle();
      },
      badge: 'WebASM'
    },
    {
      id: 'anime-gallery',
      name: 'AGHPB Terminal',
      description: 'Cyberpunk terminal interface for anime girls holding programming books',
      icon: 'terminal-icon',
      onClick: () => {
        navigate('/anime-gallery');
        onToggle();
      },
      badge: 'TERMINAL'
    },
    {
      id: 'color-picker',
      name: 'Color Picker',
      description: 'Extract color palettes from images',
      icon: 'color-picker-icon',
      onClick: () => {
        // TODO: Implement color picker
        console.log('Color picker clicked');
      }
    },
    {
      id: 'metadata-viewer',
      name: 'Image Metadata',
      description: 'View and edit image EXIF data',
      icon: 'metadata-icon',
      onClick: () => {
        // TODO: Implement metadata viewer
        console.log('Metadata viewer clicked');
      }
    },
    {
      id: 'batch-converter',
      name: 'Batch Converter',
      description: 'Convert multiple images between formats',
      icon: 'batch-icon',
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
                        ? 'bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 border-red-300 dark:border-red-700 hover:border-red-500 dark:hover:border-red-500 hover:shadow-lg hover:shadow-red-500/20'
                        : tool.id === 'image-chat'
                        ? 'bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-purple-300 dark:border-purple-700 hover:border-purple-500 dark:hover:border-purple-500 hover:shadow-lg hover:shadow-purple-500/20'
                        : tool.id === 'anime-gallery'
                        ? 'bg-gradient-to-r from-cyan-50 to-blue-50 dark:from-cyan-900/20 dark:to-blue-900/20 border-cyan-300 dark:border-cyan-700 hover:border-cyan-500 dark:hover:border-cyan-500 hover:shadow-lg hover:shadow-cyan-500/20'
                        : tool.id === 'color-picker'
                        ? 'bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border-indigo-300 dark:border-indigo-700 hover:border-indigo-500 dark:hover:border-indigo-500 hover:shadow-lg hover:shadow-indigo-500/20'
                        : tool.id === 'metadata-viewer'
                        ? 'bg-gradient-to-r from-blue-50 to-teal-50 dark:from-blue-900/20 dark:to-teal-900/20 border-blue-300 dark:border-blue-700 hover:border-blue-500 dark:hover:border-blue-500 hover:shadow-lg hover:shadow-blue-500/20'
                        : tool.id === 't-poser'
                        ? 'bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-300 dark:border-green-700 hover:border-green-500 dark:hover:border-green-500 hover:shadow-lg hover:shadow-green-500/20'
                        : tool.id === 'video-object-remover'
                        ? 'bg-gradient-to-r from-violet-50 to-fuchsia-50 dark:from-violet-900/20 dark:to-fuchsia-900/20 border-violet-300 dark:border-violet-700 hover:border-violet-500 dark:hover:border-violet-500 hover:shadow-lg hover:shadow-violet-500/20'
                        : 'bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-900/20 dark:to-gray-800/20 border-gray-300 dark:border-gray-700 hover:border-gray-500 dark:hover:border-gray-500 hover:shadow-lg hover:shadow-gray-500/20'
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
                            : tool.id === 'image-chat'
                            ? 'bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700 dark:from-purple-900/50 dark:to-pink-900/50 dark:text-purple-300'
                            : tool.id === 'anime-gallery'
                            ? 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/50 dark:text-cyan-300'
                            : tool.id === 'color-picker'
                            ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300'
                            : tool.id === 'video-object-remover'
                            ? 'bg-gradient-to-r from-violet-100 to-fuchsia-100 text-violet-700 dark:from-violet-900/50 dark:to-fuchsia-900/50 dark:text-violet-300'
                            : 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
                        }`}>
                          {tool.badge}
                        </span>
                      </div>
                    )}
                    
                    <div className="flex items-start space-x-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform ${
                        tool.id === 'doom' 
                          ? 'bg-gradient-to-br from-red-600 to-orange-600 group-hover:from-red-700 group-hover:to-orange-700'
                          : tool.id === 'image-chat'
                          ? 'bg-gradient-to-br from-purple-600 to-pink-600 group-hover:from-purple-700 group-hover:to-pink-700'
                          : tool.id === 'anime-gallery'
                          ? 'bg-gradient-to-br from-cyan-600 to-blue-600 group-hover:from-cyan-700 group-hover:to-blue-700'
                          : tool.id === 'color-picker'
                          ? 'bg-gradient-to-br from-purple-500 to-indigo-600 group-hover:from-purple-600 group-hover:to-indigo-700'
                          : tool.id === 'metadata-viewer'
                          ? 'bg-gradient-to-br from-blue-600 to-teal-600 group-hover:from-blue-700 group-hover:to-teal-700'
                          : tool.id === 't-poser'
                          ? 'bg-gradient-to-br from-green-600 to-emerald-600 group-hover:from-green-700 group-hover:to-emerald-700'
                          : tool.id === 'video-object-remover'
                          ? 'bg-gradient-to-br from-violet-600 to-fuchsia-600 group-hover:from-violet-700 group-hover:to-fuchsia-700'
                          : 'bg-gradient-to-br from-gray-600 to-gray-700 group-hover:from-gray-700 group-hover:to-gray-800'
                      }`}>
                        {customIcons[tool.icon] || <span className="material-symbols-outlined text-white text-xl">{tool.icon}</span>}
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
                          {tool.id === 'doom' || tool.id === 'anime-gallery' || tool.id === 't-poser' || tool.id === 'image-chat' || tool.id === 'video-object-remover' ? 'launch' : 'build'}
                        </span>
                        <span>{tool.id === 'doom' || tool.id === 'anime-gallery' || tool.id === 't-poser' || tool.id === 'image-chat' || tool.id === 'video-object-remover' ? 'Ready to explore' : 'Coming soon'}</span>
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