/**
 * Audio extraction utilities for video processing
 */
export class AudioExtractor {
  private audioContext: AudioContext | null = null;
  private ffmpeg: any = null;

  constructor() {
    if (typeof window !== 'undefined' && 'AudioContext' in window) {
      this.audioContext = new AudioContext();
    }
  }

  /**
   * Extract audio from video file
   */
  async extractFromVideo(videoFile: File): Promise<AudioBuffer> {
    try {
      // Method 1: Try using Web Audio API directly
      const audioBuffer = await this.extractUsingWebAudio(videoFile);
      if (audioBuffer) return audioBuffer;
    } catch (error) {
      console.warn('Web Audio extraction failed, trying alternative method:', error);
    }

    // Method 2: Use video element and MediaElementAudioSourceNode
    return this.extractUsingVideoElement(videoFile);
  }

  /**
   * Extract audio using Web Audio API
   */
  private async extractUsingWebAudio(file: File): Promise<AudioBuffer> {
    if (!this.audioContext) {
      throw new Error('AudioContext not available');
    }

    const arrayBuffer = await file.arrayBuffer();
    return await this.audioContext.decodeAudioData(arrayBuffer);
  }

  /**
   * Extract audio using video element
   */
  private async extractUsingVideoElement(file: File): Promise<AudioBuffer> {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      const url = URL.createObjectURL(file);
      
      video.src = url;
      video.muted = false;
      video.preload = 'auto';
      
      video.addEventListener('loadedmetadata', async () => {
        try {
          if (!this.audioContext) {
            throw new Error('AudioContext not available');
          }

          // For video elements, we need to fetch and decode separately
          const response = await fetch(url);
          const arrayBuffer = await response.arrayBuffer();
          
          try {
            // Try to decode as audio
            const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer.slice(0));
            URL.revokeObjectURL(url);
            video.remove();
            resolve(audioBuffer);
          } catch (decodeError) {
            // If direct decode fails, create a simple buffer
            const duration = video.duration;
            const sampleRate = 48000;
            const length = Math.floor(sampleRate * duration);
            const buffer = this.audioContext.createBuffer(1, length, sampleRate);
            
            // Fill with silence for now (in production, you'd use FFmpeg.js or similar)
            const channelData = buffer.getChannelData(0);
            for (let i = 0; i < channelData.length; i++) {
              channelData[i] = 0;
            }
            
            URL.revokeObjectURL(url);
            video.remove();
            
            console.warn('Could not extract audio from video, returning empty buffer');
            resolve(buffer);
          }
        } catch (error) {
          URL.revokeObjectURL(url);
          video.remove();
          reject(error);
        }
      });
      
      video.addEventListener('error', () => {
        URL.revokeObjectURL(url);
        video.remove();
        reject(new Error('Failed to load video'));
      });
      
