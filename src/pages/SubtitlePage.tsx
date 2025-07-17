import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import Header from '../components/Header';
import Footer from '../components/Footer';

interface SubtitleSegment {
  id: string;
  startTime: number;
  endTime: number;
  text: string;
}

const SubtitlePage: React.FC = () => {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [subtitles, setSubtitles] = useState<SubtitleSegment[]>([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (videoUrl) {
        URL.revokeObjectURL(videoUrl);
      }
    };
  }, [videoUrl]);

  const handleVideoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('video/')) {
      setVideoFile(file);
      const url = URL.createObjectURL(file);
      setVideoUrl(url);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const formatTime = (time: number) => {
    const hours = Math.floor(time / 3600);
    const minutes = Math.floor((time % 3600) / 60);
    const seconds = Math.floor(time % 60);
    const milliseconds = Math.floor((time % 1) * 1000);
    
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
  };

  const handleAddSubtitle = () => {
    const newSubtitle: SubtitleSegment = {
      id: Date.now().toString(),
      startTime: currentTime,
      endTime: currentTime + 2,
      text: 'New subtitle'
    };
    setSubtitles([...subtitles, newSubtitle].sort((a, b) => a.startTime - b.startTime));
  };

  const handleDeleteSubtitle = (id: string) => {
    setSubtitles(subtitles.filter(sub => sub.id !== id));
  };

  const handleUpdateSubtitle = (id: string, field: keyof SubtitleSegment, value: any) => {
    setSubtitles(subtitles.map(sub => 
      sub.id === id ? { ...sub, [field]: value } : sub
    ));
  };

  const exportSRT = () => {
    let srtContent = '';
    subtitles.forEach((sub, index) => {
      srtContent += `${index + 1}\n`;
      srtContent += `${formatTime(sub.startTime).replace('.', ',')} --> ${formatTime(sub.endTime).replace('.', ',')}\n`;
      srtContent += `${sub.text}\n\n`;
    });

    const blob = new Blob([srtContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${videoFile?.name.replace(/\.[^/.]+$/, '') || 'subtitles'}.srt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getCurrentSubtitle = () => {
    return subtitles.find(sub => 
      currentTime >= sub.startTime && currentTime <= sub.endTime
    );
  };

  const currentSubtitle = getCurrentSubtitle();

  return (
    <div className="relative flex size-full min-h-screen flex-col dark group/design-root overflow-x-hidden bg-gray-950">
      <div className="layout-container flex h-full grow flex-col">
        <Header />
        
        <main className="px-6 md:px-10 lg:px-20 xl:px-40 flex flex-1 justify-center py-8">
          <div className="layout-content-container flex flex-col max-w-6xl flex-1 w-full">
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8"
            >
              <h1 className="text-4xl font-bold text-white mb-4">
                Subtitle Editor
              </h1>
              <p className="text-gray-400">
                Create and edit subtitles for your videos
              </p>
            </motion.div>

            {/* Video Upload */}
            {!videoUrl ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="border-2 border-dashed border-gray-700 rounded-lg p-12 text-center"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/*"
                  onChange={handleVideoUpload}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-all"
                >
                  Select Video File
                </button>
                <p className="text-gray-400 mt-4">
                  Supported formats: MP4, WebM, MOV
                </p>
              </motion.div>
            ) : (
              <div className="space-y-6">
                {/* Video Player */}
                <div className="relative rounded-lg overflow-hidden bg-black">
                  <video
                    ref={videoRef}
                    src={videoUrl}
                    onTimeUpdate={handleTimeUpdate}
                    onLoadedMetadata={handleLoadedMetadata}
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                    controls
                    className="w-full"
                  />
                  {currentSubtitle && (
                    <div className="absolute bottom-20 left-0 right-0 text-center px-4">
                      <div className="inline-block bg-black/80 text-white px-4 py-2 rounded">
                        {currentSubtitle.text}
                      </div>
                    </div>
                  )}
                </div>

                {/* Controls */}
                <div className="flex gap-4">
                  <button
                    onClick={handleAddSubtitle}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-all"
                  >
                    Add Subtitle at {formatTime(currentTime)}
                  </button>
                  <button
                    onClick={exportSRT}
                    disabled={subtitles.length === 0}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Export SRT
                  </button>
                </div>

                {/* Subtitle List */}
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold text-white">Subtitles</h3>
                  {subtitles.length === 0 ? (
                    <p className="text-gray-400">No subtitles yet. Click "Add Subtitle" to create one.</p>
                  ) : (
                    <div className="space-y-2">
                      {subtitles.map(sub => (
                        <motion.div
                          key={sub.id}
                          layout
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="bg-gray-900 rounded-lg p-4"
                        >
                          <div className="flex gap-4 items-start">
                            <div className="flex-1 space-y-2">
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  value={formatTime(sub.startTime)}
                                  onChange={(e) => {
                                    const parts = e.target.value.split(':');
                                    if (parts.length >= 2) {
                                      const seconds = parseFloat(parts[parts.length - 1]) || 0;
                                      const minutes = parseFloat(parts[parts.length - 2]) || 0;
                                      const hours = parts.length > 2 ? parseFloat(parts[0]) || 0 : 0;
                                      const time = hours * 3600 + minutes * 60 + seconds;
                                      handleUpdateSubtitle(sub.id, 'startTime', time);
                                    }
                                  }}
                                  className="w-32 px-2 py-1 bg-gray-800 text-white rounded border border-gray-700 focus:border-purple-500"
                                />
                                <span className="text-gray-400">→</span>
                                <input
                                  type="text"
                                  value={formatTime(sub.endTime)}
                                  onChange={(e) => {
                                    const parts = e.target.value.split(':');
                                    if (parts.length >= 2) {
                                      const seconds = parseFloat(parts[parts.length - 1]) || 0;
                                      const minutes = parseFloat(parts[parts.length - 2]) || 0;
                                      const hours = parts.length > 2 ? parseFloat(parts[0]) || 0 : 0;
                                      const time = hours * 3600 + minutes * 60 + seconds;
                                      handleUpdateSubtitle(sub.id, 'endTime', time);
                                    }
                                  }}
                                  className="w-32 px-2 py-1 bg-gray-800 text-white rounded border border-gray-700 focus:border-purple-500"
                                />
                              </div>
                              <textarea
                                value={sub.text}
                                onChange={(e) => handleUpdateSubtitle(sub.id, 'text', e.target.value)}
                                className="w-full px-3 py-2 bg-gray-800 text-white rounded border border-gray-700 focus:border-purple-500 resize-none"
                                rows={2}
                              />
                            </div>
                            <button
                              onClick={() => handleDeleteSubtitle(sub.id)}
                              className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded transition-all"
                            >
                              Delete
                            </button>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>
        </main>
        
        <Footer />
      </div>
    </div>
  );
};

export default SubtitlePage; 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 