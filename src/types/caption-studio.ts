// Caption Studio Types

export interface SubtitleSegment {
  id: string;
  startTime: number;
  endTime: number;
  text: string;
  style?: SubtitleStyle;
  position?: SubtitlePosition;
}

export interface SubtitleStyle {
  fontFamily: string;
  fontSize: number;
  fontWeight: 'normal' | 'bold';
  fontStyle: 'normal' | 'italic';
  color: string;
  backgroundColor?: string;
  backgroundOpacity?: number;
  strokeColor?: string;
  strokeWidth?: number;
  shadowColor?: string;
  shadowBlur?: number;
  padding?: number;
}

export interface SubtitlePosition {
  x: number; // percentage 0-100
  y: number; // percentage 0-100
  width?: number; // percentage 0-100
  height?: number; // percentage 0-100
  alignment: 'left' | 'center' | 'right';
  verticalAlignment: 'top' | 'middle' | 'bottom';
}

export interface WhisperModel {
  name: string;
  size: number;
  language?: string;
  url?: string;
  loaded: boolean;
  loading: boolean;
  error?: string;
}

export interface TranscriptionResult {
  text: string;
  segments: TranscriptionSegment[];
  language?: string;
}

export interface TranscriptionSegment {
  id: number;
  seek: number;
  start: number;
  end: number;
  text: string;
  tokens: number[];
  temperature: number;
  avg_logprob: number;
  compression_ratio: number;
  no_speech_prob: number;
  words?: WordSegment[];
}

export interface WordSegment {
  word: string;
  start: number;
  end: number;
  probability?: number;
}

export interface CaptionProject {
  id: string;
  name: string;
  videoFile?: File;
  videoUrl?: string;
  videoDuration: number;
  videoWidth: number;
  videoHeight: number;
  subtitles: SubtitleSegment[];
  defaultStyle: SubtitleStyle;
  whisperModel?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ExportOptions {
  format: 'srt' | 'vtt' | 'ass' | 'json';
  includeStyles: boolean;
  encoding: 'utf-8' | 'utf-16';
}

export interface VideoExportOptions {
  burnSubtitles: boolean;
  format: 'mp4' | 'webm';
  quality: 'low' | 'medium' | 'high' | 'ultra';
  fps: number;
  bitrate?: number;
  codec?: string;
}

export interface AudioAnalysisResult {
  silenceSegments: { start: number; end: number; }[];
  volumeLevels: number[];
  sampleRate: number;
}

export interface TemplateOptions {
  segmentDuration: number; // seconds
  overlapDuration: number; // seconds
  maxSegments?: number;
  startTime?: number;
  endTime?: number;
}

export const DEFAULT_SUBTITLE_STYLE: SubtitleStyle = {
  fontFamily: 'Arial',
  fontSize: 24,
  fontWeight: 'bold',
  fontStyle: 'normal',
  color: '#FFFFFF',
  backgroundColor: '#000000',
  backgroundOpacity: 0.75,
  strokeColor: '#000000',
  strokeWidth: 2,
  shadowColor: '#000000',
  shadowBlur: 3,
  padding: 10
};

export const DEFAULT_SUBTITLE_POSITION: SubtitlePosition = {
  x: 50,
  y: 85,
  alignment: 'center',
  verticalAlignment: 'bottom'
};

export const WHISPER_MODELS = [
  { name: 'whisper-tiny', size: 39, language: 'multilingual' },
  { name: 'whisper-tiny.en', size: 39, language: 'english' },
  { name: 'whisper-small', size: 244, language: 'multilingual' },
  { name: 'whisper-small.en', size: 244, language: 'english' },
  { name: 'whisper-base', size: 74, language: 'multilingual' },
  { name: 'whisper-base.en', size: 74, language: 'english' },
  { name: 'distil-small.en', size: 166, language: 'english' }
];

export const VIDEO_EXPORT_PRESETS = {
  low: { bitrate: 1000000, fps: 24 },
  medium: { bitrate: 2500000, fps: 30 },
  high: { bitrate: 5000000, fps: 30 },
  ultra: { bitrate: 10000000, fps: 60 }
}; 