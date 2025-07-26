import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Play, Pause, Upload, Download, Settings, Grid3X3, Maximize2, Info, Zap, Ruler, Camera, Eye, Palette, Sliders, Database, FileText } from 'lucide-react';
import TriangleSplattingViewer from '../components/TriangleSplattingViewer';
import CardGlass from '../components/CardGlass';
import AnimatedPage from '../components/AnimatedPage';
import HolographicStats from '../components/HolographicStats';
import { OFFStats } from '../viewers/triangle/offLoader';
import * as THREE from 'three';

const TriangleSplattingPage: React.FC = () => {
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [stats, setStats] = useState<OFFStats | null>(null);
  const [activeTab, setActiveTab] = useState<'rendering' | 'analysis' | 'export'>('rendering');
  const [measurements, setMeasurements] = useState<number[]>([]);
  const [settings, setSettings] = useState({
    // Basic settings
    wireframe: false,
    exposure: 1.0,
    showGrid: true,
    showStats: true,
    backgroundColor: '#000814',
    // Advanced settings
    backgroundBlend: 0.0,
    ambientIntensity: 0.6,
    sunIntensity: 1.0,
    shadowSoftness: 0.5,
    colorGrading: {
      contrast: 1.0,
      saturation: 1.1,
      brightness: 1.0
    },
    enableFresnel: true,
    fresnelPower: 2.0,
    enableRimLight: true,
    rimLightColor: '#00d4ff',
    rimLightIntensity: 0.3,
    // Professional features
    showMeasurements: false,
    showAxes: false,
    autoRotate: false,
    autoRotateSpeed: 2.0
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const viewerRef = useRef<HTMLDivElement>(null);

  // Add custom styles for the range sliders
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .triangle-splatting-slider {
        -webkit-appearance: none;
        width: 100%;
        height: 6px;
        border-radius: 3px;
        background: rgba(0, 212, 255, 0.1);
        outline: none;
        transition: background 0.3s;
      }
      
      .triangle-splatting-slider:hover {
        background: rgba(0, 212, 255, 0.2);
      }
      
      .triangle-splatting-slider::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background: linear-gradient(135deg, #00d4ff, #0066cc);
        cursor: pointer;
        box-shadow: 0 2px 8px rgba(0, 212, 255, 0.5);
        transition: all 0.3s;
      }
      
      .triangle-splatting-slider::-webkit-slider-thumb:hover {
        transform: scale(1.2);
        box-shadow: 0 4px 16px rgba(0, 212, 255, 0.8);
      }
      
      .triangle-splatting-slider::-moz-range-thumb {
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background: linear-gradient(135deg, #00d4ff, #0066cc);
        cursor: pointer;
        border: none;
        box-shadow: 0 2px 8px rgba(0, 212, 255, 0.5);
        transition: all 0.3s;
      }
      
      .triangle-splatting-slider::-moz-range-thumb:hover {
        transform: scale(1.2);
        box-shadow: 0 4px 16px rgba(0, 212, 255, 0.8);
      }
      
      .tab-active {
        background: linear-gradient(135deg, rgba(0, 212, 255, 0.2), rgba(124, 58, 237, 0.2));
        border-color: #00d4ff !important;
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (fileUrl) {
        URL.revokeObjectURL(fileUrl);
      }
      const url = URL.createObjectURL(file);
      setFileUrl(url);
      setFileName(file.name);
    }
  }, [fileUrl]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith('.off')) {
      if (fileUrl) {
        URL.revokeObjectURL(fileUrl);
      }
      const url = URL.createObjectURL(file);
      setFileUrl(url);
      setFileName(file.name);
    }
  }, [fileUrl]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleStatsUpdate = useCallback((newStats: OFFStats) => {
    setStats(newStats);
  }, []);

  const handleMeasurement = useCallback((distance: number) => {
    setMeasurements([...measurements, distance]);
  }, [measurements]);

  const loadSampleFile = useCallback(() => {
    setFileUrl('/test-garden.off');
    setFileName('garden.off (Sample)');
  }, []);

  const exportScreenshot = useCallback(() => {
    if (viewerRef.current) {
      const canvas = viewerRef.current.querySelector('canvas');
      if (canvas) {
        const link = document.createElement('a');
        link.download = `triangle-splatting-${Date.now()}.png`;
        link.href = canvas.toDataURL();
        link.click();
      }
    }
  }, []);

  const exportMeasurements = useCallback(() => {
    const data = {
      fileName,
      measurements,
      stats,
      timestamp: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.download = `measurements-${Date.now()}.json`;
    link.href = URL.createObjectURL(blob);
    link.click();
  }, [fileName, measurements, stats]);

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat().format(num);
  };

  return (
    <AnimatedPage>
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
        <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6 text-center">
          <h1 className="text-4xl lg:text-5xl font-bold mb-3 bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 bg-clip-text text-transparent animate-gradient">
            Triangle Splatting Viewer
          </h1>
          <p className="text-gray-400 text-lg max-w-3xl mx-auto">
            Professional-grade 3D visualization for Triangle Splatting research with advanced rendering and analysis tools
          </p>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
          {/* Left Panel - Controls */}
          <div className="xl:col-span-1 space-y-4">
            {/* File Upload */}
            <CardGlass className="p-5 bg-gradient-to-br from-gray-900/90 to-gray-800/90 border border-cyan-900/30">
              <h3 className="text-lg font-semibold text-cyan-400 mb-3 flex items-center gap-2">
                <Upload size={20} />
                Load Model
              </h3>
              
              <input
                ref={fileInputRef}
                type="file"
                accept=".off"
                onChange={handleFileUpload}
                className="hidden"
              />
              
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white py-3 px-4 rounded-lg transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
              >
                <Upload size={18} />
                Upload .off File
              </button>

              <div className="mt-3 text-center text-sm text-gray-500">
                or
              </div>

              <button
                onClick={loadSampleFile}
                className="w-full mt-3 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white py-3 px-4 rounded-lg transition-all shadow-lg hover:shadow-xl"
              >
                Load Sample Garden
              </button>

              {fileName && (
                <div className="mt-4 p-3 bg-gray-800/50 rounded-lg border border-cyan-900/20">
                  <div className="text-xs text-gray-500">Current model:</div>
                  <div className="text-cyan-400 font-medium truncate">{fileName}</div>
                </div>
              )}
            </CardGlass>

            {/* Stats */}
            {stats && stats.vertexCount > 0 && (
              <CardGlass className="p-5 bg-gradient-to-br from-gray-900/90 to-gray-800/90 border border-purple-900/30">
                <h3 className="text-lg font-semibold text-purple-400 mb-3 flex items-center gap-2">
                  <Database size={20} />
                  Model Statistics
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400 text-sm">Vertices:</span>
                    <span className="text-white font-mono">{formatNumber(stats.vertexCount)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400 text-sm">Triangles:</span>
                    <span className="text-white font-mono">{formatNumber(stats.faceCount)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400 text-sm">Has Colors:</span>
                    <span className={`text-sm ${stats.hasColors ? 'text-green-400' : 'text-gray-400'}`}>
                      {stats.hasColors ? '✓ Yes' : '✗ No'}
                    </span>
                  </div>
                  {stats.bounds && (
                    <>
                      <div className="mt-3 pt-3 border-t border-gray-700">
                        <div className="text-gray-400 text-sm mb-1">Bounding Box:</div>
                        <div className="text-xs space-y-1 font-mono">
                          <div className="text-gray-300">
                            X: [{stats.bounds.min[0].toFixed(1)}, {stats.bounds.max[0].toFixed(1)}]
                          </div>
                          <div className="text-gray-300">
                            Y: [{stats.bounds.min[1].toFixed(1)}, {stats.bounds.max[1].toFixed(1)}]
                          </div>
                          <div className="text-gray-300">
                            Z: [{stats.bounds.min[2].toFixed(1)}, {stats.bounds.max[2].toFixed(1)}]
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </CardGlass>
            )}

            {/* Export Tools */}
            <CardGlass className="p-5 bg-gradient-to-br from-gray-900/90 to-gray-800/90 border border-green-900/30">
              <h3 className="text-lg font-semibold text-green-400 mb-3 flex items-center gap-2">
                <Download size={20} />
                Export Tools
              </h3>
              <div className="space-y-2">
                <button
                  onClick={exportScreenshot}
                  className="w-full bg-gray-700 hover:bg-gray-600 text-white py-2 px-3 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm"
                >
                  <Camera size={16} />
                  Screenshot
                </button>
                <button
                  onClick={exportMeasurements}
                  disabled={measurements.length === 0}
                  className="w-full bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-500 text-white py-2 px-3 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm"
                >
                  <FileText size={16} />
                  Export Data
                </button>
              </div>
            </CardGlass>
          </div>

          {/* Middle Panel - Viewer */}
          <div className="xl:col-span-3">
            <CardGlass className="h-[75vh] relative overflow-hidden bg-gradient-to-br from-gray-900/50 to-black/50 border border-cyan-900/20">
              <div
                ref={viewerRef}
                className="absolute inset-0"
                onDrop={handleDrop}
                onDragOver={handleDragOver}
              >
                <TriangleSplattingViewer
                  url={fileUrl || undefined}
                  onStatsUpdate={handleStatsUpdate}
                  settings={settings}
                  onMeasure={handleMeasurement}
                  className="w-full h-full"
                />
              </div>

              {/* Drag & Drop Overlay */}
              {!fileUrl && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="text-center">
                    <div className="text-8xl mb-4 animate-pulse">🔺</div>
                    <p className="text-2xl text-gray-400 mb-2">Drop .off file here</p>
                    <p className="text-sm text-gray-500">or use the upload button to get started</p>
                  </div>
                </div>
              )}

              {/* Measurements Display */}
              {measurements.length > 0 && (
                <div className="absolute top-4 left-4 bg-black/80 backdrop-blur-md text-cyan-400 px-4 py-3 rounded-lg text-sm border border-cyan-900/50 max-w-xs">
                  <div className="font-bold mb-2 flex items-center gap-2">
                    <Ruler size={16} />
                    Measurements
                  </div>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {measurements.map((distance, index) => (
                      <div key={index} className="text-xs">
                        #{index + 1}: {distance.toFixed(3)} units
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardGlass>
          </div>

          {/* Right Panel - Settings */}
          <div className="xl:col-span-1 space-y-4">
            {/* Tabs */}
            <div className="flex gap-1 bg-gray-800/50 p-1 rounded-lg">
              {(['rendering', 'analysis', 'export'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all ${
                    activeTab === tab
                      ? 'tab-active text-cyan-400'
                      : 'text-gray-400 hover:text-gray-300'
                  }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            {activeTab === 'rendering' && (
              <CardGlass className="p-5 bg-gradient-to-br from-gray-900/90 to-gray-800/90 border border-cyan-900/30 max-h-[60vh] overflow-y-auto">
                <h3 className="text-lg font-semibold text-cyan-400 mb-4 flex items-center gap-2">
                  <Palette size={20} />
                  Rendering Settings
                </h3>
                
                <div className="space-y-4">
                  {/* Basic Toggles */}
                  <div className="space-y-3">
                    {[
                      { key: 'wireframe', label: 'Wireframe Mode', icon: Grid3X3 },
                      { key: 'showGrid', label: 'Show Grid', icon: Grid3X3 },
                      { key: 'showStats', label: 'Show Stats', icon: Info },
                      { key: 'showAxes', label: 'Show Axes', icon: Maximize2 },
                      { key: 'autoRotate', label: 'Auto Rotate', icon: Play }
                    ].map(({ key, label, icon: Icon }) => (
                      <div key={key} className="flex items-center justify-between">
                        <label className="text-gray-300 text-sm flex items-center gap-2">
                          <Icon size={14} />
                          {label}
                        </label>
                        <button
                          onClick={() => setSettings({ ...settings, [key]: !settings[key as keyof typeof settings] })}
                          className={`w-12 h-6 rounded-full transition-all ${
                            settings[key as keyof typeof settings] ? 'bg-gradient-to-r from-cyan-600 to-blue-600' : 'bg-gray-600'
                          }`}
                        >
                          <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                            settings[key as keyof typeof settings] ? 'translate-x-6' : 'translate-x-0.5'
                          }`} />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="border-t border-gray-700 pt-4">
                    {/* Exposure */}
                    <div className="mb-4">
                      <label className="text-gray-300 text-sm mb-2 block">
                        Exposure: {settings.exposure.toFixed(2)}
                      </label>
                      <input
                        type="range"
                        min="0.1"
                        max="3"
                        step="0.1"
                        value={settings.exposure}
                        onChange={(e) => setSettings({ ...settings, exposure: parseFloat(e.target.value) })}
                        className="triangle-splatting-slider"
                      />
                    </div>

                    {/* Background Blend */}
                    <div className="mb-4">
                      <label className="text-gray-300 text-sm mb-2 block">
                        Background Blend: {(settings.backgroundBlend * 100).toFixed(0)}%
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={settings.backgroundBlend}
                        onChange={(e) => setSettings({ ...settings, backgroundBlend: parseFloat(e.target.value) })}
                        className="triangle-splatting-slider"
                      />
                    </div>

                    {/* Background Color */}
                    <div className="mb-4">
                      <label className="text-gray-300 text-sm mb-2 block">Background Color</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={settings.backgroundColor}
                          onChange={(e) => setSettings({ ...settings, backgroundColor: e.target.value })}
                          className="w-12 h-12 rounded cursor-pointer border-2 border-gray-600"
                        />
                        <input
                          type="text"
                          value={settings.backgroundColor}
                          onChange={(e) => setSettings({ ...settings, backgroundColor: e.target.value })}
                          className="flex-1 bg-gray-700 text-white px-3 py-2 rounded text-sm"
                        />
                      </div>
                    </div>

                    {/* Lighting Controls */}
                    <div className="border-t border-gray-700 pt-4">
                      <h4 className="text-cyan-400 text-sm font-medium mb-3">Lighting</h4>
                      
                      <div className="space-y-3">
                        <div>
                          <label className="text-gray-300 text-xs block mb-1">
                            Ambient: {(settings.ambientIntensity * 100).toFixed(0)}%
                          </label>
                          <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.05"
                            value={settings.ambientIntensity}
                            onChange={(e) => setSettings({ ...settings, ambientIntensity: parseFloat(e.target.value) })}
                            className="triangle-splatting-slider"
                          />
                        </div>

                        <div>
                          <label className="text-gray-300 text-xs block mb-1">
                            Sun: {(settings.sunIntensity * 100).toFixed(0)}%
                          </label>
                          <input
                            type="range"
                            min="0"
                            max="2"
                            step="0.1"
                            value={settings.sunIntensity}
                            onChange={(e) => setSettings({ ...settings, sunIntensity: parseFloat(e.target.value) })}
                            className="triangle-splatting-slider"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Color Grading */}
                    <div className="border-t border-gray-700 pt-4">
                      <h4 className="text-cyan-400 text-sm font-medium mb-3">Color Grading</h4>
                      
                      <div className="space-y-3">
                        <div>
                          <label className="text-gray-300 text-xs block mb-1">
                            Contrast: {(settings.colorGrading.contrast * 100).toFixed(0)}%
                          </label>
                          <input
                            type="range"
                            min="0.5"
                            max="1.5"
                            step="0.05"
                            value={settings.colorGrading.contrast}
                            onChange={(e) => setSettings({ 
                              ...settings, 
                              colorGrading: { ...settings.colorGrading, contrast: parseFloat(e.target.value) }
                            })}
                            className="triangle-splatting-slider"
                          />
                        </div>

                        <div>
                          <label className="text-gray-300 text-xs block mb-1">
                            Saturation: {(settings.colorGrading.saturation * 100).toFixed(0)}%
                          </label>
                          <input
                            type="range"
                            min="0"
                            max="2"
                            step="0.05"
                            value={settings.colorGrading.saturation}
                            onChange={(e) => setSettings({ 
                              ...settings, 
                              colorGrading: { ...settings.colorGrading, saturation: parseFloat(e.target.value) }
                            })}
                            className="triangle-splatting-slider"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardGlass>
            )}

            {activeTab === 'analysis' && (
              <CardGlass className="p-5 bg-gradient-to-br from-gray-900/90 to-gray-800/90 border border-purple-900/30">
                <h3 className="text-lg font-semibold text-purple-400 mb-4 flex items-center gap-2">
                  <Sliders size={20} />
                  Analysis Tools
                </h3>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-gray-300 text-sm flex items-center gap-2">
                      <Ruler size={14} />
                      Measurement Tool
                    </label>
                    <button
                      onClick={() => setSettings({ ...settings, showMeasurements: !settings.showMeasurements })}
                      className={`w-12 h-6 rounded-full transition-all ${
                        settings.showMeasurements ? 'bg-gradient-to-r from-purple-600 to-pink-600' : 'bg-gray-600'
                      }`}
                    >
                      <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                        settings.showMeasurements ? 'translate-x-6' : 'translate-x-0.5'
                      }`} />
                    </button>
                  </div>

                  {measurements.length > 0 && (
                    <div className="mt-4 p-3 bg-gray-800 rounded-lg">
                      <div className="text-sm text-gray-400 mb-2">Recent Measurements:</div>
                      <div className="space-y-1">
                        {measurements.slice(-5).map((distance, index) => (
                          <div key={index} className="text-xs text-gray-300 font-mono">
                            {distance.toFixed(3)} units
                          </div>
                        ))}
                      </div>
                      <button
                        onClick={() => setMeasurements([])}
                        className="mt-2 text-xs text-red-400 hover:text-red-300"
                      >
                        Clear All
                      </button>
                    </div>
                  )}
                </div>
              </CardGlass>
            )}
          </div>
        </div>

        {/* Bottom Info Section */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <CardGlass className="p-4 bg-gradient-to-br from-cyan-900/20 to-blue-900/20 border border-cyan-900/30">
            <h4 className="text-cyan-400 font-semibold mb-2 flex items-center gap-2">
              <Zap size={16} />
              WebGL Accelerated
            </h4>
            <p className="text-sm text-gray-400">
              Hardware-accelerated rendering with custom GLSL shaders for optimal performance
            </p>
          </CardGlass>

          <CardGlass className="p-4 bg-gradient-to-br from-purple-900/20 to-pink-900/20 border border-purple-900/30">
            <h4 className="text-purple-400 font-semibold mb-2 flex items-center gap-2">
              <Eye size={16} />
              Research Tools
            </h4>
            <p className="text-sm text-gray-400">
              Professional measurement, analysis, and export tools for academic research
            </p>
          </CardGlass>

          <CardGlass className="p-4 bg-gradient-to-br from-green-900/20 to-emerald-900/20 border border-green-900/30">
            <h4 className="text-green-400 font-semibold mb-2 flex items-center gap-2">
              <Grid3X3 size={16} />
              Triangle Splatting
            </h4>
            <p className="text-sm text-gray-400">
              State-of-the-art 3D representation using triangle primitives for neural radiance fields
            </p>
          </CardGlass>
        </div>
                   </div>
       </div>
   </AnimatedPage>
   );
 };

 export default TriangleSplattingPage; 