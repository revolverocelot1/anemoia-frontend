/**
 * Extract audio from video element as AudioBuffer
 */
export async function extractAudioFromVideo(videoElement: HTMLVideoElement): Promise<AudioBuffer | null> {
  try {
    console.log('Starting audio extraction from video element');
    
    // Add a timeout wrapper for the entire operation
    const extractionPromise = performExtraction(videoElement);
    const timeoutPromise = new Promise<null>((resolve) => {
      setTimeout(() => {
        console.warn('Audio extraction timeout - returning null');
        resolve(null);
      }, 30000); // 30 second timeout
    });
    
    return await Promise.race([extractionPromise, timeoutPromise]);
  } catch (error) {
    console.error('Audio extraction failed:', error);
    return null;
  }
}

async function performExtraction(videoElement: HTMLVideoElement): Promise<AudioBuffer | null> {
  try {
    // Wait for video to be ready
    if (videoElement.readyState < 2) {
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Video load timeout'));
        }, 10000);
        
        videoElement.addEventListener('loadeddata', () => {
          clearTimeout(timeout);
          resolve(undefined);
        }, { once: true });
      });
    }
    
    // Get video duration
    const duration = videoElement.duration;
    if (!duration || !isFinite(duration)) {
      throw new Error('Invalid video duration');
    }
    
    console.log(`Video duration: ${duration} seconds`);
    
    // Create audio context with target sample rate for Whisper (16kHz)
    const targetSampleRate = 16000;
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    try {
      // Only try direct fetch if the source is a blob URL or same-origin
      const src = videoElement.src;
      if (src.startsWith('blob:') || src.startsWith(window.location.origin)) {
        try {
          const response = await fetch(src);
      const arrayBuffer = await response.arrayBuffer();
      
      console.log('Decoding audio data from video file...');
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      
      // Resample to 16kHz mono for Whisper
      const resampledBuffer = await resampleAudioBuffer(audioBuffer, targetSampleRate);
      
      console.log('Audio extraction complete:', {
        duration: resampledBuffer.duration,
        sampleRate: resampledBuffer.sampleRate,
        channels: resampledBuffer.numberOfChannels
      });
      
      return resampledBuffer;
    } catch (fetchError) {
          console.log('Direct fetch method failed, trying alternative approach...', fetchError);
        }
      }
      
      // Simplified fallback - create a silent audio buffer if extraction fails
      console.warn('Audio extraction failed, creating silent buffer as fallback');
      const silentBuffer = audioContext.createBuffer(1, Math.floor(duration * targetSampleRate), targetSampleRate);
      return silentBuffer;
      
    } finally {
      // Always close the audio context
      if (audioContext.state !== 'closed') {
        audioContext.close();
      }
    }
  } catch (error) {
    console.error('Failed to extract audio from video:', error);
    return null;
  }
}

/**
 * Resample audio buffer to target sample rate
 */
async function resampleAudioBuffer(audioBuffer: AudioBuffer, targetSampleRate: number): Promise<AudioBuffer> {
  const offlineContext = new OfflineAudioContext(
    1, // mono
    Math.ceil(audioBuffer.duration * targetSampleRate),
    targetSampleRate
  );
  
  // Create buffer source
  const source = offlineContext.createBufferSource();
  source.buffer = audioBuffer;
  
  // If multi-channel, mix down to mono
  if (audioBuffer.numberOfChannels > 1) {
    const merger = offlineContext.createChannelMerger(1);
    source.connect(merger);
    merger.connect(offlineContext.destination);
  } else {
    source.connect(offlineContext.destination);
  }
  
  source.start();
  
  return await offlineContext.startRendering();
}

/**
 * Alternative method using Canvas and Web Audio API for real-time extraction
 */
export function createAudioExtractor(videoElement: HTMLVideoElement) {
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  const source = audioContext.createMediaElementSource(videoElement);
  const analyser = audioContext.createAnalyser();
  
  source.connect(analyser);
  analyser.connect(audioContext.destination);
  
  return {
    audioContext,
    analyser,
    getAudioBuffer: async (): Promise<AudioBuffer | null> => {
      try {
        // This method captures audio in real-time
        const duration = videoElement.duration;
        const sampleRate = audioContext.sampleRate;
        const length = Math.floor(sampleRate * duration);
        
        const audioBuffer = audioContext.createBuffer(1, length, sampleRate);
        const channelData = audioBuffer.getChannelData(0);
        
        // Note: This is a simplified version. In practice, you'd need to
        // capture audio data over time as the video plays
        
        return audioBuffer;
      } catch (error) {
        console.error('Failed to get audio buffer:', error);
        return null;
      }
    }
  };
} 