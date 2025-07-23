// Mock Whisper Service - Simulates transcription without ONNX
// This is a temporary solution while we fix ONNX/Whisper issues

import type { SubtitleSegment, TranscriptionOptions, TranscriptionResult } from '../types/subtitle';

export class MockWhisperService {
  private isTranscribing: boolean = false;
  private abortController: AbortController | null = null;

  // Mock transcription data
  private mockTranscriptions = [
    "Welcome to our video subtitle editor.",
    "This is a powerful tool for creating and editing subtitles.",
    "You can transcribe audio automatically using AI.",
    "Or you can manually create and edit subtitles.",
    "The editor supports multiple subtitle tracks.",
    "You can export your subtitles in various formats.",
    "Including SRT, VTT, and burned-in video.",
    "Try adjusting the style and position of your subtitles.",
    "The timeline makes it easy to sync with your video.",
    "Thank you for using our subtitle editor!"
  ];

  async transcribe(
    audioData: ArrayBuffer,
    options: TranscriptionOptions,
    onProgress?: (progress: number, status: string) => void
  ): Promise<TranscriptionResult> {
    this.isTranscribing = true;
    this.abortController = new AbortController();
    
    try {
      // Simulate model loading
      if (onProgress) {
        onProgress(0, 'Loading model...');
        await this.delay(1000);
        onProgress(20, 'Model loaded');
      }
      
      // Simulate processing
      const segments: TranscriptionResult['segments'] = [];
      let currentTime = 0;
      
      for (let i = 0; i < this.mockTranscriptions.length; i++) {
        if (this.abortController.signal.aborted) {
          throw new Error('Transcription aborted');
        }
        
        const text = this.mockTranscriptions[i];
        const duration = this.estimateDuration(text);
        
        segments.push({
          text,
          start: currentTime,
          end: currentTime + duration,
          confidence: 0.95 + Math.random() * 0.05
        });
        
        currentTime += duration + 0.5; // Add gap between segments
        
        if (onProgress) {
          const progress = 20 + (i / this.mockTranscriptions.length) * 70;
          onProgress(progress, `Processing segment ${i + 1}/${this.mockTranscriptions.length}`);
        }
        
        await this.delay(500); // Simulate processing time
      }
      
      if (onProgress) {
        onProgress(100, 'Transcription complete');
      }
      
      const fullText = segments.map(s => s.text).join(' ');
      
      return {
        text: fullText,
        segments,
        language: options.language === 'auto' ? 'en' : options.language
      };
    } finally {
      this.isTranscribing = false;
      this.abortController = null;
    }
  }

  abort() {
    if (this.abortController) {
      this.abortController.abort();
    }
  }

  isActive(): boolean {
    return this.isTranscribing;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private estimateDuration(text: string): number {
    // Estimate duration based on word count (average speaking rate)
    const words = text.split(' ').length;
    const wordsPerSecond = 2.5;
    return words / wordsPerSecond;
  }

  // Convert to subtitle segments
  static toSubtitleSegments(result: TranscriptionResult): SubtitleSegment[] {
    return result.segments.map((segment, index) => ({
      id: `segment-${Date.now()}-${index}`,
      text: segment.text,
      startTime: segment.start,
      endTime: segment.end,
      confidence: segment.confidence
    }));
  }
}

// Singleton instance
let instance: MockWhisperService | null = null;

export function getMockWhisperService(): MockWhisperService {
  if (!instance) {
    instance = new MockWhisperService();
  }
  return instance;
} 