export class VideoVerificationService {
  async createTestPage(videoBlob: Blob): Promise<string> {
    // Create a test HTML page with the video
    const videoUrl = URL.createObjectURL(videoBlob);
    
    const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Video Export Test</title>
  <style>
    body {
      margin: 0;
      padding: 20px;
      background: #000;
      color: #fff;
      font-family: Arial, sans-serif;
    }
    video {
      width: 100%;
      max-width: 800px;
      height: auto;
      display: block;
      margin: 20px auto;
      border: 2px solid #333;
    }
    .info {
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
      background: #111;
      border-radius: 8px;
    }
    .status {
      margin: 10px 0;
      padding: 10px;
      background: #222;
      border-radius: 4px;
    }
    .error {
      color: #ff4444;
    }
    .success {
      color: #44ff44;
    }
    .controls {
      text-align: center;
      margin: 20px 0;
    }
    button {
      padding: 10px 20px;
      margin: 0 10px;
      background: #444;
      color: #fff;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    }
    button:hover {
      background: #555;
    }
  </style>
</head>
<body>
  <h1>Video Export Verification</h1>
  
  <video id="testVideo" controls>
    <source src="${videoUrl}" type="video/mp4">
    <source src="${videoUrl}" type="video/webm">
  </video>
  
  <div class="controls">
    <button onclick="playVideo()">Play</button>
    <button onclick="pauseVideo()">Pause</button>
    <button onclick="seekToMiddle()">Seek to Middle</button>
    <button onclick="checkSubtitles()">Check Subtitles</button>
  </div>
  
  <div class="info">
    <div id="status" class="status">Loading video...</div>
    <div id="details"></div>
  </div>
  
  <script>
    const video = document.getElementById('testVideo');
    const status = document.getElementById('status');
    const details = document.getElementById('details');
    
    let videoInfo = {
      duration: 0,
      width: 0,
      height: 0,
      readyState: 0,
      error: null,
      currentTime: 0,
      paused: true,
      ended: false,
      buffered: 0,
      playbackRate: 1,
      volume: 1,
      muted: false,
      hasAudio: false,
      hasVideo: false,
      textTracks: []
    };
    
    function updateInfo() {
      videoInfo.currentTime = video.currentTime;
      videoInfo.paused = video.paused;
      videoInfo.ended = video.ended;
      videoInfo.buffered = video.buffered.length > 0 ? video.buffered.end(0) : 0;
      videoInfo.playbackRate = video.playbackRate;
      videoInfo.volume = video.volume;
      videoInfo.muted = video.muted;
      videoInfo.readyState = video.readyState;
      
      details.innerHTML = \`
        <h3>Video Properties:</h3>
        <p>Duration: \${videoInfo.duration.toFixed(2)}s</p>
        <p>Resolution: \${videoInfo.width}x\${videoInfo.height}</p>
        <p>Current Time: \${videoInfo.currentTime.toFixed(2)}s</p>
        <p>Buffered: \${videoInfo.buffered.toFixed(2)}s</p>
        <p>Ready State: \${getReadyStateName(videoInfo.readyState)}</p>
        <p>Has Audio: \${videoInfo.hasAudio ? 'Yes' : 'No'}</p>
        <p>Has Video: \${videoInfo.hasVideo ? 'Yes' : 'No'}</p>
        <p>Text Tracks: \${videoInfo.textTracks.length}</p>
        <p>Status: <span class="\${videoInfo.error ? 'error' : 'success'}">\${videoInfo.error || 'Playing normally'}</span></p>
      \`;
    }
    
    function getReadyStateName(state) {
      const states = ['HAVE_NOTHING', 'HAVE_METADATA', 'HAVE_CURRENT_DATA', 'HAVE_FUTURE_DATA', 'HAVE_ENOUGH_DATA'];
      return states[state] || 'UNKNOWN';
    }
    
    video.addEventListener('loadedmetadata', () => {
      videoInfo.duration = video.duration;
      videoInfo.width = video.videoWidth;
      videoInfo.height = video.videoHeight;
      videoInfo.hasVideo = video.videoHeight > 0 && video.videoWidth > 0;
      
      // Check for audio
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioContext.createMediaElementSource(video);
      videoInfo.hasAudio = source.channelCount > 0;
      
      // Check text tracks
      if (video.textTracks) {
        videoInfo.textTracks = Array.from(video.textTracks).map(track => ({
          kind: track.kind,
          label: track.label,
          language: track.language,
          mode: track.mode
        }));
      }
      
      status.textContent = 'Video loaded successfully';
      status.className = 'status success';
      updateInfo();
    });
    
    video.addEventListener('error', (e) => {
      videoInfo.error = \`Error: \${e.message || video.error?.message || 'Unknown error'}\`;
      status.textContent = videoInfo.error;
      status.className = 'status error';
      updateInfo();
    });
    
    video.addEventListener('timeupdate', updateInfo);
    video.addEventListener('play', updateInfo);
    video.addEventListener('pause', updateInfo);
    video.addEventListener('ended', updateInfo);
    
    function playVideo() {
      video.play().catch(e => {
        videoInfo.error = \`Play failed: \${e.message}\`;
        updateInfo();
      });
    }
    
    function pauseVideo() {
      video.pause();
    }
    
    function seekToMiddle() {
      video.currentTime = video.duration / 2;
    }
    
    function checkSubtitles() {
      if (video.textTracks.length > 0) {
        alert(\`Found \${video.textTracks.length} text track(s). Check console for details.\`);
        console.log('Text tracks:', Array.from(video.textTracks));
      } else {
        alert('No text tracks found. Subtitles may be burned into the video.');
      }
    }
    
    // Initial update
    updateInfo();
  </script>
</body>
</html>
    `;
    
    // Save the HTML to a blob
    const htmlBlob = new Blob([html], { type: 'text/html' });
    const htmlUrl = URL.createObjectURL(htmlBlob);
    
    return htmlUrl;
  }
  
  async verifyVideoWithBrowser(videoBlob: Blob): Promise<{
    isPlayable: boolean;
    hasVisibleSubtitles: boolean;
    quality: string;
    errors: string[];
  }> {
    // This would use MCP browser to test the video
    // For now, return a basic check
    const video = document.createElement('video');
    video.src = URL.createObjectURL(videoBlob);
    
    return new Promise((resolve) => {
      const result = {
        isPlayable: false,
        hasVisibleSubtitles: false,
        quality: 'unknown',
        errors: [] as string[]
      };
      
      video.onloadedmetadata = () => {
        result.isPlayable = true;
        result.quality = video.videoHeight >= 720 ? 'HD' : 'SD';
        URL.revokeObjectURL(video.src);
        resolve(result);
      };
      
      video.onerror = () => {
        result.errors.push('Video failed to load');
        URL.revokeObjectURL(video.src);
        resolve(result);
      };
    });
  }

  async getVideoBlob(videoElement: HTMLVideoElement): Promise<Blob | null> {
    try {
      const src = videoElement.src;
      
      // If it's already a blob URL, fetch the blob
      if (src.startsWith('blob:')) {
        const response = await fetch(src);
        return await response.blob();
      }
      
      // If it's a regular URL, fetch it
      if (src.startsWith('http://') || src.startsWith('https://')) {
        const response = await fetch(src);
        return await response.blob();
      }
      
      // For other cases (file://, data:, etc.), we might need different handling
      console.warn('[VideoVerification] Unsupported video source type:', src);
      return null;
    } catch (error) {
      console.error('[VideoVerification] Failed to get video blob:', error);
      return null;
    }
  }

  // Verify burned subtitles by analyzing pixel changes
  async verifyBurnedSubtitles(videoBlob: Blob, subtitleTimes: { start: number; end: number }[]): Promise<{
    hasBurnedSubtitles: boolean;
    confidence: number;
    details: string;
  }> {
    console.log('[VideoVerification] Verifying burned subtitles...');
    
    const video = document.createElement('video');
    video.src = URL.createObjectURL(videoBlob);
    video.muted = true;
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    
    if (!ctx) {
      return { hasBurnedSubtitles: false, confidence: 0, details: 'Failed to get canvas context' };
    }
    
    return new Promise((resolve) => {
      video.onloadedmetadata = async () => {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        let pixelChangesDetected = 0;
        const samplesToCheck = Math.min(5, subtitleTimes.length);
        
        for (let i = 0; i < samplesToCheck; i++) {
          const subtitle = subtitleTimes[i];
          
          // Sample before subtitle
          video.currentTime = Math.max(0, subtitle.start - 0.5);
          await new Promise(r => video.onseeked = r);
          ctx.drawImage(video, 0, 0);
          const beforeData = ctx.getImageData(0, canvas.height - 100, canvas.width, 100);
          
          // Sample during subtitle
          video.currentTime = (subtitle.start + subtitle.end) / 2;
          await new Promise(r => video.onseeked = r);
          ctx.drawImage(video, 0, 0);
          const duringData = ctx.getImageData(0, canvas.height - 100, canvas.width, 100);
          
          // Compare pixels
          let differences = 0;
          for (let j = 0; j < beforeData.data.length; j += 4) {
            const diff = Math.abs(beforeData.data[j] - duringData.data[j]) +
                        Math.abs(beforeData.data[j + 1] - duringData.data[j + 1]) +
                        Math.abs(beforeData.data[j + 2] - duringData.data[j + 2]);
            if (diff > 50) differences++;
          }
          
          if (differences > 100) pixelChangesDetected++;
        }
        
        URL.revokeObjectURL(video.src);
        
        const confidence = (pixelChangesDetected / samplesToCheck) * 100;
        resolve({
          hasBurnedSubtitles: confidence > 60,
          confidence,
          details: `Detected pixel changes in ${pixelChangesDetected}/${samplesToCheck} subtitle regions`
        });
      };
      
      video.onerror = () => {
        URL.revokeObjectURL(video.src);
        resolve({ hasBurnedSubtitles: false, confidence: 0, details: 'Failed to load video' });
      };
    });
  }

  // Verify embedded subtitle tracks
  async verifyEmbeddedSubtitles(videoBlob: Blob): Promise<{
    hasEmbeddedSubtitles: boolean;
    trackCount: number;
    tracks: Array<{ kind: string; label: string; language: string }>;
    details: string;
  }> {
    console.log('[VideoVerification] Verifying embedded subtitles...');
    
    const video = document.createElement('video');
    video.src = URL.createObjectURL(videoBlob);
    
    return new Promise((resolve) => {
      video.onloadedmetadata = () => {
        const tracks = Array.from(video.textTracks || []).map(track => ({
          kind: track.kind,
          label: track.label,
          language: track.language
        }));
        
        URL.revokeObjectURL(video.src);
        
        resolve({
          hasEmbeddedSubtitles: tracks.length > 0,
          trackCount: tracks.length,
          tracks,
          details: tracks.length > 0 
            ? `Found ${tracks.length} subtitle track(s)` 
            : 'No subtitle tracks found'
        });
      };
      
      video.onerror = () => {
        URL.revokeObjectURL(video.src);
        resolve({
          hasEmbeddedSubtitles: false,
          trackCount: 0,
          tracks: [],
          details: 'Failed to load video'
        });
      };
    });
  }

  // Verify video is not choppy by measuring FPS
  async verifyNoChoppiness(videoBlob: Blob, sampleDuration: number = 5): Promise<{
    averageFps: number;
    isSmooth: boolean;
    details: string;
  }> {
    console.log('[VideoVerification] Verifying video smoothness...');
    
    const video = document.createElement('video');
    video.src = URL.createObjectURL(videoBlob);
    video.muted = true;
    
    return new Promise((resolve) => {
      video.onloadedmetadata = async () => {
        let frameCount = 0;
        let lastTime = 0;
        const startTime = performance.now();
        
        const countFrames = () => {
          if (video.currentTime !== lastTime) {
            frameCount++;
            lastTime = video.currentTime;
          }
          
          const elapsed = (performance.now() - startTime) / 1000;
          if (elapsed < sampleDuration && !video.ended) {
            requestAnimationFrame(countFrames);
          } else {
            video.pause();
            URL.revokeObjectURL(video.src);
            
            const averageFps = frameCount / elapsed;
            resolve({
              averageFps,
              isSmooth: averageFps >= 25, // Consider smooth if >= 25 FPS
              details: `Average FPS: ${averageFps.toFixed(2)} over ${elapsed.toFixed(2)}s`
            });
          }
        };
        
        video.play().then(() => {
          requestAnimationFrame(countFrames);
        }).catch(() => {
          URL.revokeObjectURL(video.src);
          resolve({ averageFps: 0, isSmooth: false, details: 'Failed to play video' });
        });
      };
      
      video.onerror = () => {
        URL.revokeObjectURL(video.src);
        resolve({ averageFps: 0, isSmooth: false, details: 'Failed to load video' });
      };
    });
  }

  // Verify video is not corrupted
  async verifyNoCorruption(videoBlob: Blob, originalDuration?: number): Promise<{
    isValid: boolean;
    duration: number;
    resolution: { width: number; height: number };
    size: number;
    errors: string[];
  }> {
    console.log('[VideoVerification] Verifying video integrity...');
    
    const video = document.createElement('video');
    video.src = URL.createObjectURL(videoBlob);
    
    return new Promise((resolve) => {
      const result = {
        isValid: false,
        duration: 0,
        resolution: { width: 0, height: 0 },
        size: videoBlob.size,
        errors: [] as string[]
      };
      
      video.onloadedmetadata = async () => {
        result.duration = video.duration;
        result.resolution = { width: video.videoWidth, height: video.videoHeight };
        
        // Basic corruption checks
        if (isNaN(video.duration) || video.duration === 0) {
          result.errors.push('Invalid duration');
        }
        
        if (video.videoWidth === 0 || video.videoHeight === 0) {
          result.errors.push('Invalid resolution');
        }
        
        if (originalDuration && Math.abs(video.duration - originalDuration) > 1) {
          result.errors.push(`Duration mismatch: ${video.duration.toFixed(2)}s vs ${originalDuration.toFixed(2)}s`);
        }
        
        // Try to play a bit
        try {
          await video.play();
          await new Promise(r => setTimeout(r, 100));
          video.pause();
          result.isValid = result.errors.length === 0;
        } catch (e) {
          result.errors.push(`Playback error: ${e}`);
        }
        
        URL.revokeObjectURL(video.src);
        resolve(result);
      };
      
      video.onerror = () => {
        result.errors.push('Failed to load video');
        URL.revokeObjectURL(video.src);
        resolve(result);
      };
    });
  }

  // Comprehensive test suite
  async runComprehensiveTest(
    videoBlob: Blob,
    subtitleTimes: { start: number; end: number }[],
    originalDuration: number,
    expectBurned: boolean,
    expectEmbedded: boolean
  ): Promise<{
    passed: boolean;
    results: {
      corruption: Awaited<ReturnType<VideoVerificationService['verifyNoCorruption']>>;
      choppiness: Awaited<ReturnType<VideoVerificationService['verifyNoChoppiness']>>;
      burned: Awaited<ReturnType<VideoVerificationService['verifyBurnedSubtitles']>>;
      embedded: Awaited<ReturnType<VideoVerificationService['verifyEmbeddedSubtitles']>>;
    };
    summary: string;
  }> {
    console.log('[VideoVerification] Running comprehensive test suite...');
    
    const [corruption, choppiness, burned, embedded] = await Promise.all([
      this.verifyNoCorruption(videoBlob, originalDuration),
      this.verifyNoChoppiness(videoBlob),
      this.verifyBurnedSubtitles(videoBlob, subtitleTimes),
      this.verifyEmbeddedSubtitles(videoBlob)
    ]);
    
    const results = { corruption, choppiness, burned, embedded };
    
    // Determine if all tests passed
    const passed = 
      corruption.isValid &&
      choppiness.isSmooth &&
      (expectBurned ? burned.hasBurnedSubtitles : true) &&
      (expectEmbedded ? embedded.hasEmbeddedSubtitles : true);
    
    const summary = `
Test Results:
- Video Integrity: ${corruption.isValid ? '✅ PASS' : '❌ FAIL'} ${corruption.errors.join(', ')}
- Smoothness: ${choppiness.isSmooth ? '✅ PASS' : '❌ FAIL'} (${choppiness.averageFps.toFixed(1)} FPS)
- Burned Subtitles: ${expectBurned ? (burned.hasBurnedSubtitles ? '✅ PASS' : '❌ FAIL') : 'N/A'} (${burned.confidence.toFixed(0)}% confidence)
- Embedded Tracks: ${expectEmbedded ? (embedded.hasEmbeddedSubtitles ? '✅ PASS' : '❌ FAIL') : 'N/A'} (${embedded.trackCount} tracks)
    `.trim();
    
    console.log('[VideoVerification] Test complete:', summary);
    
    return { passed, results, summary };
  }
}

export const videoVerificationService = new VideoVerificationService(); 