      // Trigger load
      video.load();
    });
  }

  /**
   * Extract audio from video URL
   */
  async extractFromURL(videoUrl: string): Promise<AudioBuffer> {
    const response = await fetch(videoUrl);
    const blob = await response.blob();
    const file = new File([blob], 'video', { type: blob.type });
    return this.extractFromVideo(file);
  }

  /**
   * Convert AudioBuffer to mono Float32Array at target sample rate
   */
  convertToMono(audioBuffer: AudioBuffer, targetSampleRate: number = 16000): Float32Array {
    // Get the first channel or mix down multiple channels
    let channelData: Float32Array;
    
    if (audioBuffer.numberOfChannels === 1) {
      channelData = audioBuffer.getChannelData(0);
    } else {
      // Mix down to mono
      channelData = new Float32Array(audioBuffer.length);
      for (let i = 0; i < audioBuffer.numberOfChannels; i++) {
        const channel = audioBuffer.getChannelData(i);
        for (let j = 0; j < channel.length; j++) {
          channelData[j] += channel[j] / audioBuffer.numberOfChannels;
        }
      }
    }
    
    // Resample if needed
    if (audioBuffer.sampleRate !== targetSampleRate) {
      return this.resample(channelData, audioBuffer.sampleRate, targetSampleRate);
    }
    
    return channelData;
  }

  /**
   * Resample audio data to target sample rate
   */
  private resample(audioData: Float32Array, fromSampleRate: number, toSampleRate: number): Float32Array {
    const ratio = fromSampleRate / toSampleRate;
    const newLength = Math.round(audioData.length / ratio);
    const result = new Float32Array(newLength);
    
    for (let i = 0; i < newLength; i++) {
      const index = i * ratio;
      const indexFloor = Math.floor(index);
      const indexCeil = Math.ceil(index);
      const interpolation = index - indexFloor;
      
      result[i] = audioData[indexFloor] * (1 - interpolation) + 
                  (audioData[indexCeil] || audioData[indexFloor]) * interpolation;
    }
    
    return result;
  }

  /**
   * Extract audio segment
   */
  extractSegment(audioBuffer: AudioBuffer, startTime: number, endTime: number): AudioBuffer {
    const sampleRate = audioBuffer.sampleRate;
    const startSample = Math.floor(startTime * sampleRate);
    const endSample = Math.ceil(endTime * sampleRate);
    const length = endSample - startSample;
    
    if (!this.audioContext) {
      throw new Error('AudioContext not available');
    }
    
    const segmentBuffer = this.audioContext.createBuffer(
      audioBuffer.numberOfChannels,
      length,
      sampleRate
    );
    
    for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
      const channelData = audioBuffer.getChannelData(channel);
      const segmentData = segmentBuffer.getChannelData(channel);
      
      for (let i = 0; i < length; i++) {
        segmentData[i] = channelData[startSample + i] || 0;
      }
    }
    
    return segmentBuffer;
  }

  /**
   * Get audio waveform data for visualization
   */
  getWaveformData(audioBuffer: AudioBuffer, samples: number = 1000): Float32Array {
    const channelData = audioBuffer.getChannelData(0);
    const blockSize = Math.floor(channelData.length / samples);
    const waveform = new Float32Array(samples);
    
    for (let i = 0; i < samples; i++) {
      const start = i * blockSize;
      const end = Math.min(start + blockSize, channelData.length);
      
      let max = 0;
      for (let j = start; j < end; j++) {
        const abs = Math.abs(channelData[j]);
        if (abs > max) max = abs;
      }
      
      waveform[i] = max;
    }
    
    return waveform;
  }

  /**
   * Normalize audio levels
   */
  normalizeAudio(audioData: Float32Array, targetLevel: number = 0.95): Float32Array {
    let maxLevel = 0;
    
    // Find max level
    for (let i = 0; i < audioData.length; i++) {
      const abs = Math.abs(audioData[i]);
      if (abs > maxLevel) maxLevel = abs;
    }
    
    if (maxLevel === 0) return audioData;
    
    // Normalize
    const scale = targetLevel / maxLevel;
    const normalized = new Float32Array(audioData.length);
    
    for (let i = 0; i < audioData.length; i++) {
      normalized[i] = audioData[i] * scale;
    }
    
    return normalized;
  }

  /**
   * Apply fade in/out
   */
  applyFade(audioData: Float32Array, fadeInDuration: number, fadeOutDuration: number, sampleRate: number): Float32Array {
    const result = new Float32Array(audioData);
    const fadeInSamples = Math.floor(fadeInDuration * sampleRate);
    const fadeOutSamples = Math.floor(fadeOutDuration * sampleRate);
    
    // Fade in
    for (let i = 0; i < fadeInSamples && i < result.length; i++) {
      result[i] *= i / fadeInSamples;
    }
    
    // Fade out
    const startFadeOut = result.length - fadeOutSamples;
    for (let i = 0; i < fadeOutSamples && startFadeOut + i < result.length; i++) {
      result[startFadeOut + i] *= (fadeOutSamples - i) / fadeOutSamples;
    }
    
    return result;
  }

  /**
   * Clean up resources
   */
  dispose() {
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
    }
    this.audioContext = null;
  }
}

// Export singleton instance
export const audioExtractor = new AudioExtractor(); 