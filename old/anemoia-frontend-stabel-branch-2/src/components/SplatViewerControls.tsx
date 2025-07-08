import { useViewerSettings } from '../viewers/ViewerSettingsContext';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import QualitySelector from './QualitySelector';

const Slider = ({ label, value, min, max, step, onChange }: { label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void }) => (
  <div className="flex flex-col space-y-1">
    <label className="text-sm font-medium">{label}</label>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
    />
    <span className="text-xs text-right">{value.toFixed(2)}</span>
  </div>
);

const Toggle = ({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) => (
  <label className="flex items-center space-x-2 cursor-pointer select-none">
    <input type="checkbox" className="form-checkbox h-4 w-4" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    <span className="text-sm">{label}</span>
  </label>
);

const ColorInput = ({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) => (
  <div className="flex items-center space-x-2">
    <span className="text-sm">{label}</span>
    <input type="color" value={value} onChange={(e) => onChange(e.target.value)} />
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
    <motion.div
      initial={{ x: 300, opacity: 0 }}
      animate={{ x: open ? 0 : 300, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 100, damping: 15 }}
      className="fixed right-0 top-20 z-40 w-64 bg-gray-800/90 backdrop-blur-md border-l border-gray-700 p-4 rounded-l-xl text-white shadow-lg"
    >
      <button
        className="absolute -left-8 top-1/2 -translate-y-1/2 w-8 h-20 bg-blue-600 hover:bg-blue-500 rounded-l-md flex items-center justify-center text-white focus:outline-none"
        onClick={() => setOpen((o) => !o)}
      >
        <span className="material-symbols-outlined" style={{ transform: open ? 'rotate(180deg)' : undefined }}>
          chevron_right
        </span>
      </button>

      <h3 className="font-bold mb-4 text-lg border-b border-gray-700 pb-2">Viewer Controls</h3>
      <div className="space-y-4">
        <div>
          <h4 className="font-semibold text-gray-300 text-xs uppercase tracking-wider mb-2">Display</h4>
          <div className="space-y-3 p-2 bg-gray-900/50 rounded-md">
            <Slider label="Exposure" value={localExposure} min={0} max={5} step={0.1} onChange={setLocalExposure} />
            <Toggle label="Wireframe" checked={localWireframe} onChange={setLocalWireframe} />
            <ColorInput label="Background" value={localBg} onChange={setLocalBg} />
          </div>
        </div>
        <div className="border-t border-gray-700 my-4"></div>
        <div>
          <h4 className="font-semibold text-gray-300 text-xs uppercase tracking-wider mb-2">Performance</h4>
          <div className="p-2 bg-gray-900/50 rounded-md">
            <QualitySelector />
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default SplatViewerControls; 