import { useViewerSettings } from '../viewers/ViewerSettingsContext';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import QualitySelector from './QualitySelector';
import {
  Settings2, Sun, Grid3X3, Palette,
  RotateCcw, Eye, Box, Crosshair, ArrowUp, Layers,
  RefreshCw, X, Camera,
  MonitorSmartphone, Lightbulb
} from 'lucide-react';

/* ─── Shared Sub-Components ─── */

const Slider = ({ label, value, min, max, step, onChange, icon, disabled, tooltip }: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  icon?: React.ReactNode;
  disabled?: boolean;
  tooltip?: string;
}) => (
  <div className={`space-y-2 ${disabled ? 'opacity-40 pointer-events-none' : ''}`} title={tooltip}>
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
      disabled={disabled}
      className="w-full h-1.5 bg-gray-700 rounded-full appearance-none cursor-pointer accent-cyan-500
        [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 
        [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-cyan-500 
        [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:shadow-cyan-500/30
        [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:transition-transform
        [&::-webkit-slider-thumb]:hover:scale-110"
    />
  </div>
);

const Toggle = ({ label, checked, onChange, icon, disabled, tooltip }: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  icon?: React.ReactNode;
  disabled?: boolean;
  tooltip?: string;
}) => (
  <label
    className={`flex items-center justify-between cursor-pointer select-none group ${disabled ? 'opacity-40 pointer-events-none' : ''}`}
    title={tooltip}
  >
    <span className="text-sm text-gray-300 flex items-center gap-2">
      {icon}
      {label}
      {disabled && (
        <span className="text-[9px] text-amber-400/70 bg-amber-950/40 px-1.5 py-0.5 rounded-full border border-amber-500/20">
          N/A
        </span>
      )}
    </span>
    <div className="relative">
      <input
        type="checkbox"
        className="sr-only peer"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
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

/* ─── Camera Preset Button ─── */
const CameraPresetButton = ({ label, icon, onClick, tooltip }: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  tooltip: string;
}) => (
  <motion.button
    whileHover={{ scale: 1.05 }}
    whileTap={{ scale: 0.95 }}
    onClick={onClick}
    title={tooltip}
    className="flex flex-col items-center gap-1 px-2 py-2 rounded-lg bg-gray-800/60 hover:bg-cyan-900/40 
      border border-gray-700/50 hover:border-cyan-500/30 transition-all text-gray-400 hover:text-cyan-300
      min-w-[52px]"
  >
    {icon}
    <span className="text-[10px] font-medium">{label}</span>
  </motion.button>
);

/* ─── Main Props ─── */

export interface SplatViewerControlsProps {
  open: boolean;
  onToggle: () => void;
  viewerType: 'gaussian' | 'triangle' | 'mesh' | null;
  onResetView?: () => void;
  onFrontView?: () => void;
  onSideView?: () => void;
  onTopView?: () => void;
  onToggleAutoRotate?: () => void;
  autoRotate?: boolean;
  showGrid?: boolean;
  onToggleGrid?: () => void;
  showAxes?: boolean;
  onToggleAxes?: () => void;
}

/* ─── Main Component ─── */

const SplatViewerControls: React.FC<SplatViewerControlsProps> = ({
  open,
  onToggle,
  viewerType,
  onResetView,
  onFrontView,
  onSideView,
  onTopView,
  onToggleAutoRotate,
  autoRotate = false,
  showGrid = true,
  onToggleGrid,
  showAxes = true,
  onToggleAxes,
}) => {
  const { settings, update } = useViewerSettings();

  // local copies for smooth slider handling
  const [localExposure, setLocalExposure] = useState(settings.exposure);
  const [localWireframe, setLocalWireframe] = useState(settings.wireframe);
  const [localBg, setLocalBg] = useState(settings.backgroundColor);
  const [localFov, setLocalFov] = useState(settings.fov ?? 60);

  useEffect(() => {
    update({ exposure: localExposure, wireframe: localWireframe, backgroundColor: localBg, fov: localFov });
  }, [localExposure, localWireframe, localBg, localFov, update]);

  // FOV ↔ Focal Length conversion helpers (36mm full-frame sensor)
  const SENSOR_WIDTH = 36;
  const fovToFocalLength = (fov: number) => Math.round(SENSOR_WIDTH / (2 * Math.tan((fov * Math.PI / 180) / 2)));
  const focalLengthToFov = (fl: number) => Math.round((2 * Math.atan(SENSOR_WIDTH / (2 * fl))) * (180 / Math.PI));

  const isGaussian = viewerType === 'gaussian';

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ x: 320, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 320, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="absolute right-0 top-0 h-full z-30 w-[280px] pointer-events-auto"
        >
          <div className="h-full bg-gradient-to-b from-gray-900/[0.97] to-gray-950/[0.97] backdrop-blur-2xl 
            border-l border-cyan-500/15 shadow-2xl shadow-black/60 flex flex-col">

            {/* ── Header ── */}
            <div className="flex items-center justify-between px-4 py-3 
              bg-gradient-to-r from-cyan-600/15 to-blue-600/15 border-b border-cyan-500/15 shrink-0">
              <h3 className="font-semibold text-white flex items-center gap-2 text-sm">
                <Settings2 className="w-4 h-4 text-cyan-400" />
                Viewer Controls
              </h3>
              <button
                onClick={onToggle}
                className="p-1.5 hover:bg-white/10 rounded-lg transition-colors group"
                title="Close panel (H)"
              >
                <X className="w-4 h-4 text-gray-400 group-hover:text-white transition-colors" />
              </button>
            </div>

            {/* ── Scrollable Content ── */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-5">

              {/* ── Camera Presets ── */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-cyan-400 uppercase tracking-wider flex items-center gap-2">
                  <Camera className="w-3.5 h-3.5" />
                  Camera Presets
                </h4>
                <div className="grid grid-cols-4 gap-2">
                  <CameraPresetButton
                    label="Reset"
                    icon={<RotateCcw className="w-4 h-4" />}
                    onClick={() => onResetView?.()}
                    tooltip="Reset camera to default position (R / Home)"
                  />
                  <CameraPresetButton
                    label="Front"
                    icon={<Box className="w-4 h-4" />}
                    onClick={() => onFrontView?.()}
                    tooltip="Front view (Numpad 1)"
                  />
                  <CameraPresetButton
                    label="Side"
                    icon={<Layers className="w-4 h-4" />}
                    onClick={() => onSideView?.()}
                    tooltip="Right side view (Numpad 3)"
                  />
                  <CameraPresetButton
                    label="Top"
                    icon={<ArrowUp className="w-4 h-4" />}
                    onClick={() => onTopView?.()}
                    tooltip="Top-down view (Numpad 7)"
                  />
                </div>

                {/* Auto-rotate */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-300 flex items-center gap-2">
                    <RefreshCw className={`w-4 h-4 text-gray-500 ${autoRotate ? 'animate-spin' : ''}`} />
                    Auto-Rotate
                  </span>
                  <button
                    onClick={() => onToggleAutoRotate?.()}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                      autoRotate
                        ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-500/30'
                        : 'bg-gray-700/60 text-gray-400 hover:bg-gray-600/60'
                    }`}
                  >
                    {autoRotate ? 'ON' : 'OFF'}
                  </button>
                </div>
              </div>

              <div className="border-t border-gray-700/40" />

              {/* ── View Options ── */}
              {viewerType !== 'gaussian' && (
                <>
                  <div className="space-y-3">
                    <h4 className="text-xs font-semibold text-cyan-400 uppercase tracking-wider flex items-center gap-2">
                      <Eye className="w-3.5 h-3.5" />
                      View Options
                    </h4>
                    <div className="space-y-3 pl-1">
                      <Toggle
                        label="Show Grid"
                        checked={showGrid}
                        onChange={() => onToggleGrid?.()}
                        icon={<Grid3X3 className="w-4 h-4 text-gray-500" />}
                      />
                      <Toggle
                        label="Show Axes"
                        checked={showAxes}
                        onChange={() => onToggleAxes?.()}
                        icon={<Crosshair className="w-4 h-4 text-gray-500" />}
                      />
                    </div>
                  </div>
                  <div className="border-t border-gray-700/40" />
                </>
              )}

              {/* ── Display ── */}
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
                    icon={<Lightbulb className="w-4 h-4 text-gray-500" />}
                  />
                  <Toggle
                    label="Wireframe"
                    checked={localWireframe}
                    onChange={setLocalWireframe}
                    icon={<Grid3X3 className="w-4 h-4 text-gray-500" />}
                    disabled={isGaussian}
                    tooltip={isGaussian
                      ? 'Wireframe is not available for Gaussian Splats (they render as 2D projected Gaussians, not meshes)'
                      : 'Toggle wireframe rendering overlay'
                    }
                  />
                  <ColorInput
                    label="Background"
                    value={localBg}
                    onChange={setLocalBg}
                    icon={<Palette className="w-4 h-4 text-gray-500" />}
                  />
                </div>
              </div>

              <div className="border-t border-gray-700/40" />

              {/* ── Focal Length / FOV ── */}
              <div className="space-y-4">
                <h4 className="text-xs font-semibold text-cyan-400 uppercase tracking-wider flex items-center gap-2">
                  <Camera className="w-3.5 h-3.5" />
                  Lens
                </h4>
                <div className="space-y-4 pl-1">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                        <Camera className="w-4 h-4 text-gray-500" />
                        Focal Length
                      </label>
                      <span className="text-xs font-mono text-cyan-400 bg-cyan-950/50 px-2 py-0.5 rounded">
                        {fovToFocalLength(localFov)}mm
                      </span>
                    </div>
                    <input
                      type="range"
                      min={10}
                      max={200}
                      step={1}
                      value={fovToFocalLength(localFov)}
                      onChange={(e) => setLocalFov(focalLengthToFov(parseInt(e.target.value)))}
                      className="w-full h-1.5 bg-gray-700 rounded-full appearance-none cursor-pointer accent-cyan-500
                        [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 
                        [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-cyan-500 
                        [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:shadow-cyan-500/30
                        [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:transition-transform
                        [&::-webkit-slider-thumb]:hover:scale-110"
                    />
                    <div className="flex justify-between text-[9px] text-gray-500 px-0.5">
                      <span>Wide 10mm</span>
                      <span>Normal 50mm</span>
                      <span>Tele 200mm</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                        <Eye className="w-4 h-4 text-gray-500" />
                        Field of View
                      </label>
                      <span className="text-xs font-mono text-cyan-400 bg-cyan-950/50 px-2 py-0.5 rounded">
                        {localFov}°
                      </span>
                    </div>
                    <input
                      type="range"
                      min={5}
                      max={120}
                      step={1}
                      value={localFov}
                      onChange={(e) => setLocalFov(parseInt(e.target.value))}
                      className="w-full h-1.5 bg-gray-700 rounded-full appearance-none cursor-pointer accent-cyan-500
                        [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 
                        [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-cyan-500 
                        [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:shadow-cyan-500/30
                        [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:transition-transform
                        [&::-webkit-slider-thumb]:hover:scale-110"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-700/40" />

              {/* ── Performance ── */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-cyan-400 uppercase tracking-wider flex items-center gap-2">
                  <MonitorSmartphone className="w-3.5 h-3.5" />
                  Performance
                </h4>
                <div className="pl-1">
                  <QualitySelector />
                </div>
              </div>

            </div>

            {/* ── Footer ── */}
            <div className="px-4 py-2.5 bg-gray-950/60 border-t border-gray-800/50 shrink-0">
              <p className="text-[10px] text-gray-500 text-center">
                Press <kbd className="px-1 py-0.5 bg-gray-800 rounded text-gray-400 text-[9px]">H</kbd> to toggle &nbsp;·&nbsp;
                <kbd className="px-1 py-0.5 bg-gray-800 rounded text-gray-400 text-[9px]">?</kbd> for help
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SplatViewerControls;
