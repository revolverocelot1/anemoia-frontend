import React, { useState, useRef } from 'react';
import { Upload, Zap, Clock, FileVideo, CheckCircle, XCircle } from 'lucide-react';
import { fastSubtitleEmbedService } from '../services/fast-subtitle-embed.service';
import { ffmpegVideoExportService } from '../services/ffmpeg-video-export.service';
import type { SubtitleSegment } from '../types/caption-studio';

interface BenchmarkResult {
  method: string;
  time: number;
  size: number;
  success: boolean;
  error?: string;
}

const SubtitleBenchmarkPage: React.FC = () => {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [subtitles, setSubtitles] = useState<SubtitleSegment[]>([]);
  const [results, setResults] = useState<BenchmarkResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Generate test subtitles
  const generateTestSubtitles = (): SubtitleSegment[] => {
    const segments: SubtitleSegment[] = [];
    for (let i = 0; i < 50; i++) {
      segments.push({
        id: `seg-${i}`,
        startTime: i * 3,
        endTime: (i + 1) * 3 - 0.5,
        text: `This is subtitle number ${i + 1}. Testing performance optimization.`
      });
    }
    return segments;
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setVideoFile(file);
      setSubtitles(generateTestSubtitles());
      setResults([]);
    }
  };

  const runBenchmark = async () => {
    if (!videoFile) {
      alert('Please upload a video file first');
      return;
    }

    setIsRunning(true);
    setResults([]);
    const newResults: BenchmarkResult[] = [];

    // Get video blob
    const videoBlob = new Blob([videoFile], { type: videoFile.type });

    // Test 1: Fast MKV embedding (stream copy)
    try {
      console.log('Starting Fast MKV test...');
      const startTime = performance.now();
      
      const result = await fastSubtitleEmbedService.embedSubtitlesInMKV(
        videoBlob,
        subtitles,
        (progress) => console.log(`Fast MKV Progress: ${progress}%`)
      );
      
      const endTime = performance.now();
      newResults.push({
        method: 'Fast MKV (Stream Copy)',
        time: endTime - startTime,
        size: result.size,
        success: true
      });
    } catch (error) {
      newResults.push({
        method: 'Fast MKV (Stream Copy)',
        time: 0,
        size: 0,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    // Test 2: Fast MP4 embedding
    try {
      console.log('Starting Fast MP4 test...');
      const startTime = performance.now();
      
      const result = await fastSubtitleEmbedService.embedSubtitlesInMP4(
        videoBlob,
        subtitles,
        (progress) => console.log(`Fast MP4 Progress: ${progress}%`)
      );
      
      const endTime = performance.now();
      newResults.push({
        method: 'Fast MP4 (Optimized)',
        time: endTime - startTime,
        size: result.size,
        success: true
      });
    } catch (error) {
      newResults.push({
        method: 'Fast MP4 (Optimized)',
        time: 0,
        size: 0,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    // Test 3: Traditional re-encoding (for comparison)
    try {
      console.log('Starting traditional re-encoding test...');
      await ffmpegVideoExportService.loadFFmpeg();
      
      const startTime = performance.now();
      
      const result = await ffmpegVideoExportService.exportVideoWithSubtitleTrack(
        videoBlob,
        subtitles,
        {
          format: 'mp4',
          quality: 'high',
          burnSubtitles: false,
          embedSubtitles: true,
          fps: 30
        },
        (progress) => console.log(`Traditional Progress: ${progress}%`)
      );
      
      const endTime = performance.now();
      newResults.push({
        method: 'Traditional MP4 (Re-encode)',
        time: endTime - startTime,
        size: result.size,
        success: true
      });
    } catch (error) {
      newResults.push({
        method: 'Traditional MP4 (Re-encode)',
        time: 0,
        size: 0,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    setResults(newResults);
    setIsRunning(false);
  };

  const formatTime = (ms: number): string => {
    if (ms < 1000) return `${ms.toFixed(0)}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const formatSize = (bytes: number): string => {
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  };

  const getSpeedupFactor = (fastTime: number, slowTime: number): string => {
    if (slowTime === 0) return 'N/A';
    const factor = slowTime / fastTime;
    return `${factor.toFixed(1)}x faster`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-950 to-black text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent">
          Subtitle Embedding Performance Test
        </h1>
        <p className="text-gray-400 mb-8">Compare the speed of different subtitle embedding methods</p>

        {/* Upload Section */}
        <div className="bg-gray-900/50 backdrop-blur rounded-2xl p-6 mb-8 border border-gray-800">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <FileVideo className="w-5 h-5 text-blue-400" />
            Test Video
          </h2>
          
          <div className="space-y-4">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-200 flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              Upload Video File
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              onChange={handleFileUpload}
              className="hidden"
            />
            
            {videoFile && (
              <div className="text-sm text-gray-400">
                <p>File: {videoFile.name}</p>
                <p>Size: {formatSize(videoFile.size)}</p>
                <p>Test subtitles: {subtitles.length} segments</p>
              </div>
            )}
          </div>
        </div>

        {/* Run Benchmark */}
        {videoFile && (
          <div className="bg-gray-900/50 backdrop-blur rounded-2xl p-6 mb-8 border border-gray-800">
            <button
              onClick={runBenchmark}
              disabled={isRunning}
              className="w-full px-6 py-4 bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2 text-lg font-semibold"
            >
              {isRunning ? (
                <>
                  <Clock className="w-5 h-5 animate-spin" />
                  Running Benchmark...
                </>
              ) : (
                <>
                  <Zap className="w-5 h-5" />
                  Run Performance Test
                </>
              )}
            </button>
          </div>
        )}

        {/* Results */}
        {results.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold mb-4">Benchmark Results</h2>
            
            {results.map((result, index) => (
              <div
                key={index}
                className={`bg-gray-900/50 backdrop-blur rounded-xl p-6 border ${
                  result.success ? 'border-gray-800' : 'border-red-800'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      {result.success ? (
                        <CheckCircle className="w-5 h-5 text-green-400" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-400" />
                      )}
                      {result.method}
                    </h3>
                    
                    {result.success ? (
                      <div className="mt-2 space-y-1 text-sm">
                        <p className="text-gray-400">
                          Time: <span className="text-white font-mono">{formatTime(result.time)}</span>
                        </p>
                        <p className="text-gray-400">
                          Output size: <span className="text-white font-mono">{formatSize(result.size)}</span>
                        </p>
                        {index === 0 && results[2]?.success && (
                          <p className="text-green-400 font-semibold">
                            {getSpeedupFactor(result.time, results[2].time)}
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="mt-2 text-red-400 text-sm">{result.error}</p>
                    )}
                  </div>
                  
                  {result.success && (
                    <div className="ml-4 text-right">
                      <div className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-600">
                        {formatTime(result.time)}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {/* Summary */}
            {results.filter(r => r.success).length >= 2 && (
              <div className="bg-gradient-to-r from-purple-900/50 to-pink-900/50 backdrop-blur rounded-xl p-6 border border-purple-700 mt-6">
                <h3 className="text-xl font-semibold mb-2">Performance Summary</h3>
                <p className="text-gray-300">
                  The optimized MKV stream copy method is significantly faster than traditional re-encoding, 
                  providing near-instant subtitle embedding without quality loss.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SubtitleBenchmarkPage; 