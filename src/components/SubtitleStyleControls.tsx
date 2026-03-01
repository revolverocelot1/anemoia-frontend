import React, { useState } from 'react';
import { useSubtitleStore } from '../stores/subtitle-store';
import { SubtitleStyle } from '../types/subtitle';
import { 
  Palette, Type, Move, Sliders, AlignLeft, AlignCenter, 
  AlignRight, Maximize2, Settings2, ChevronDown, ChevronUp 
} from 'lucide-react';

interface StylePreset {
  name: string;
  style: Partial<SubtitleStyle>;
}

const STYLE_PRESETS: StylePreset[] = [
  {
    name: 'Classic',
    style: {
      fontFamily: 'Arial, sans-serif',
      fontSize: 24,
      fontColor: '#FFFFFF',
      backgroundColor: '#000000',
      backgroundOpacity: 0.8,
      textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
      position: 'bottom-center',
      alignment: 'center'
    }
  },
  {
    name: 'Modern',
    style: {
      fontFamily: 'Inter, sans-serif',
      fontSize: 28,
      fontColor: '#FFFFFF',
      backgroundColor: '#1F2937',
      backgroundOpacity: 0.9,
      textShadow: 'none',
      borderRadius: 8,
      position: 'bottom-center',
      alignment: 'center'
    }
  },
  {
    name: 'Neon',
    style: {
      fontFamily: 'Orbitron, monospace',
      fontSize: 26,
      fontColor: '#00FFFF',
      backgroundColor: '#000000',
      backgroundOpacity: 0.7,
      textShadow: '0 0 10px #00FFFF, 0 0 20px #00FFFF',
      position: 'bottom-center',
      alignment: 'center'
    }
  },
  {
    name: 'Minimal',
    style: {
      fontFamily: 'Helvetica, sans-serif',
      fontSize: 22,
      fontColor: '#FFFFFF',
      backgroundColor: 'transparent',
      backgroundOpacity: 0,
      textShadow: '1px 1px 2px rgba(0,0,0,0.9)',
      position: 'bottom-center',
      alignment: 'center'
    }
  },
  {
    name: 'Cinema',
    style: {
      fontFamily: 'Georgia, serif',
      fontSize: 30,
      fontColor: '#FFEB3B',
      backgroundColor: '#000000',
      backgroundOpacity: 0.85,
      textShadow: '3px 3px 6px rgba(0,0,0,0.9)',
      letterSpacing: 1,
      position: 'bottom-center',
      alignment: 'center'
    }
  }
];

const FONT_FAMILIES = [
  { value: 'Arial, sans-serif', label: 'Arial' },
  { value: 'Helvetica, sans-serif', label: 'Helvetica' },
  { value: 'Georgia, serif', label: 'Georgia' },
  { value: 'Times New Roman, serif', label: 'Times New Roman' },
  { value: 'Courier New, monospace', label: 'Courier New' },
  { value: 'Inter, sans-serif', label: 'Inter' },
  { value: 'Roboto, sans-serif', label: 'Roboto' },
  { value: 'Open Sans, sans-serif', label: 'Open Sans' },
  { value: 'Montserrat, sans-serif', label: 'Montserrat' },
  { value: 'Orbitron, monospace', label: 'Orbitron' },
  { value: 'Comic Sans MS, cursive', label: 'Comic Sans' }
];

const POSITIONS = [
  { value: 'top-left', label: 'Top Left' },
  { value: 'top-center', label: 'Top Center' },
  { value: 'top-right', label: 'Top Right' },
  { value: 'middle-left', label: 'Middle Left' },
  { value: 'middle-center', label: 'Middle Center' },
  { value: 'middle-right', label: 'Middle Right' },
  { value: 'bottom-left', label: 'Bottom Left' },
  { value: 'bottom-center', label: 'Bottom Center' },
  { value: 'bottom-right', label: 'Bottom Right' }
];

