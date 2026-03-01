import type { SubtitleSegment } from '../types/subtitle';

export interface WebSpeechTranscriptionOptions {
  language?: string;
  continuous?: boolean;
  interimResults?: boolean;
  maxAlternatives?: number;
}

export class WebSpeechTranscriptionService {
  private recognition: any;
  private isTranscribing: boolean = false;
  private currentSegments: SubtitleSegment[] = [];
  private startTime: number = 0;
  private lastSegmentEndTime: number = 0;

  constructor() {
    // Check if Web Speech API is available
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      throw new Error('Web Speech API is not supported in this browser');
    }
    
    this.recognition = new SpeechRecognition();
    this.setupRecognition();
  }

  private setupRecognition() {
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.maxAlternatives = 1;
    
    this.recognition.onstart = () => {
      this.startTime = Date.now() / 1000;
      this.lastSegmentEndTime = 0;
    };
    
    this.recognition.onresult = (event: any) => {
      const results = event.results;
      
      for (let i = event.resultIndex; i < results.length; i++) {
        const result = results[i];
        const transcript = result[0].transcript;
        const confidence = result[0].confidence || 0.9;
        
        if (result.isFinal) {
          const currentTime = (Date.now() / 1000) - this.startTime;
          const segment: SubtitleSegment = {
            id: `segment-${Date.now()}-${Math.random()}`,
            text: transcript.trim(),
            startTime: this.lastSegmentEndTime,
            endTime: currentTime,
            confidence: confidence
          };
          
          this.currentSegments.push(segment);
          this.lastSegmentEndTime = currentTime + 0.1; // Small gap between segments
          
          // Emit segment event
          this.onSegment?.(segment);
        } else {
          // Handle interim results if needed
          this.onInterimResult?.(transcript);
        }
      }
    };
    
    this.recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      this.onError?.(event.error);
    };
    
    this.recognition.onend = () => {
      this.isTranscribing = false;
      this.onEnd?.(this.currentSegments);
    };
  }

  // Event handlers (to be set by consumer)
  public onSegment?: (segment: SubtitleSegment) => void;
  public onInterimResult?: (text: string) => void;
  public onError?: (error: string) => void;
  public onEnd?: (segments: SubtitleSegment[]) => void;

  public start(options?: WebSpeechTranscriptionOptions) {
    if (this.isTranscribing) {
      console.warn('Transcription already in progress');
      return;
    }
    
    // Apply options
    if (options?.language) {
      this.recognition.lang = options.language;
    }
    if (options?.continuous !== undefined) {
      this.recognition.continuous = options.continuous;
    }
    if (options?.interimResults !== undefined) {
      this.recognition.interimResults = options.interimResults;
    }
    if (options?.maxAlternatives !== undefined) {
      this.recognition.maxAlternatives = options.maxAlternatives;
    }
    
    this.currentSegments = [];
    this.isTranscribing = true;
    this.recognition.start();
  }

  public stop() {
    if (this.isTranscribing) {
      this.recognition.stop();
      this.isTranscribing = false;
    }
  }

  public abort() {
    if (this.isTranscribing) {
      this.recognition.abort();
      this.isTranscribing = false;
    }
  }

  public isSupported(): boolean {
    return !!(window as any).SpeechRecognition || !!(window as any).webkitSpeechRecognition;
  }

  public getSupportedLanguages(): string[] {
    // Common supported languages - actual support varies by browser
    return [
      'en-US', 'en-GB', 'es-ES', 'es-MX', 'fr-FR', 'de-DE', 
      'it-IT', 'pt-BR', 'pt-PT', 'ru-RU', 'ja-JP', 'ko-KR',
      'zh-CN', 'zh-TW', 'hi-IN', 'ar-SA', 'nl-NL', 'pl-PL',
      'tr-TR', 'sv-SE', 'da-DK', 'no-NO', 'fi-FI'
    ];
  }

  public getSegments(): SubtitleSegment[] {
    return [...this.currentSegments];
  }

  public clearSegments() {
    this.currentSegments = [];
  }

  // Convenience methods
  public isAvailable(): boolean {
    return this.isSupported();
  }

  public startTranscription(options?: WebSpeechTranscriptionOptions) {
    return this.start(options);
  }

  public stopTranscription() {
    return this.stop();
  }

  public createTimedSegments(text: string, totalDuration: number): Array<{start: number, end: number, text: string}> {
    // Simple implementation that splits text into segments based on duration
    const words = text.split(' ');
    const wordsPerSegment = Math.max(5, Math.floor(words.length / Math.ceil(totalDuration / 3))); // ~3 seconds per segment
    const segments: Array<{start: number, end: number, text: string}> = [];
    
    let currentTime = 0;
    const segmentDuration = totalDuration / Math.ceil(words.length / wordsPerSegment);
    
    for (let i = 0; i < words.length; i += wordsPerSegment) {
      const segmentWords = words.slice(i, i + wordsPerSegment);
      const segmentText = segmentWords.join(' ');
      
      segments.push({
        start: currentTime,
        end: Math.min(currentTime + segmentDuration, totalDuration),
        text: segmentText
      });
      
      currentTime += segmentDuration;
    }
    
    return segments;
  }
}

// Singleton instance
let instance: WebSpeechTranscriptionService | null = null;

export function getWebSpeechTranscriptionService(): WebSpeechTranscriptionService {
  if (!instance) {
    instance = new WebSpeechTranscriptionService();
  }
  return instance;
} 

// Export singleton instance
export const webSpeechService = getWebSpeechTranscriptionService(); 