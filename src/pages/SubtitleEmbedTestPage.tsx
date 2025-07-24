import React, { useState, useRef } from 'react';
import { ffmpegVideoExportService } from '../services/ffmpeg-video-export.service';
import { simpleSubtitleEmbedService } from '../services/simple-subtitle-embed.service';
import type { SubtitleSegment } from '../types/caption-studio';
import { Loader2, Upload, CheckCircle, XCircle, Info } from 'lucide-react';

const SubtitleEmbedTestPage: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const testVideoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [testResults, setTestResults] = useState<{
    ffmpegLoaded: boolean | null;
    embedSuccessful: boolean | null;
    hasSubtitleTrack: boolean | null;
    errorMessage: string | null;
  }>({
    ffmpegLoaded: null,
    embedSuccessful: null,
    hasSubtitleTrack: null,
    errorMessage: null
  });
  const [exportedVideoUrl, setExportedVideoUrl] = useState<string | null>(null);

  // Test subtitles
  const testSubtitles: SubtitleSegment[] = [
    { id: '1', text: 'This is the first test subtitle', startTime: 0, endTime: 3 },
    { id: '2', text: 'This is the second test subtitle', startTime: 3, endTime: 6 },
    { id: '3', text: 'This is the third test subtitle', startTime: 6, endTime: 9 },
    { id: '4', text: 'This is the final test subtitle', startTime: 9, endTime: 12 }
  ];

  const handleVideoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setVideoFile(file);
      const url = URL.createObjectURL(file);
      if (videoRef.current) {
        videoRef.current.src = url;
      }
      // Reset test results when new video is uploaded
      setTestResults({
        ffmpegLoaded: null,
        embedSuccessful: null,
        hasSubtitleTrack: null,
        errorMessage: null
      });
      if (exportedVideoUrl) {
        URL.revokeObjectURL(exportedVideoUrl);
        setExportedVideoUrl(null);
      }
    }
  };

  const testSubtitleEmbedding = async () => {
    if (!videoFile) {
      alert('Please upload a video first');
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    const newResults = { ...testResults };

    try {
      // Step 1: Test FFmpeg loading
      console.log('Testing FFmpeg loading...');
      try {
        await ffmpegVideoExportService.loadFFmpeg();
        newResults.ffmpegLoaded = true;
        console.log('✅ FFmpeg loaded successfully');
      } catch (error) {
        newResults.ffmpegLoaded = false;
        newResults.errorMessage = `FFmpeg loading failed: ${error}`;
        console.error('❌ FFmpeg loading failed:', error);
        setTestResults(newResults);
        return;
      }

      // Step 2: Test subtitle embedding
      console.log('Testing subtitle embedding...');
      const videoBlob = new Blob([videoFile], { type: videoFile.type });
      
      try {
        const resultBlob = await simpleSubtitleEmbedService.embedSubtitlesAsTrack(
          videoBlob,
          testSubtitles,
          (prog) => setProgress(prog)
        );
        
        newResults.embedSuccessful = true;
        console.log('✅ Subtitle embedding completed');

        // Create URL for the exported video
        const url = URL.createObjectURL(resultBlob);
        setExportedVideoUrl(url);

        // Step 3: Test if video has subtitle tracks
        console.log('Verifying subtitle tracks...');
        if (testVideoRef.current) {
          testVideoRef.current.src = url;
          
          // Wait for video to load metadata
          await new Promise((resolve) => {
            testVideoRef.current!.addEventListener('loadedmetadata', resolve, { once: true });
          });

          // Check for text tracks
          const textTracks = testVideoRef.current.textTracks;
          console.log('Text tracks found:', textTracks.length);
          
          if (textTracks.length > 0) {
            newResults.hasSubtitleTrack = true;
            console.log('✅ Video has subtitle tracks');
            
            // Log track details
            for (let i = 0; i < textTracks.length; i++) {
              const track = textTracks[i];
              console.log(`Track ${i}: kind=${track.kind}, label=${track.label}, language=${track.language}`);
            }
          } else {
            newResults.hasSubtitleTrack = false;
            console.log('❌ No subtitle tracks found in video');
          }
        }

        // Also download the video for manual verification
        const a = document.createElement('a');
        a.href = url;
        a.download = 'test-video-with-embedded-subtitles.mp4';
        a.click();

      } catch (error) {
        newResults.embedSuccessful = false;
        newResults.errorMessage = `Subtitle embedding failed: ${error}`;
        console.error('❌ Subtitle embedding failed:', error);
      }

    } catch (error) {
      console.error('Test failed:', error);
      newResults.errorMessage = `Test failed: ${error}`;
    } finally {
      setIsProcessing(false);
      setTestResults(newResults);
    }
  };

  const getStatusIcon = (status: boolean | null) => {
    if (status === null) return <Info className="w-5 h-5 text-gray-400" />;
    if (status) return <CheckCircle className="w-5 h-5 text-green-500" />;
    return <XCircle className="w-5 h-5 text-red-500" />;
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Subtitle Embedding Test Tool</h1>
        
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Upload Test Video</h2>
          
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            onChange={handleVideoUpload}
            className="hidden"
          />
          
          <div className="flex gap-4">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            >
              <Upload className="w-5 h-5" />
              Upload Video
            </button>
            
            <button
              onClick={async () => {
                try {
                  const response = await fetch('/test-video.mp4');
                  const blob = await response.blob();
                  const file = new File([blob], 'test-video.mp4', { type: 'video/mp4' });
                  setVideoFile(file);
                  const url = URL.createObjectURL(blob);
                  if (videoRef.current) {
                    videoRef.current.src = url;
                  }
                  setTestResults({
                    ffmpegLoaded: null,
                    embedSuccessful: null,
                    hasSubtitleTrack: null,
                    errorMessage: null
                  });
                  if (exportedVideoUrl) {
                    URL.revokeObjectURL(exportedVideoUrl);
                    setExportedVideoUrl(null);
                  }
                } catch (error) {
                  console.error('Failed to load test video:', error);
                  alert('Failed to load test video');
                }
              }}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
            >
              <CheckCircle className="w-5 h-5" />
              Use Test Video
            </button>
          </div>

          {videoFile && (
            <div className="mt-4">
              <p className="text-sm text-gray-400">Selected: {videoFile.name}</p>
              <video
                ref={videoRef}
                controls
                className="mt-2 w-full max-w-lg rounded-lg"
              />
            </div>
          )}
        </div>

        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Test Subtitles</h2>
          <div className="space-y-2 text-sm">
            {testSubtitles.map((sub, index) => (
              <div key={sub.id} className="flex items-center gap-2">
                <span className="text-gray-400">{sub.startTime}s - {sub.endTime}s:</span>
                <span>{sub.text}</span>
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={testSubtitleEmbedding}
          disabled={!videoFile || isProcessing}
          className="w-full py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Testing... ({progress.toFixed(0)}%)
            </>
          ) : (
            'Run Subtitle Embedding Test'
          )}
        </button>

        {(testResults.ffmpegLoaded !== null || testResults.embedSuccessful !== null || testResults.hasSubtitleTrack !== null) && (
          <div className="mt-6 bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Test Results</h2>
            
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                {getStatusIcon(testResults.ffmpegLoaded)}
                <span>FFmpeg Loading</span>
              </div>
              
              <div className="flex items-center gap-3">
                {getStatusIcon(testResults.embedSuccessful)}
                <span>Subtitle Embedding Process</span>
              </div>
              
              <div className="flex items-center gap-3">
                {getStatusIcon(testResults.hasSubtitleTrack)}
                <span>Video Has Subtitle Tracks</span>
              </div>
            </div>

            {testResults.errorMessage && (
              <div className="mt-4 p-3 bg-red-900/50 border border-red-700 rounded-lg">
                <p className="text-sm text-red-300">{testResults.errorMessage}</p>
              </div>
            )}

            {exportedVideoUrl && (
              <div className="mt-6">
                <h3 className="font-semibold mb-2">Exported Video (Check in VLC)</h3>
                <video
                  ref={testVideoRef}
                  controls
                  className="w-full max-w-lg rounded-lg"
                >
                  <track kind="subtitles" />
                </video>
                <p className="mt-2 text-sm text-gray-400">
                  The video has been downloaded. To verify embedded subtitles:
                </p>
                <ol className="mt-2 text-sm text-gray-400 list-decimal list-inside space-y-1">
                  <li>Open the downloaded video in VLC Media Player</li>
                  <li>Go to Subtitle → Sub Track</li>
                  <li>Check if "Track 1" appears (if yes, subtitles are embedded)</li>
                  <li>Enable the subtitle track to see the test subtitles</li>
                </ol>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SubtitleEmbedTestPage; 