export class AudioExtractor {
  private audioContext: AudioContext;

  constructor() {
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }

  /**
   * Extract audio data from video file
   */
  async extractFromVideo(videoFile: File): Promise<Float32Array> {
    // Create video element
    const video = document.createElement('video');
    video.src = URL.createObjectURL(videoFile);
    video.muted = true;
    
    // Wait for metadata to load
    await new Promise((resolve, reject) => {
      video.addEventListener('loadedmetadata', resolve);
      video.addEventListener('error', reject);
    });

    // Create audio element for extraction
    const audio = document.createElement('audio');
    audio.src = video.src;
    
    // Decode audio data
    const audioBuffer = await this.decodeAudioFromElement(audio);
    
    // Clean up
    URL.revokeObjectURL(video.src);
    
    // Convert to mono if stereo
    return this.convertToMono(audioBuffer);
  }

  /**
   * Extract audio from video URL
   */
  async extractFromURL(videoUrl: string): Promise<Float32Array> {
    const response = await fetch(videoUrl);
    const blob = await response.blob();
    const arrayBuffer = await blob.arrayBuffer();
    
    const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
    return this.convertToMono(audioBuffer);
  }

  /**
   * Extract audio from video element
   */
  async extractFromVideoElement(video: HTMLVideoElement): Promise<Float32Array> {
    const stream = (video as any).captureStream();
    const audioTracks = stream.getAudioTracks();
    
    if (audioTracks.length === 0) {
      throw new Error('No audio tracks found in video');
    }

    const mediaStreamSource = this.audioContext.createMediaStreamSource(stream);
    const analyser = this.audioContext.createAnalyser();
    const scriptProcessor = this.audioContext.createScriptProcessor(4096, 1, 1);
    
    const chunks: Float32Array[] = [];
    
    return new Promise((resolve) => {
      scriptProcessor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        chunks.push(new Float32Array(inputData));
      };

      mediaStreamSource.connect(analyser);
      analyser.connect(scriptProcessor);
      scriptProcessor.connect(this.audioContext.destination);

      // Capture for video duration
      video.addEventListener('ended', () => {
        scriptProcessor.disconnect();
        analyser.disconnect();
        mediaStreamSource.disconnect();
        
        // Combine chunks
        const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
        const result = new Float32Array(totalLength);
        let offset = 0;
        
        for (const chunk of chunks) {
          result.set(chunk, offset);
          offset += chunk.length;
        }
        
        resolve(result);
      });

      video.play();
    });
  }

  /**
   * Decode audio from audio element
   */
  private async decodeAudioFromElement(audio: HTMLAudioElement): Promise<AudioBuffer> {
    return new Promise((resolve, reject) => {
      const source = this.audioContext.createMediaElementSource(audio);
      const analyser = this.audioContext.createAnalyser();
      
      source.connect(analyser);
      analyser.connect(this.audioContext.destination);

      audio.addEventListener('canplaythrough', async () => {
        try {
          const response = await fetch(audio.src);
          const arrayBuffer = await response.arrayBuffer();
          const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
          resolve(audioBuffer);
        } catch (error) {
          reject(error);
        }
      });

      audio.addEventListener('error', reject);
      audio.load();
    });
  }

  /**
   * Convert stereo audio to mono
   */
  private convertToMono(audioBuffer: AudioBuffer): Float32Array {
    const numberOfChannels = audioBuffer.numberOfChannels;
    const length = audioBuffer.length;
    const sampleRate = audioBuffer.sampleRate;
    
    if (numberOfChannels === 1) {
      return audioBuffer.getChannelData(0);
    }
    
    // Mix down to mono
    const monoData = new Float32Array(length);
    
    for (let i = 0; i < length; i++) {
      let sum = 0;
      for (let channel = 0; channel < numberOfChannels; channel++) {
        sum += audioBuffer.getChannelData(channel)[i];
      }
      monoData[i] = sum / numberOfChannels;
    }
    
    return monoData;
  }

  /**
   * Resample audio to target sample rate
   */
  resampleAudio(audioData: Float32Array, fromSampleRate: number, toSampleRate: number): Float32Array {
    if (fromSampleRate === toSampleRate) {
      return audioData;
    }
    
    const ratio = fromSampleRate / toSampleRate;
    const newLength = Math.round(audioData.length / ratio);
    const result = new Float32Array(newLength);
    
    for (let i = 0; i < newLength; i++) {
      const index = i * ratio;
      const indexFloor = Math.floor(index);
      const indexCeil = Math.ceil(index);
      const interpolation = index - indexFloor;
      
      result[i] = audioData[indexFloor] * (1 - interpolation) + 
                  (audioData[indexCeil] || 0) * interpolation;
    }
    
    return result;
  }

  /**
   * Extract audio segment
   */
  extractSegment(audioData: Float32Array, startTime: number, endTime: number, sampleRate: number): Float32Array {
    const startSample = Math.floor(startTime * sampleRate);
    const endSample = Math.floor(endTime * sampleRate);
    
    return audioData.slice(startSample, endSample);
  }

  /**
   * Detect speech segments using energy-based VAD
   */
  detectSpeechSegments(
    audioData: Float32Array, 
    sampleRate: number,
    options: {
      frameSize?: number;
      frameStep?: number;
      energyThreshold?: number;
      minSilenceDuration?: number;
      minSpeechDuration?: number;
    } = {}
  ): Array<{ start: number; end: number }> {
    const {
      frameSize = 0.025, // 25ms
      frameStep = 0.01, // 10ms
      energyThreshold = 0.02,
      minSilenceDuration = 0.3, // 300ms
      minSpeechDuration = 0.1, // 100ms
    } = options;

    const frameSizeSamples = Math.floor(frameSize * sampleRate);
    const frameStepSamples = Math.floor(frameStep * sampleRate);
    
    const segments: Array<{ start: number; end: number }> = [];
    let inSpeech = false;
    let speechStart = 0;
    let silenceStart = 0;
    
    for (let i = 0; i < audioData.length - frameSizeSamples; i += frameStepSamples) {
      // Calculate frame energy
      let energy = 0;
      for (let j = 0; j < frameSizeSamples; j++) {
        energy += audioData[i + j] ** 2;
      }
      energy = Math.sqrt(energy / frameSizeSamples);
      
      const currentTime = i / sampleRate;
      
      if (energy > energyThreshold) {
        if (!inSpeech) {
          inSpeech = true;
          speechStart = currentTime;
        }
        silenceStart = currentTime;
      } else {
        if (inSpeech && currentTime - silenceStart > minSilenceDuration) {
          const duration = silenceStart - speechStart;
          if (duration > minSpeechDuration) {
            segments.push({
              start: speechStart,
              end: silenceStart
            });
          }
          inSpeech = false;
        }
      }
    }
    
    // Handle last segment
    if (inSpeech) {
      const duration = audioData.length / sampleRate - speechStart;
      if (duration > minSpeechDuration) {
        segments.push({
          start: speechStart,
          end: audioData.length / sampleRate
        });
      }
    }
    
    return segments;
  }

  /**
   * Get audio waveform data for visualization
   */
  getWaveformData(audioData: Float32Array, targetPoints: number): Float32Array {
    const blockSize = Math.floor(audioData.length / targetPoints);
    const waveform = new Float32Array(targetPoints);
    
    for (let i = 0; i < targetPoints; i++) {
      const start = i * blockSize;
      const end = Math.min(start + blockSize, audioData.length);
      
      let max = 0;
      for (let j = start; j < end; j++) {
        max = Math.max(max, Math.abs(audioData[j]));
      }
      
      waveform[i] = max;
    }
    
    return waveform;
  }

  /**
   * Normalize audio data
   */
  normalizeAudio(audioData: Float32Array): Float32Array {
    const maxValue = Math.max(...audioData.map(Math.abs));
    if (maxValue === 0) return audioData;
    
    const normalized = new Float32Array(audioData.length);
    const scale = 0.95 / maxValue; // Normalize to 95% to avoid clipping
    
    for (let i = 0; i < audioData.length; i++) {
      normalized[i] = audioData[i] * scale;
    }
    
    return normalized;
  }

  dispose(): void {
    if (this.audioContext.state !== 'closed') {
      this.audioContext.close();
    }
  }
}

// Export singleton instance
export const audioExtractor = new AudioExtractor(); 