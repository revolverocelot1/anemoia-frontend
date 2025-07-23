import React from 'react';
import { motion } from 'framer-motion';
import { X, Type, Palette, Square, Move } from 'lucide-react';
import { SubtitleStyle, SubtitlePosition } from '../../types/caption-studio';

interface StyleEditorProps {
  style: SubtitleStyle;
  position: SubtitlePosition;
  onUpdateStyle: (style: SubtitleStyle) => void;
  onUpdatePosition: (position: SubtitlePosition) => void;
  onClose: () => void;
}

const StyleEditor: React.FC<StyleEditorProps> = ({
  style,
  position,
  onUpdateStyle,
  onUpdatePosition,
  onClose
}) => {
  const fontFamilies = [
    'Arial',
    'Helvetica',
    'Times New Roman',
    'Georgia',
    'Courier New',
    'Verdana',
    'Trebuchet MS',
    'Impact',
    'Comic Sans MS'
  ];

  const handleStyleChange = (key: keyof SubtitleStyle, value: any) => {
    onUpdateStyle({ ...style, [key]: value });
  };

  const handlePositionChange = (key: keyof SubtitlePosition, value: any) => {
    onUpdatePosition({ ...position, [key]: value });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-gray-900 rounded-xl p-6 max-w-2xl w-full max-h-[80vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">Default Subtitle Style</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-6 overflow-y-auto max-h-[60vh]">
          {/* Typography */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Type className="w-5 h-5 text-purple-500" />
              Typography
            </h3>
            
            {/* Font Family */}
            <div>
              <label className="block text-sm text-gray-400 mb-2">Font Family</label>
              <select
                value={style.fontFamily}
                onChange={(e) => handleStyleChange('fontFamily', e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 text-white rounded-lg border border-gray-700 focus:border-purple-500"
              >
                {fontFamilies.map(font => (
                  <option key={font} value={font}>{font}</option>
                ))}
              </select>
            </div>

            {/* Font Size */}
            <div>
              <label className="block text-sm text-gray-400 mb-2">
                Font Size: {style.fontSize}px
              </label>
              <input
                type="range"
                min="12"
                max="72"
                value={style.fontSize}
                onChange={(e) => handleStyleChange('fontSize', parseInt(e.target.value))}
                className="w-full"
              />
            </div>

            {/* Font Weight & Style */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Font Weight</label>
                <select
                  value={style.fontWeight}
                  onChange={(e) => handleStyleChange('fontWeight', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 text-white rounded-lg border border-gray-700 focus:border-purple-500"
                >
                  <option value="normal">Normal</option>
                  <option value="bold">Bold</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Font Style</label>
                <select
                  value={style.fontStyle}
                  onChange={(e) => handleStyleChange('fontStyle', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 text-white rounded-lg border border-gray-700 focus:border-purple-500"
                >
                  <option value="normal">Normal</option>
                  <option value="italic">Italic</option>
                </select>
              </div>
            </div>
          </div>

          {/* Colors */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Palette className="w-5 h-5 text-purple-500" />
              Colors
            </h3>
            
            {/* Text Color */}
            <div>
              <label className="block text-sm text-gray-400 mb-2">Text Color</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={style.color}
                  onChange={(e) => handleStyleChange('color', e.target.value)}
                  className="w-12 h-12 bg-gray-800 rounded cursor-pointer"
                />
                <input
                  type="text"
                  value={style.color}
                  onChange={(e) => handleStyleChange('color', e.target.value)}
                  className="flex-1 px-3 py-2 bg-gray-800 text-white rounded-lg border border-gray-700 focus:border-purple-500"
                />
              </div>
            </div>

            {/* Background */}
            <div>
              <label className="block text-sm text-gray-400 mb-2">Background Color</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={style.backgroundColor}
                  onChange={(e) => handleStyleChange('backgroundColor', e.target.value)}
                  className="w-12 h-12 bg-gray-800 rounded cursor-pointer"
                />
                <input
                  type="text"
                  value={style.backgroundColor}
                  onChange={(e) => handleStyleChange('backgroundColor', e.target.value)}
                  className="flex-1 px-3 py-2 bg-gray-800 text-white rounded-lg border border-gray-700 focus:border-purple-500"
                />
              </div>
              
              {/* Background Opacity */}
              <div className="mt-2">
                <label className="block text-sm text-gray-400 mb-2">
                  Background Opacity: {Math.round((style.backgroundOpacity || 0.75) * 100)}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={(style.backgroundOpacity || 0.75) * 100}
                  onChange={(e) => handleStyleChange('backgroundOpacity', parseInt(e.target.value) / 100)}
                  className="w-full"
                />
              </div>
            </div>
          </div>

          {/* Effects */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Square className="w-5 h-5 text-purple-500" />
              Effects
            </h3>
            
            {/* Stroke */}
            <div>
              <label className="block text-sm text-gray-400 mb-2">
                Stroke Width: {style.strokeWidth}px
              </label>
              <input
                type="range"
                min="0"
                max="5"
                value={style.strokeWidth}
                onChange={(e) => handleStyleChange('strokeWidth', parseInt(e.target.value))}
                className="w-full"
              />
                             {(style.strokeWidth || 0) > 0 && (
                <div className="flex gap-2 mt-2">
                  <input
                    type="color"
                    value={style.strokeColor}
                    onChange={(e) => handleStyleChange('strokeColor', e.target.value)}
                    className="w-12 h-12 bg-gray-800 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={style.strokeColor}
                    onChange={(e) => handleStyleChange('strokeColor', e.target.value)}
                    className="flex-1 px-3 py-2 bg-gray-800 text-white rounded-lg border border-gray-700 focus:border-purple-500"
                  />
                </div>
              )}
            </div>

            {/* Shadow */}
            <div>
              <label className="block text-sm text-gray-400 mb-2">
                Shadow Blur: {style.shadowBlur}px
              </label>
              <input
                type="range"
                min="0"
                max="10"
                value={style.shadowBlur}
                onChange={(e) => handleStyleChange('shadowBlur', parseInt(e.target.value))}
                className="w-full"
              />
                             {(style.shadowBlur || 0) > 0 && (
                <div className="flex gap-2 mt-2">
                  <input
                    type="color"
                    value={style.shadowColor}
                    onChange={(e) => handleStyleChange('shadowColor', e.target.value)}
                    className="w-12 h-12 bg-gray-800 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={style.shadowColor}
                    onChange={(e) => handleStyleChange('shadowColor', e.target.value)}
                    className="flex-1 px-3 py-2 bg-gray-800 text-white rounded-lg border border-gray-700 focus:border-purple-500"
                  />
                </div>
              )}
            </div>

            {/* Padding */}
            <div>
              <label className="block text-sm text-gray-400 mb-2">
                Padding: {style.padding}px
              </label>
              <input
                type="range"
                min="0"
                max="30"
                value={style.padding}
                onChange={(e) => handleStyleChange('padding', parseInt(e.target.value))}
                className="w-full"
              />
            </div>
          </div>

          {/* Position */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Move className="w-5 h-5 text-purple-500" />
              Default Position
            </h3>
            
            {/* Alignment */}
            <div>
              <label className="block text-sm text-gray-400 mb-2">Horizontal Alignment</label>
              <div className="flex gap-2">
                {(['left', 'center', 'right'] as const).map(align => (
                  <button
                    key={align}
                    onClick={() => handlePositionChange('alignment', align)}
                    className={`flex-1 py-2 rounded-lg transition-all ${
                      position.alignment === align
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    }`}
                  >
                    {align.charAt(0).toUpperCase() + align.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Vertical Alignment */}
            <div>
              <label className="block text-sm text-gray-400 mb-2">Vertical Alignment</label>
              <div className="flex gap-2">
                {(['top', 'middle', 'bottom'] as const).map(align => (
                  <button
                    key={align}
                    onClick={() => handlePositionChange('verticalAlignment', align)}
                    className={`flex-1 py-2 rounded-lg transition-all ${
                      position.verticalAlignment === align
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    }`}
                  >
                    {align.charAt(0).toUpperCase() + align.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Position X/Y */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  X Position: {position.x}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={position.x}
                  onChange={(e) => handlePositionChange('x', parseInt(e.target.value))}
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  Y Position: {position.y}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={position.y}
                  onChange={(e) => handlePositionChange('y', parseInt(e.target.value))}
                  className="w-full"
                />
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default StyleEditor; 