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
  badgeColor?: string;
}

// Custom SVG icons for tools
const customIcons: { [key: string]: React.ReactElement } = {
  'image-chat-icon': (
    <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
      <rect x="3" y="4" width="18" height="12" rx="2" stroke="currentColor" strokeWidth="2"/>
      <path d="M7 11L10 8L14 12L18 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="8" cy="8" r="1" fill="currentColor"/>
      <path d="M8 16L8 19C8 19.5523 8.44772 20 9 20H15C15.5523 20 16 19.5523 16 19V16" stroke="currentColor" strokeWidth="2"/>
      <path d="M11 18H13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
  'doom-icon': (
    <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
      <path d="M12 2L4 8V16L12 22L20 16V8L12 2Z" stroke="currentColor" strokeWidth="2" fill="currentColor" fillOpacity="0.2"/>
      <path d="M8 10H9V12H8V10ZM15 10H16V12H15V10Z" fill="currentColor"/>
      <path d="M8 15C8 15 9.5 17 12 17C14.5 17 16 15 16 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <path d="M7 6L12 3L17 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
  'terminal-icon': (
    <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
      <rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="2"/>
      <path d="M7 9L10 12L7 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M13 15H17" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <path d="M3 8H21" stroke="currentColor" strokeWidth="2"/>
    </svg>
  ),
  'color-picker-icon': (
    <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
      <circle cx="12" cy="12" r="3" fill="currentColor" fillOpacity="0.3" stroke="currentColor" strokeWidth="2"/>
      <circle cx="19" cy="19" r="3" fill="currentColor" fillOpacity="0.5" stroke="currentColor" strokeWidth="2"/>
      <circle cx="8" cy="8" r="2" fill="#FF0000"/>
      <circle cx="16" cy="8" r="2" fill="#00FF00"/>
      <circle cx="8" cy="16" r="2" fill="#0000FF"/>
    </svg>
  ),
  'metadata-icon': (
    <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
      <rect x="4" y="4" width="16" height="16" rx="2" stroke="currentColor" strokeWidth="2"/>
      <path d="M4 8H20" stroke="currentColor" strokeWidth="2"/>
      <path d="M8 12H16M8 16H14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
  'batch-icon': (
    <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
      <rect x="5" y="5" width="10" height="10" rx="1" stroke="currentColor" strokeWidth="2"/>
      <rect x="9" y="9" width="10" height="10" rx="1" stroke="currentColor" strokeWidth="2" fill="currentColor" fillOpacity="0.2"/>
    </svg>
  ),
  'video-object-remover-icon': (
    <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
      <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="2"/>
      <path d="M10 12V16L14 14L10 12Z" fill="currentColor" fillOpacity="0.3" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
      <path d="M17 11L19 13M19 11L17 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
  'synthid-remover-icon': (
    <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" fill="currentColor" fillOpacity="0.1"/>
      <path d="M12 6V18M6 12H18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <path d="M16 16L8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  )
};

// Minimal color config per tool
const toolColors: Record<string, { gradient: string; border: string; badge: string }> = {
  doom: { gradient: 'from-red-600 to-orange-600', border: 'border-red-500/40 hover:border-red-400', badge: 'bg-red-500/20 text-red-300' },
  'anime-gallery': { gradient: 'from-cyan-600 to-blue-600', border: 'border-cyan-500/40 hover:border-cyan-400', badge: 'bg-cyan-500/20 text-cyan-300' },
  'synthid-remover': { gradient: 'from-emerald-600 to-teal-600', border: 'border-emerald-500/40 hover:border-emerald-400', badge: 'bg-emerald-500/20 text-emerald-300' },
  'color-picker': { gradient: 'from-purple-600 to-indigo-600', border: 'border-purple-500/40 hover:border-purple-400', badge: 'bg-purple-500/20 text-purple-300' },
  'metadata-viewer': { gradient: 'from-blue-600 to-sky-600', border: 'border-blue-500/40 hover:border-blue-400', badge: 'bg-blue-500/20 text-blue-300' },
  'batch-converter': { gradient: 'from-gray-600 to-slate-600', border: 'border-gray-500/40 hover:border-gray-400', badge: 'bg-gray-500/20 text-gray-300' },
};

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onToggle }) => {
  const navigate = useNavigate();

  const miscTools: ToolItem[] = [
    {
      id: 'doom',
      name: 'DOOM Classic',
      description: 'Play the classic DOOM game in your browser',
      icon: 'doom-icon',
      onClick: () => { navigate('/doom'); onToggle(); },
      badge: 'WebASM'
    },
    {
      id: 'anime-gallery',
      name: 'AGHPB Terminal',
      description: 'Anime girls holding programming books',
      icon: 'terminal-icon',
      onClick: () => { navigate('/anime-gallery'); onToggle(); },
      badge: 'TERMINAL'
    },
    {
      id: 'synthid-remover',
      name: 'SynthID Remover',
      description: 'Neutralize AI watermarks from images',
      icon: 'synthid-remover-icon',
      onClick: () => { navigate('/synthid-remover/landing'); onToggle(); },
      badge: 'CLASSIFIED'
    },
    {
      id: 'color-picker',
      name: 'Color Picker',
      description: 'Extract color palettes from images',
      icon: 'color-picker-icon',
      onClick: () => { console.log('Color picker clicked'); }
    },
    {
      id: 'metadata-viewer',
      name: 'Image Metadata',
      description: 'View and edit image EXIF data',
      icon: 'metadata-icon',
      onClick: () => { console.log('Metadata viewer clicked'); }
    },
    {
      id: 'batch-converter',
      name: 'Batch Converter',
      description: 'Convert multiple images at once',
      icon: 'batch-icon',
      onClick: () => { console.log('Batch converter clicked'); }
    }
  ];

  const readyTools = ['doom', 'anime-gallery'];

  return (
    <>
      {/* Toggle Button — properly aligned */}
      <motion.button
        onClick={onToggle}
        className="fixed z-50 w-11 h-11 bg-black/80 backdrop-blur-md rounded-xl shadow-lg border border-cyan-500/30 flex items-center justify-center hover:bg-gray-900/90 hover:border-cyan-400/60 transition-all"
        style={{ top: '1.25rem', left: '1.25rem' }}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.92 }}
        animate={{ x: isOpen ? 384 : 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
        <motion.span
          className="material-symbols-outlined text-cyan-400 text-xl"
          animate={{ rotate: isOpen ? 180 : 0 }}
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
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]"
            onClick={onToggle}
          />
        )}
      </AnimatePresence>

      {/* Sidebar Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ x: -384 }}
            animate={{ x: 0 }}
            exit={{ x: -384 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed inset-y-0 left-0 z-50 w-96 max-w-[85vw] flex flex-col bg-gray-950/98 backdrop-blur-xl shadow-2xl border-r border-cyan-500/15"
          >
            {/* Header — sticky top */}
            <div className="flex-shrink-0 px-5 py-5 border-b border-white/5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg shadow-cyan-500/20">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5 text-white">
                    <rect x="5" y="11" width="14" height="10" rx="2" />
                    <circle cx="12" cy="16" r="1" />
                    <path d="M8 11V7a4 4 0 118 0v4" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white leading-tight">Secret Tools</h2>
                  <p className="text-xs text-cyan-400/60">Classified utilities</p>
                </div>
              </div>
            </div>

            {/* Scrollable tool list — fills remaining height */}
            <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 space-y-2.5">
              {miscTools.map((tool, index) => {
                const colors = toolColors[tool.id] || toolColors['batch-converter'];
                const isReady = readyTools.includes(tool.id);
                
                return (
                  <motion.div
                    key={tool.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.06 }}
                    className={`relative ${isReady ? 'p-5 rounded-2xl' : 'p-3 rounded-xl opacity-80'} border transition-all duration-150 cursor-pointer group bg-white/[0.02] hover:bg-white/[0.06] ${colors.border}`}
                    onClick={tool.onClick}
                    whileHover={{ x: 4, scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className={`flex items-center ${isReady ? 'gap-4' : 'gap-3'}`}>
                      {/* Icon */}
                      <div className={`${isReady ? 'w-14 h-14 rounded-xl text-3xl' : 'w-10 h-10 rounded-lg text-xl'} flex items-center justify-center flex-shrink-0 bg-gradient-to-br ${colors.gradient} text-white shadow-sm group-hover:scale-105 transition-transform overflow-hidden`}>
                        {tool.id === 'doom' ? (
                          <img src="/emblems/doom_emblem_new.png" alt="DOOM" className="w-full h-full object-cover" />
                        ) : tool.id === 'anime-gallery' ? (
                          <img src="/emblems/aghpb_vintage.png" alt="AGHPB" className="w-full h-full object-cover" />
                        ) : (
                          customIcons[tool.icon] || <span className="material-symbols-outlined text-inherit">{tool.icon}</span>
                        )}
                      </div>
                      
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className={`${isReady ? 'font-bold text-lg' : 'font-semibold text-sm'} text-white truncate`}>{tool.name}</h3>
                          {tool.badge && isReady && (
                            <span className={`px-2 py-0.5 text-[11px] font-bold rounded-md flex-shrink-0 ${colors.badge}`}>
                              {tool.badge}
                            </span>
                          )}
                        </div>
                        {isReady ? (
                          <p className="text-sm text-gray-400 mt-1 line-clamp-2 leading-snug">{tool.description}</p>
                        ) : (
                          <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{tool.description}</p>
                        )}
                      </div>
                      
                      {/* Arrow */}
                      <span className="material-symbols-outlined text-gray-600 text-sm opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                        chevron_right
                      </span>
                    </div>
                    
                    {/* Status */}
                    {!isReady && (
                      <div className="mt-2 text-[10px] text-yellow-500 flex items-center gap-1 font-medium bg-yellow-500/10 w-fit px-1.5 py-0.5 rounded">
                        <span className="material-symbols-outlined text-[10px]">warning</span>
                        UNDER CONSTRUCTION
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>

            {/* Footer — sticky bottom */}
            <div className="flex-shrink-0 px-4 py-3 border-t border-white/5">
              <p className="text-[10px] text-gray-600 text-center">
                More tools added based on feedback
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Sidebar;
