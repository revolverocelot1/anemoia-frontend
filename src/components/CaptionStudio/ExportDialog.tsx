import React, { useState, useEffect } from 'react';
import { Check, AlertCircle, Info } from 'lucide-react';
import type { SubtitleExportOptions, VideoExportOptions } from '../../types/caption-studio';

interface ExportDialogProps {
  onExportSubtitles: (format: string) => void;
  onExportVideo: (options: VideoExportOptions) => void;
  onClose: () => void;
  currentSubtitlesLength: number;
  videoDuration: number;
}

const ExportDialog: React.FC<ExportDialogProps> = ({
  onExportSubtitles,
  onExportVideo,
  onClose,
  currentSubtitlesLength,
  videoDuration
}) => {
  const [activeTab, setActiveTab] = useState<'subtitles' | 'video'>('video');
  const [videoOptions, setVideoOptions] = useState<Partial<VideoExportOptions>>({
    embedType: 'burn' as 'burn' | 'track',
    format: 'mp4' as 'mp4' | 'webm' | 'mkv',
    quality: 'high' as 'low' | 'medium' | 'high' | 'ultra',
    fps: 30,
    removeBackground: false,
    backgroundOpacity: 0.8,
    backgroundBlur: 0
  });

  // Auto-switch to MKV when embedding subtitle tracks
  useEffect(() => {
    if (videoOptions.embedType === 'track' && videoOptions.format === 'mp4') {
      setVideoOptions(prev => ({ ...prev, format: 'mkv' }));
    }
  }, [videoOptions.embedType]);

  const subtitleFormats = [
    { id: 'srt', name: 'SRT', description: 'SubRip format, widely supported' },
    { id: 'vtt', name: 'WebVTT', description: 'Web Video Text Tracks, supports styling' },
    { id: 'ass', name: 'ASS/SSA', description: 'Advanced SubStation Alpha, rich styling' },
    { id: 'json', name: 'JSON', description: 'Raw data format for developers' }
  ];

  const handleVideoExport = () => {
    // Ensure MKV format for embedded tracks
    const finalFormat = videoOptions.embedType === 'track' ? 'mkv' : (videoOptions.format || 'mp4');
    
    onExportVideo({
      burnSubtitles: videoOptions.embedType === 'burn',
      embedSubtitles: videoOptions.embedType === 'track',
      format: finalFormat,
      quality: videoOptions.quality || 'high',
      fps: videoOptions.fps || 30,
      removeBackground: videoOptions.removeBackground,
      backgroundOpacity: videoOptions.backgroundOpacity,
      backgroundBlur: videoOptions.backgroundBlur
    } as VideoExportOptions);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="p-6 border-b border-gray-700">
          <h2 className="text-2xl font-bold text-white">Export Options</h2>
          <p className="text-gray-400 mt-1">
            {currentSubtitlesLength} subtitles • {Math.floor(videoDuration / 60)}:{(Math.floor(videoDuration) % 60).toString().padStart(2, '0')} duration
          </p>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-700">
          <button
            onClick={() => setActiveTab('video')}
            className={`flex-1 px-6 py-3 font-medium transition-colors ${
              activeTab === 'video'
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Export Video
          </button>
          <button
            onClick={() => setActiveTab('subtitles')}
            className={`flex-1 px-6 py-3 font-medium transition-colors ${
              activeTab === 'subtitles'
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Export Subtitles Only
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {activeTab === 'video' ? (
            <div className="space-y-6">
              {/* Embed Type Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  Subtitle Embedding Method
                </label>
                <div className="space-y-3">
                  <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg border border-gray-700 hover:bg-gray-800/50 transition-colors">
                    <input
                      type="radio"
                      name="embedType"
                      value="burn"
                      checked={videoOptions.embedType === 'burn'}
                      onChange={(e) => setVideoOptions(prev => ({ ...prev, embedType: 'burn' as const }))}
                      className="mt-1"
                    />
                    <div>
                      <div className="font-medium text-white">Burn Subtitles</div>
                      <div className="text-sm text-gray-400">
                        Permanently embed subtitles into video frames (cannot be turned off)
                      </div>
                      <div className="text-xs text-green-400 mt-1">✓ Works everywhere</div>
                    </div>
                  </label>
                  
                  <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg border border-gray-700 hover:bg-gray-800/50 transition-colors">
                    <input
                      type="radio"
                      name="embedType"
                      value="track"
                      checked={videoOptions.embedType === 'track'}
                      onChange={(e) => setVideoOptions(prev => ({ ...prev, embedType: 'track' as const }))}
                      className="mt-1"
                    />
                    <div>
                      <div className="font-medium text-white">Embed as Track</div>
                      <div className="text-sm text-gray-400">
                        Add subtitles as a separate track (can be turned on/off in player)
                      </div>
                      <div className="text-xs text-yellow-400 mt-1">⚠ Requires MKV format</div>
                    </div>
                  </label>
                </div>
                
                {videoOptions.embedType === 'track' && (
                  <div className="mt-3 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                    <div className="flex gap-2">
                      <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-blue-300">
                        <p className="font-medium mb-1">MKV Format Required</p>
                        <p className="text-blue-200">Subtitle tracks require MKV format for proper embedding. The format has been automatically switched to MKV.</p>
                        <p className="text-xs text-blue-300 mt-2">Note: Some players may not support MKV files. VLC Media Player is recommended.</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Format Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Output Format
                </label>
                <select
                  value={videoOptions.format}
                  onChange={(e) => setVideoOptions(prev => ({ ...prev, format: e.target.value as any }))}
                  disabled={videoOptions.embedType === 'track'} // Disable when embedding tracks
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="mp4">MP4 - Universal compatibility</option>
                  <option value="webm">WebM - Web optimized</option>
                  <option value="mkv">MKV - Advanced features</option>
                </select>
                {videoOptions.embedType === 'track' && (
                  <p className="text-xs text-gray-500 mt-1">Format locked to MKV for subtitle track support</p>
                )}
              </div>

              {/* Quality Settings */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  Video Quality
                </label>
                <div className="grid grid-cols-4 gap-3">
                  {(['low', 'medium', 'high', 'ultra'] as const).map((quality) => (
                    <button
                      key={quality}
                      onClick={() => setVideoOptions({ ...videoOptions, quality })}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        videoOptions.quality === quality
                          ? 'border-blue-500 bg-blue-500/20'
                          : 'border-gray-600 hover:border-gray-500'
                      }`}
                    >
                      <div className="font-medium text-white capitalize">{quality}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Advanced Options for Burned Subtitles */}
              {videoOptions.embedType === 'burn' && (
                <div className="space-y-4 p-4 bg-gray-700/50 rounded-lg">
                  <h4 className="font-medium text-white">Subtitle Appearance</h4>
                  
                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={videoOptions.removeBackground}
                      onChange={(e) => setVideoOptions({
                        ...videoOptions,
                        removeBackground: e.target.checked
                      })}
                      className="rounded"
                    />
                    <span className="text-gray-300">Remove subtitle background</span>
                  </label>

                  {!videoOptions.removeBackground && (
                    <>
                      <div>
                        <label className="block text-sm text-gray-400 mb-2">
                          Background Opacity: {Math.round((videoOptions.backgroundOpacity || 0.8) * 100)}%
                        </label>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.1"
                          value={videoOptions.backgroundOpacity || 0.8}
                          onChange={(e) => setVideoOptions({
                            ...videoOptions,
                            backgroundOpacity: parseFloat(e.target.value)
                          })}
                          className="w-full"
                        />
                      </div>

                      <div>
                        <label className="block text-sm text-gray-400 mb-2">
                          Background Blur: {videoOptions.backgroundBlur || 0}px
                        </label>
                        <input
                          type="range"
                          min="0"
                          max="20"
                          step="1"
                          value={videoOptions.backgroundBlur || 0}
                          onChange={(e) => setVideoOptions({
                            ...videoOptions,
                            backgroundBlur: parseInt(e.target.value)
                          })}
                          className="w-full"
                        />
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Export Info */}
              <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <h4 className="font-medium text-blue-400 mb-2">Export Information</h4>
                <ul className="text-sm text-gray-300 space-y-1">
                  <li>• Format: {videoOptions.format?.toUpperCase()}</li>
                  <li>• Subtitles: {videoOptions.embedType === 'burn' ? 'Burned in (always visible)' : 'Embedded as track (toggleable)'}</li>
                  <li>• Quality: {videoOptions.quality}</li>
                  {videoOptions.embedType === 'track' && videoOptions.format === 'mp4' && (
                    <li className="text-yellow-400">⚠ Some players may not support soft subtitles in MP4</li>
                  )}
                </ul>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {subtitleFormats.map((format) => (
                <button
                  key={format.id}
                  onClick={() => onExportSubtitles(format.id)}
                  className="w-full p-4 rounded-lg border-2 border-gray-600 hover:border-blue-500 transition-all text-left group"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-white group-hover:text-blue-400 transition-colors">
                        {format.name}
                      </h4>
                      <p className="text-sm text-gray-400 mt-1">{format.description}</p>
                    </div>
                    <Check className="w-5 h-5 text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-700 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          {activeTab === 'video' && (
            <button
              onClick={handleVideoExport}
              className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
            >
              Export Video
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExportDialog; 