export const SubtitleStyleControls: React.FC = () => {
  const { subtitleStyle, updateStyle, applyStyleToSelected, selectedSegmentIds } = useSubtitleStore();
  const [expandedSections, setExpandedSections] = useState({
    typography: true,
    colors: true,
    positioning: true,
    effects: false,
    presets: false
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const handleStyleChange = (updates: Partial<SubtitleStyle>) => {
    updateStyle(updates);
  };

  const applyToSelected = () => {
    if (selectedSegmentIds.length > 0) {
      applyStyleToSelected(subtitleStyle);
    }
  };

  const applyPreset = (preset: StylePreset) => {
    updateStyle(preset.style);
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <Settings2 className="w-5 h-5" />
          Subtitle Style Controls
        </h3>
        {selectedSegmentIds.length > 0 && (
          <button
            onClick={applyToSelected}
            className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
          >
            Apply to Selected ({selectedSegmentIds.length})
          </button>
        )}
      </div>

      {/* Presets */}
      <div className="border-t border-gray-700 pt-4">
        <button
          onClick={() => toggleSection('presets')}
          className="flex items-center justify-between w-full text-white hover:text-gray-300"
        >
          <span className="flex items-center gap-2">
            <Palette className="w-4 h-4" />
            Style Presets
          </span>
          {expandedSections.presets ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        {expandedSections.presets && (
          <div className="mt-3 grid grid-cols-2 gap-2">
            {STYLE_PRESETS.map((preset) => (
              <button
                key={preset.name}
                onClick={() => applyPreset(preset)}
                className="px-3 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 text-sm"
              >
                {preset.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Typography */}
      <div className="border-t border-gray-700 pt-4">
        <button
          onClick={() => toggleSection('typography')}
          className="flex items-center justify-between w-full text-white hover:text-gray-300"
        >
          <span className="flex items-center gap-2">
            <Type className="w-4 h-4" />
            Typography
          </span>
          {expandedSections.typography ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        {expandedSections.typography && (
          <div className="mt-3 space-y-3">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Font Family</label>
              <select
                value={subtitleStyle.fontFamily}
                onChange={(e) => handleStyleChange({ fontFamily: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500"
              >
                {FONT_FAMILIES.map(font => (
                  <option key={font.value} value={font.value}>{font.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Font Size: {subtitleStyle.fontSize}px
              </label>
              <input
                type="range"
                min="12"
                max="72"
                value={subtitleStyle.fontSize}
                onChange={(e) => handleStyleChange({ fontSize: parseInt(e.target.value) })}
                className="w-full"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => handleStyleChange({ 
                  fontWeight: subtitleStyle.fontWeight === 'bold' ? 'normal' : 'bold' 
                })}
                className={`px-3 py-2 rounded ${
                  subtitleStyle.fontWeight === 'bold' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-700 text-gray-300'
                }`}
              >
                <strong>B</strong>
              </button>
              <button
                onClick={() => handleStyleChange({ 
                  fontStyle: subtitleStyle.fontStyle === 'italic' ? 'normal' : 'italic' 
                })}
                className={`px-3 py-2 rounded ${
                  subtitleStyle.fontStyle === 'italic' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-700 text-gray-300'
                }`}
              >
                <em>I</em>
              </button>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Letter Spacing: {subtitleStyle.letterSpacing || 0}px
              </label>
              <input
                type="range"
                min="-2"
                max="10"
                value={subtitleStyle.letterSpacing || 0}
                onChange={(e) => handleStyleChange({ letterSpacing: parseInt(e.target.value) })}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Line Height: {subtitleStyle.lineHeight}
              </label>
              <input
                type="range"
                min="1"
                max="3"
                step="0.1"
                value={subtitleStyle.lineHeight}
                onChange={(e) => handleStyleChange({ lineHeight: parseFloat(e.target.value) })}
                className="w-full"
              />
            </div>
          </div>
        )}
      </div>

      {/* Colors */}
      <div className="border-t border-gray-700 pt-4">
        <button
          onClick={() => toggleSection('colors')}
          className="flex items-center justify-between w-full text-white hover:text-gray-300"
        >
          <span className="flex items-center gap-2">
            <Palette className="w-4 h-4" />
            Colors & Background
          </span>
          {expandedSections.colors ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        {expandedSections.colors && (
          <div className="mt-3 space-y-3">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Text Color</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={subtitleStyle.fontColor}
                  onChange={(e) => handleStyleChange({ fontColor: e.target.value })}
                  className="w-12 h-10 rounded cursor-pointer"
                />
                <input
                  type="text"
                  value={subtitleStyle.fontColor}
                  onChange={(e) => handleStyleChange({ fontColor: e.target.value })}
                  className="flex-1 px-3 py-2 bg-gray-700 text-white rounded border border-gray-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Background Color</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={subtitleStyle.backgroundColor}
                  onChange={(e) => handleStyleChange({ backgroundColor: e.target.value })}
                  className="w-12 h-10 rounded cursor-pointer"
                />
                <input
                  type="text"
                  value={subtitleStyle.backgroundColor}
                  onChange={(e) => handleStyleChange({ backgroundColor: e.target.value })}
                  className="flex-1 px-3 py-2 bg-gray-700 text-white rounded border border-gray-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Background Opacity: {Math.round((subtitleStyle.backgroundOpacity || 0) * 100)}%
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={(subtitleStyle.backgroundOpacity || 0) * 100}
                onChange={(e) => handleStyleChange({ backgroundOpacity: parseInt(e.target.value) / 100 })}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Background Blur: {subtitleStyle.backgroundBlur || 0}px
              </label>
              <input
                type="range"
                min="0"
                max="20"
                value={subtitleStyle.backgroundBlur || 0}
                onChange={(e) => handleStyleChange({ backgroundBlur: parseInt(e.target.value) })}
                className="w-full"
              />
              <p className="text-xs text-gray-500 mt-1">Adds a blur effect to the subtitle background</p>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Padding: {subtitleStyle.padding}px
              </label>
              <input
                type="range"
                min="0"
                max="30"
                value={subtitleStyle.padding}
                onChange={(e) => handleStyleChange({ padding: parseInt(e.target.value) })}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Border Radius: {subtitleStyle.borderRadius}px
              </label>
              <input
                type="range"
                min="0"
                max="20"
                value={subtitleStyle.borderRadius}
                onChange={(e) => handleStyleChange({ borderRadius: parseInt(e.target.value) })}
                className="w-full"
              />
            </div>
          </div>
        )}
      </div>

      {/* Positioning */}
      <div className="border-t border-gray-700 pt-4">
        <button
          onClick={() => toggleSection('positioning')}
          className="flex items-center justify-between w-full text-white hover:text-gray-300"
        >
          <span className="flex items-center gap-2">
            <Move className="w-4 h-4" />
            Positioning
          </span>
          {expandedSections.positioning ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        {expandedSections.positioning && (
          <div className="mt-3 space-y-3">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Position</label>
              <div className="grid grid-cols-3 gap-1">
                {POSITIONS.map(pos => (
                  <button
                    key={pos.value}
                    onClick={() => handleStyleChange({ position: pos.value as any })}
                    className={`px-2 py-2 text-xs rounded ${
                      subtitleStyle.position === pos.value
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    {pos.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Text Alignment</label>
              <div className="flex gap-2">
                <button
                  onClick={() => handleStyleChange({ alignment: 'left' })}
                  className={`flex-1 px-3 py-2 rounded ${
                    subtitleStyle.alignment === 'left'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-300'
                  }`}
                >
                  <AlignLeft className="w-4 h-4 mx-auto" />
                </button>
                <button
                  onClick={() => handleStyleChange({ alignment: 'center' })}
                  className={`flex-1 px-3 py-2 rounded ${
                    subtitleStyle.alignment === 'center'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-300'
                  }`}
                >
                  <AlignCenter className="w-4 h-4 mx-auto" />
                </button>
                <button
                  onClick={() => handleStyleChange({ alignment: 'right' })}
                  className={`flex-1 px-3 py-2 rounded ${
                    subtitleStyle.alignment === 'right'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-300'
                  }`}
                >
                  <AlignRight className="w-4 h-4 mx-auto" />
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Horizontal Margin: {subtitleStyle.marginX}px
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={subtitleStyle.marginX}
                onChange={(e) => handleStyleChange({ marginX: parseInt(e.target.value) })}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Vertical Margin: {subtitleStyle.marginY}px
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={subtitleStyle.marginY}
                onChange={(e) => handleStyleChange({ marginY: parseInt(e.target.value) })}
                className="w-full"
              />
            </div>
          </div>
        )}
      </div>

      {/* Effects */}
      <div className="border-t border-gray-700 pt-4">
        <button
          onClick={() => toggleSection('effects')}
          className="flex items-center justify-between w-full text-white hover:text-gray-300"
        >
          <span className="flex items-center gap-2">
            <Sliders className="w-4 h-4" />
            Effects
          </span>
          {expandedSections.effects ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        {expandedSections.effects && (
          <div className="mt-3 space-y-3">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Text Shadow</label>
              <select
                value={subtitleStyle.textShadow || 'none'}
                onChange={(e) => handleStyleChange({ textShadow: e.target.value === 'none' ? '' : e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600"
              >
                <option value="none">None</option>
                <option value="1px 1px 2px rgba(0,0,0,0.5)">Subtle</option>
                <option value="2px 2px 4px rgba(0,0,0,0.8)">Normal</option>
                <option value="3px 3px 6px rgba(0,0,0,0.9)">Strong</option>
                <option value="0 0 10px rgba(0,0,0,0.8)">Glow</option>
                <option value="0 0 10px #00FFFF, 0 0 20px #00FFFF">Neon</option>
              </select>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Text Stroke</label>
              <select
                value={subtitleStyle.textStroke || 'none'}
                onChange={(e) => handleStyleChange({ textStroke: e.target.value === 'none' ? '' : e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600"
              >
                <option value="none">None</option>
                <option value="-webkit-text-stroke: 1px black">Thin</option>
                <option value="-webkit-text-stroke: 2px black">Medium</option>
                <option value="-webkit-text-stroke: 3px black">Thick</option>
              </select>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}; 