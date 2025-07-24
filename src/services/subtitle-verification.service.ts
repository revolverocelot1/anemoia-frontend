import type { VideoExportOptions } from '../types/caption-studio';

export class SubtitleVerificationService {
  /**
   * Verifies if subtitles are properly embedded in a video blob
   */
  async verifySubtitleEmbedding(
    videoBlob: Blob,
    embedType: 'burn' | 'track',
    expectedSubtitleCount: number
  ): Promise<{
    success: boolean;
    message: string;
    details?: {
      hasVideoTrack: boolean;
      hasAudioTrack: boolean;
      hasSubtitleTrack?: boolean;
      subtitleFormat?: string;
      videoCodec?: string;
      duration?: number;
    };
  }> {
    try {
      // Create a video element to test playback
      const video = document.createElement('video');
      const url = URL.createObjectURL(videoBlob);
      
      return new Promise((resolve) => {
        video.onloadedmetadata = () => {
          const details: {
            hasVideoTrack: boolean;
            hasAudioTrack: boolean;
            hasSubtitleTrack?: boolean;
            subtitleFormat?: string;
            videoCodec?: string;
            duration?: number;
          } = {
            hasVideoTrack: (video as any).videoTracks?.length > 0 || video.videoWidth > 0,
            hasAudioTrack: (video as any).audioTracks?.length > 0 || (video as any).mozHasAudio || (video as any).webkitAudioDecodedByteCount > 0,
            duration: video.duration
          };

          if (embedType === 'track') {
            // Check for text tracks (soft subtitles)
            const hasTextTracks = video.textTracks && video.textTracks.length > 0;
            
            if (hasTextTracks) {
              details.hasSubtitleTrack = true;
              details.subtitleFormat = video.textTracks[0].kind || 'subtitles';
              
              resolve({
                success: true,
                message: `Video contains ${video.textTracks.length} subtitle track(s)`,
                details
              });
            } else {
              // For MP4 with mov_text, tracks might not be immediately visible in browser
              // This is a known limitation - we'll provide a warning
              resolve({
                success: false,
                message: 'Subtitle tracks not detected. Note: Some browsers may not display embedded subtitles in MP4 files. The subtitles may still work in video players like VLC.',
                details
              });
            }
          } else {
            // For burned subtitles, we can't programmatically verify
            // but we can check that the video is valid
            if (details.hasVideoTrack && details.duration && details.duration > 0) {
              resolve({
                success: true,
                message: 'Video exported successfully with burned subtitles. Visual inspection required to confirm subtitle rendering.',
                details
              });
            } else {
              resolve({
                success: false,
                message: 'Video appears to be invalid or corrupted',
                details
              });
            }
          }
          
          URL.revokeObjectURL(url);
        };

        video.onerror = () => {
          URL.revokeObjectURL(url);
          resolve({
            success: false,
            message: 'Failed to load video for verification',
            details: {
              hasVideoTrack: false,
              hasAudioTrack: false
            }
          });
        };

        video.src = url;
      });
    } catch (error) {
      return {
        success: false,
        message: `Verification error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: {
          hasVideoTrack: false,
          hasAudioTrack: false
        }
      };
    }
  }

  /**
   * Creates a simple HTML page for manual subtitle verification
   */
  createVerificationPage(videoBlob: Blob, embedType: 'burn' | 'track'): string {
    const url = URL.createObjectURL(videoBlob);
    const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Subtitle Verification</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      max-width: 900px;
      margin: 0 auto;
      padding: 20px;
      background: #1a1a1a;
      color: #fff;
    }
    video {
      width: 100%;
      max-width: 800px;
      display: block;
      margin: 20px auto;
      background: #000;
    }
    .info {
      background: #2a2a2a;
      padding: 15px;
      border-radius: 8px;
      margin: 20px 0;
    }
    .success { color: #4ade80; }
    .warning { color: #fbbf24; }
    .error { color: #f87171; }
    h1 { text-align: center; }
    .controls {
      text-align: center;
      margin: 20px 0;
    }
    button {
      background: #3b82f6;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 5px;
      cursor: pointer;
      margin: 0 5px;
    }
    button:hover {
      background: #2563eb;
    }
  </style>
</head>
<body>
  <h1>Subtitle Verification</h1>
  
  <video controls>
    <source src="${url}" type="video/${videoBlob.type.split('/')[1] || 'mp4'}">
    Your browser does not support the video tag.
  </video>
  
  <div class="info">
    <h3>Verification Instructions:</h3>
    <ul>
      ${embedType === 'burn' ? `
        <li class="warning">Subtitles are <strong>burned in</strong> - they should be visible at all times</li>
        <li>Play the video and verify subtitles appear on screen</li>
        <li>Subtitles cannot be turned off (they're part of the video)</li>
      ` : `
        <li class="warning">Subtitles are <strong>embedded as a track</strong> - they can be toggled on/off</li>
        <li>Look for CC/subtitle button in the video controls</li>
        <li>If no CC button appears, your browser may not support embedded subtitles</li>
        <li>Try downloading and playing in VLC Media Player for full compatibility</li>
      `}
    </ul>
  </div>
  
  <div class="info">
    <h3>Video Information:</h3>
    <ul>
      <li>Size: ${(videoBlob.size / 1024 / 1024).toFixed(2)} MB</li>
      <li>Type: ${videoBlob.type}</li>
      <li>Subtitle Type: ${embedType === 'burn' ? 'Hard Subtitles (Burned In)' : 'Soft Subtitles (Track)'}</li>
    </ul>
  </div>
  
  <div class="controls">
    <button onclick="document.querySelector('video').play()">Play</button>
    <button onclick="document.querySelector('video').pause()">Pause</button>
    <button onclick="downloadVideo()">Download Video</button>
  </div>
  
  <script>
    function downloadVideo() {
      const a = document.createElement('a');
      a.href = "${url}";
      a.download = "video-with-subtitles.${videoBlob.type.split('/')[1] || 'mp4'}";
      a.click();
    }
    
    // Check for text tracks
    const video = document.querySelector('video');
    video.addEventListener('loadedmetadata', () => {
      const info = document.querySelector('.info:last-child ul');
      const duration = video.duration;
      const tracks = video.textTracks;
      
      info.innerHTML += \`
        <li>Duration: \${Math.floor(duration / 60)}:\${Math.floor(duration % 60).toString().padStart(2, '0')}</li>
        <li>Text Tracks: \${tracks.length > 0 ? tracks.length + ' track(s) found' : 'No tracks detected (may still be present)'}</li>
      \`;
      
      if (tracks.length > 0) {
        for (let i = 0; i < tracks.length; i++) {
          console.log('Track', i, ':', tracks[i]);
        }
      }
    });
  </script>
</body>
</html>
    `;
    
    return html;
  }
}

export const subtitleVerificationService = new SubtitleVerificationService(); 