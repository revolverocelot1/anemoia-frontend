import { useViewerSettings } from '../viewers/ViewerSettingsContext';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import QualitySelector from './QualitySelector';
import { Settings2, ChevronLeft, ChevronRight, Sun, Grid3X3, Palette } from 'lucide-react';

const Slider = ({ label, value, min, max, step, onChange, icon }: { 
  label: string; 
  value: number; 
  min: number; 
  max: number; 
  step: number; 
  onChange: (v: number) => void;
  icon?: React.ReactNode;
}) => (
  <div className="space-y-2">
    <div className="flex items-center justify-between">
      <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
        {icon}
        {label}
      </label>
      <span className="text-xs font-mono text-cyan-400 bg-cyan-950/50 px-2 py-0.5 rounded">
        {value.toFixed(2)}
      </span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className="w-full h-1.5 bg-gray-700 rounded-full appearance-none cursor-pointer accent-cyan-500
        [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 
        [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-cyan-500 
        [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:shadow-cyan-500/30
        [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:transition-transform
        [&::-webkit-slider-thumb]:hover:scale-110"
    />
  </div>
);

const Toggle = ({ label, checked, onChange, icon }: { 
  label: string; 
  checked: boolean; 
  onChange: (v: boolean) => void;
  icon?: React.ReactNode;
}) => (
  <label className="flex items-center justify-between cursor-pointer select-none group">
    <span className="text-sm text-gray-300 flex items-center gap-2">
      {icon}
      {label}
    </span>
    <div className="relative">
      <input 
        type="checkbox" 
        className="sr-only peer" 
        checked={checked} 
        onChange={(e) => onChange(e.target.checked)} 
      />
      <div className="w-10 h-5 bg-gray-700 rounded-full peer peer-checked:bg-cyan-600 transition-colors" />
      <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-5 shadow-sm" />
    </div>
  </label>
);

const ColorInput = ({ label, value, onChange, icon }: { 
  label: string; 
  value: string; 
  onChange: (v: string) => void;
  icon?: React.ReactNode;
}) => (
  <div className="flex items-center justify-between">
    <span className="text-sm text-gray-300 flex items-center gap-2">
      {icon}
      {label}
    </span>
    <div className="relative">
      <input 
        type="color" 
        value={value} 
        onChange={(e) => onChange(e.target.value)} 
        className="w-8 h-8 rounded-lg border-2 border-gray-600 cursor-pointer bg-transparent
          [&::-webkit-color-swatch-wrapper]:p-0.5 [&::-webkit-color-swatch]:rounded-md"
      />
    </div>
  </div>
);

const SplatViewerControls = () => {
  const { settings, update } = useViewerSettings();
  const [open, setOpen] = useState(true);

  // local copies for smooth slider handling
  const [localExposure, setLocalExposure] = useState(settings.exposure);
  const [localWireframe, setLocalWireframe] = useState(settings.wireframe);
  const [localBg, setLocalBg] = useState(settings.backgroundColor);

  useEffect(() => {
    update({ exposure: localExposure, wireframe: localWireframe, backgroundColor: localBg });
  }, [localExposure, localWireframe, localBg, update]);

  return (
    <>
      {/* Toggle Button - Always visible */}
      <motion.button
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        onClick={() => setOpen((o) => !o)}
        className={`fixed right-0 bottom-32 z-40 flex items-center gap-2 px-3 py-3 
          bg-gradient-to-r from-cyan-600/90 to-blue-600/90 hover:from-cyan-500 hover:to-blue-500
          text-white rounded-l-xl shadow-lg shadow-cyan-500/20 backdrop-blur-sm
          transition-all duration-200 group ${open ? 'translate-x-full opacity-0 pointer-events-none' : ''}`}
        title="Open Viewer Controls"
      >
        <Settings2 className="w-5 h-5" />
        <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
      </motion.button>

      {/* Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ x: 320, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 320, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed right-4 bottom-28 z-40 w-72"
          >
            <div className="bg-gradient-to-br from-gray-900/95 to-gray-950/95 backdrop-blur-xl 
              border border-cyan-500/20 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden">
              
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 
                bg-gradient-to-r from-cyan-600/20 to-blue-600/20 border-b border-cyan-500/20">
                <h3 className="font-semibold text-white flex items-center gap-2">
                  <Settings2 className="w-4 h-4 text-cyan-400" />
                  Viewer Controls
                </h3>
                <button
                  onClick={() => setOpen(false)}
                  className="p-1.5 hover:bg-white/10 rounded-lg transition-colors group"
                  title="Close panel"
                >
                  <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-white transition-colors" />
                </button>
              </div>

              {/* Content */}
              <div className="p-4 space-y-5 max-h-[50vh] overflow-y-auto custom-scrollbar">
                
                {/* Display Section */}
                <div className="space-y-4">
                  <h4 className="text-xs font-semibold text-cyan-400 uppercase tracking-wider flex items-center gap-2">
                    <Sun className="w-3.5 h-3.5" />
                    Display
                  </h4>
                  <div className="space-y-4 pl-1">
                    <Slider 
                      label="Exposure" 
                      value={localExposure} 
                      min={0} 
                      max={5} 
                      step={0.1} 
                      onChange={setLocalExposure}
                    />
                    <Toggle 
                      label="Wireframe" 
                      checked={localWireframe} 
                      onChange={setLocalWireframe}
                      icon={<Grid3X3 className="w-4 h-4 text-gray-500" />}
                    />
                    <ColorInput 
                      label="Background" 
                      value={localBg} 
                      onChange={setLocalBg}
                      icon={<Palette className="w-4 h-4 text-gray-500" />}
                    />
                  </div>
                </div>

                {/* Divider */}
                <div className="border-t border-gray-700/50" />

                {/* Performance Section */}
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold text-cyan-400 uppercase tracking-wider flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm">speed</span>
                    Performance
                  </h4>
                  <div className="pl-1">
                    <QualitySelector />
                  </div>
                </div>
              </div>

              {/* Footer hint */}
              <div className="px-4 py-2 bg-gray-950/50 border-t border-gray-800/50">
                <p className="text-[10px] text-gray-500 text-center">
                  Press <kbd className="px-1 py-0.5 bg-gray-800 rounded text-gray-400">H</kbd> to toggle controls
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Custom scrollbar styles */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(6, 182, 212, 0.3);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(6, 182, 212, 0.5);
        }
      `}</style>
    </>
  );
};

export default SplatViewerControls;
