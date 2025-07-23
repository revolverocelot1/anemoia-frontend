import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, FileText, Film, Download, Settings, Check } from 'lucide-react';
import { VIDEO_EXPORT_PRESETS } from '../../types/caption-studio';

interface ExportDialogProps {
  onExportSubtitles: (format: string) => void;
  onExportVideo: (options: any) => void;
  onClose: () => void;
}

const ExportDialog: React.FC<ExportDialogProps> = ({
  onExportSubtitles,
  onExportVideo,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<'subtitles' | 'video'>('subtitles');
  const [videoOptions, setVideoOptions] = useState({
    burnSubtitles: true,
    format: 'mp4',
    quality: 'high',
    fps: 30
  });

  const subtitleFormats = [
    { id: 'srt', name: 'SRT', description: 'SubRip - Most compatible format' },
    { id: 'vtt', name: 'WebVTT', description: 'Web Video Text Tracks - For web videos' },
    { id: 'ass', name: 'ASS/SSA', description: 'Advanced SubStation Alpha - Supports styling' },
    { id: 'json', name: 'JSON', description: 'Raw data format for developers' }
  ];

  const videoFormats = [
    { id: 'mp4', name: 'MP4', description: 'Most compatible, H.264 codec' },
    { id: 'webm', name: 'WebM', description: 'Open format, VP9 codec' }
  ];

  const qualityPresets = [
    { id: 'low', name: 'Low', description: '480p, 1 Mbps' },
    { id: 'medium', name: 'Medium', description: '720p, 2.5 Mbps' },
    { id: 'high', name: 'High', description: '1080p, 5 Mbps' },
    { id: 'ultra', name: 'Ultra', description: '4K, 10 Mbps' }
  ];

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
        className="bg-gray-900 rounded-xl p-6 max-w-3xl w-full max-h-[80vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">Export Options</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setActiveTab('subtitles')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
              activeTab === 'subtitles'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            <FileText className="w-4 h-4" />
            Subtitles Only
          </button>
          <button
            onClick={() => setActiveTab('video')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
              activeTab === 'video'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            <Film className="w-4 h-4" />
            Video with Subtitles
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[50vh]">
          {activeTab === 'subtitles' ? (
            // Subtitle export options
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white mb-4">
                Choose subtitle format:
              </h3>
              
              {subtitleFormats.map((format) => (
                <motion.button
                  key={format.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    onExportSubtitles(format.id);
                    onClose();
                  }}
                  className="w-full p-4 bg-gray-800 hover:bg-gray-700 rounded-lg transition-all text-left group"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-white font-medium mb-1">
                        {format.name}
                      </h4>
                      <p className="text-sm text-gray-400">
                        {format.description}
                      </p>
                    </div>
                    <Download className="w-5 h-5 text-gray-400 group-hover:text-purple-400 transition-colors" />
                  </div>
                </motion.button>
              ))}
            </div>
          ) : (
            // Video export options
            <div className="space-y-6">
              {/* Burn subtitles option */}
              <div className="bg-gray-800 rounded-lg p-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={videoOptions.burnSubtitles}
                    onChange={(e) => setVideoOptions({
                      ...videoOptions,
                      burnSubtitles: e.target.checked
                    })}
                    className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
                  />
                  <div>
                    <h4 className="text-white font-medium">Burn subtitles into video</h4>
                    <p className="text-sm text-gray-400">
                      Permanently embed subtitles in the video (cannot be turned off)
                    </p>
                  </div>
                </label>
              </div>

              {/* Format selection */}
              <div>
                <h4 className="text-white font-medium mb-3">Video Format</h4>
                <div className="grid grid-cols-2 gap-3">
                  {videoFormats.map((format) => (
                    <button
                      key={format.id}
                      onClick={() => setVideoOptions({
                        ...videoOptions,
                        format: format.id
                      })}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        videoOptions.format === format.id
                          ? 'border-purple-500 bg-purple-500/10'
                          : 'border-gray-700 bg-gray-800 hover:border-gray-600'
                      }`}
                    >
                      <h5 className="text-white font-medium">{format.name}</h5>
                      <p className="text-xs text-gray-400 mt-1">{format.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Quality selection */}
              <div>
                <h4 className="text-white font-medium mb-3">Quality Preset</h4>
                <div className="grid grid-cols-2 gap-3">
                  {qualityPresets.map((preset) => (
                    <button
                      key={preset.id}
                      onClick={() => setVideoOptions({
                        ...videoOptions,
                        quality: preset.id,
                        fps: VIDEO_EXPORT_PRESETS[preset.id as keyof typeof VIDEO_EXPORT_PRESETS].fps
                      })}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        videoOptions.quality === preset.id
                          ? 'border-purple-500 bg-purple-500/10'
                          : 'border-gray-700 bg-gray-800 hover:border-gray-600'
                      }`}
                    >
                      <h5 className="text-white font-medium">{preset.name}</h5>
                      <p className="text-xs text-gray-400 mt-1">{preset.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Export button */}
              <button
                onClick={() => {
                  onExportVideo(videoOptions);
                  onClose();
                }}
                className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-all flex items-center justify-center gap-2"
              >
                <Film className="w-5 h-5" />
                Export Video
              </button>

              {/* Warning */}
              <div className="p-4 bg-orange-900/20 border border-orange-500/30 rounded-lg">
                <p className="text-sm text-orange-300">
                  <strong>Note:</strong> Video export may take several minutes depending on 
                  video length and quality settings. The browser tab must remain open during export.
                </p>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default ExportDialog; 