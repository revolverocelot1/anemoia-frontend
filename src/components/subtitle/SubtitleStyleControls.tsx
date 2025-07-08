import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useSubtitleStore } from '../../stores/subtitle-store';
import type { SubtitleStyle } from '../../types/subtitle';

const FONT_FAMILIES = [
  { value: 'Arial, sans-serif', label: 'Arial' },
  { value: 'Helvetica, sans-serif', label: 'Helvetica' },
  { value: 'Georgia, serif', label: 'Georgia' },
  { value: 'Times New Roman, serif', label: 'Times' },
  { value: 'Courier New, monospace', label: 'Courier' },
  { value: 'Comic Sans MS, cursive', label: 'Comic Sans' },
  { value: 'Impact, fantasy', label: 'Impact' },
  { value: 'Verdana, sans-serif', label: 'Verdana' }
];

const PRESET_COLORS = [
  '#FFFFFF', '#000000', '#FF0000', '#00FF00', '#0000FF',
  '#FFFF00', '#FF00FF', '#00FFFF', '#FFA500', '#800080'
];

interface SubtitleStyleControlsProps {
  trackId?: string;
}

export const SubtitleStyleControls: React.FC<SubtitleStyleControlsProps> = ({ 
  trackId 
}) => {
  const { currentProject, updateTrackStyle } = useSubtitleStore();
  const [activeTab, setActiveTab] = useState<'text' | 'background' | 'effects'>('text');
  
  const activeTrack = trackId 
    ? currentProject?.tracks.find(t => t.id === trackId)
    : currentProject?.tracks.find(t => t.id === currentProject.activeTrackId);
    
  if (!activeTrack) return null;
  
  const style = activeTrack.style;
  
  const updateStyle = (updates: Partial<SubtitleStyle>) => {
    updateTrackStyle(activeTrack.id, updates);
  };

  const renderTextTab = () => (
    <div className="space-y-4">
      {/* Font Family */}
      <div>
        <label className="block text-sm font-medium text-gray-400 mb-2">
          Font Family
        </label>
        <select
          value={style.fontFamily}
          onChange={(e) => updateStyle({ fontFamily: e.target.value })}
          className="w-full bg-gray-700 text-white rounded px-3 py-2 outline-none focus:ring-2 focus:ring-cyan-500"
        >
          {FONT_FAMILIES.map(font => (
            <option key={font.value} value={font.value}>{font.label}</option>
          ))}
        </select>
      </div>
      
      {/* Font Size */}
      <div>
        <label className="block text-sm font-medium text-gray-400 mb-2">
          Font Size: {style.fontSize}px
        </label>
        <input
          type="range"
          min="12"
          max="72"
          value={style.fontSize}
          onChange={(e) => updateStyle({ fontSize: parseInt(e.target.value) })}
          className="w-full"
        />
      </div>
      
      {/* Font Color */}
      <div>
        <label className="block text-sm font-medium text-gray-400 mb-2">
          Text Color
        </label>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={style.color}
            onChange={(e) => updateStyle({ color: e.target.value })}
            className="w-16 h-8 rounded cursor-pointer"
          />
          <div className="flex gap-1">
            {PRESET_COLORS.map(color => (
              <button
                key={color}
                onClick={() => updateStyle({ color })}
                className="w-6 h-6 rounded border border-gray-600"
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>
      </div>
      
      {/* Font Weight */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">
            Font Weight
          </label>
          <select
            value={style.fontWeight}
            onChange={(e) => updateStyle({ fontWeight: e.target.value as any })}
            className="w-full bg-gray-700 text-white rounded px-3 py-2 outline-none focus:ring-2 focus:ring-cyan-500"
          >
            <option value="normal">Normal</option>
            <option value="bold">Bold</option>
            <option value="lighter">Lighter</option>
            <option value="bolder">Bolder</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">
            Font Style
          </label>
          <select
            value={style.fontStyle}
            onChange={(e) => updateStyle({ fontStyle: e.target.value as any })}
            className="w-full bg-gray-700 text-white rounded px-3 py-2 outline-none focus:ring-2 focus:ring-cyan-500"
          >
            <option value="normal">Normal</option>
            <option value="italic">Italic</option>
          </select>
        </div>
      </div>
    </div>
  );

  const renderBackgroundTab = () => (
    <div className="space-y-4">
      {/* Background Color */}
      <div>
        <label className="block text-sm font-medium text-gray-400 mb-2">
          Background Color
        </label>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={style.backgroundColor || '#000000'}
            onChange={(e) => updateStyle({ backgroundColor: e.target.value })}
            className="w-16 h-8 rounded cursor-pointer"
          />
          <button
            onClick={() => updateStyle({ backgroundColor: undefined })}
            className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm"
          >
            None
          </button>
        </div>
      </div>
      
      {/* Background Opacity */}
      {style.backgroundColor && (
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">
            Background Opacity: {Math.round((style.backgroundOpacity || 1) * 100)}%
          </label>
          <input
            type="range"
            min="0"
            max="100"
            value={(style.backgroundOpacity || 1) * 100}
            onChange={(e) => updateStyle({ backgroundOpacity: parseInt(e.target.value) / 100 })}
            className="w-full"
          />
        </div>
      )}
      
      {/* Padding */}
      <div>
        <label className="block text-sm font-medium text-gray-400 mb-2">
          Padding: {style.padding}px
        </label>
        <input
          type="range"
          min="0"
          max="40"
          value={style.padding}
          onChange={(e) => updateStyle({ padding: parseInt(e.target.value) })}
          className="w-full"
        />
      </div>
      
      {/* Border Radius */}
      <div>
        <label className="block text-sm font-medium text-gray-400 mb-2">
          Border Radius: {style.borderRadius}px
        </label>
        <input
          type="range"
          min="0"
          max="20"
          value={style.borderRadius}
          onChange={(e) => updateStyle({ borderRadius: parseInt(e.target.value) })}
          className="w-full"
        />
      </div>
    </div>
  );

  const renderEffectsTab = () => (
    <div className="space-y-4">
      {/* Text Shadow */}
      <div>
        <label className="block text-sm font-medium text-gray-400 mb-2">
          Text Shadow
        </label>
        <div className="space-y-2">
          <input
            type="color"
            value={style.shadowColor || '#000000'}
            onChange={(e) => updateStyle({ shadowColor: e.target.value })}
            className="w-16 h-8 rounded cursor-pointer"
          />
          <div className="grid grid-cols-3 gap-2">
            <input
              type="number"
              value={style.shadowOffsetX || 0}
              onChange={(e) => updateStyle({ shadowOffsetX: parseInt(e.target.value) })}
              placeholder="X"
              className="bg-gray-700 text-white rounded px-2 py-1 text-sm"
            />
            <input
              type="number"
              value={style.shadowOffsetY || 0}
              onChange={(e) => updateStyle({ shadowOffsetY: parseInt(e.target.value) })}
              placeholder="Y"
              className="bg-gray-700 text-white rounded px-2 py-1 text-sm"
            />
            <input
              type="number"
              value={style.shadowBlur || 0}
              onChange={(e) => updateStyle({ shadowBlur: parseInt(e.target.value) })}
              placeholder="Blur"
              className="bg-gray-700 text-white rounded px-2 py-1 text-sm"
            />
          </div>
        </div>
      </div>
      
      {/* Text Stroke */}
      <div>
        <label className="block text-sm font-medium text-gray-400 mb-2">
          Text Stroke
        </label>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={style.strokeColor || '#000000'}
            onChange={(e) => updateStyle({ strokeColor: e.target.value })}
            className="w-16 h-8 rounded cursor-pointer"
          />
          <input
            type="number"
            min="0"
            max="10"
            value={style.strokeWidth || 0}
            onChange={(e) => updateStyle({ strokeWidth: parseInt(e.target.value) })}
            placeholder="Width"
            className="bg-gray-700 text-white rounded px-2 py-1 text-sm w-20"
          />
        </div>
      </div>
      
      {/* Text Alignment */}
      <div>
        <label className="block text-sm font-medium text-gray-400 mb-2">
          Text Alignment
        </label>
        <div className="flex gap-2">
          {(['left', 'center', 'right'] as const).map(align => (
            <button
              key={align}
              onClick={() => updateStyle({ textAlign: align })}
              className={`px-3 py-1 rounded text-sm transition-colors ${
                style.textAlign === align
                  ? 'bg-cyan-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {align.charAt(0).toUpperCase() + align.slice(1)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <motion.div
      className="bg-gray-800 rounded-lg shadow-xl overflow-hidden"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* Header with tabs */}
      <div className="bg-gray-900 border-b border-gray-700">
        <div className="flex">
          {(['text', 'background', 'effects'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === tab
                  ? 'text-cyan-400 border-b-2 border-cyan-400'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>
      
      {/* Content */}
      <div className="p-4">
        {activeTab === 'text' && renderTextTab()}
        {activeTab === 'background' && renderBackgroundTab()}
        {activeTab === 'effects' && renderEffectsTab()}
      </div>
      
      {/* Preview */}
      <div className="bg-gray-900 p-4 border-t border-gray-700">
        <div className="text-sm text-gray-400 mb-2">Preview</div>
        <div className="bg-black rounded p-4 flex items-center justify-center min-h-[80px]">
          <div
            style={{
              fontFamily: style.fontFamily,
              fontSize: `${style.fontSize}px`,
              fontWeight: style.fontWeight,
              fontStyle: style.fontStyle,
              color: style.color,
              backgroundColor: style.backgroundColor,
              opacity: style.backgroundOpacity,
              textShadow: style.shadowColor
                ? `${style.shadowOffsetX}px ${style.shadowOffsetY}px ${style.shadowBlur}px ${style.shadowColor}`
                : 'none',
              WebkitTextStroke: style.strokeWidth 
                ? `${style.strokeWidth}px ${style.strokeColor}`
                : 'none',
              padding: `${style.padding}px`,
              borderRadius: `${style.borderRadius}px`,
              textAlign: style.textAlign,
            }}
          >
            Sample Subtitle Text
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default SubtitleStyleControls; 