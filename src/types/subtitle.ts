// Core subtitle types
export interface SubtitleSegment {
  id: string;
  text: string;
  startTime: number; // in seconds
  endTime: number; // in seconds
  speaker?: string;
  confidence?: number;
  style?: Partial<SubtitleStyle>;
}

export interface SubtitleStyle {
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: 'normal' | 'bold' | 'lighter' | 'bolder' | number;
  fontStyle?: 'normal' | 'italic';
  fontColor?: string;
  backgroundColor?: string;
  backgroundOpacity?: number;
  backgroundBlur?: number;
  textShadow?: string;
  textStroke?: string;
  padding?: number;
  borderRadius?: number;
  position?: 'top' | 'center' | 'bottom' | 'top-left' | 'top-center' | 'top-right' | 'middle-left' | 'middle-center' | 'middle-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
  alignment?: 'left' | 'center' | 'right';
  lineHeight?: number;
  letterSpacing?: number;
  marginX?: number;
  marginY?: number;
}

export interface SubtitleTrack {
  id: string;
  name: string;
  language: string;
  segments: SubtitleSegment[];
  isVisible: boolean;
  isLocked: boolean;
  style: SubtitleStyle;
}

export interface SubtitleProject {
  id: string;
  name: string;
  videoUrl?: string | null;
  videoFile?: File | null;
  videoDuration: number;
  videoWidth: number;
  videoHeight: number;
  tracks: SubtitleTrack[];
  activeTrackId: string | null;
  createdAt: Date;
  updatedAt: Date;
  style?: SubtitleStyle;
}

// Export/Import types
export interface SubtitleExportOptions {
  format: 'srt' | 'vtt' | 'ass' | 'json';
  includeStyles: boolean;
  includePositions: boolean;
  encoding: 'utf-8' | 'utf-16';
  trackId?: string;
}

export interface SubtitleImportResult {
  segments: SubtitleSegment[];
  format: string;
  language?: string;
  styles?: Partial<SubtitleStyle>;
}

// Transcription types
export interface TranscriptionOptions {
  language: string;
  model: string;
  task: 'transcribe' | 'translate';
  return_timestamps: boolean;
  chunk_length_s?: number;
  stride_length_s?: number;
}

export interface TranscriptionResult {
  text: string;
  segments: Array<{
    text: string;
    start: number;
    end: number;
    confidence?: number;
  }>;
  language?: string;
}

// UI State types
export interface TimelineState {
  zoomLevel: number;
  scrollPosition: number;
  showWaveform: boolean;
  showTimestamps: boolean;
  snapToGrid: boolean;
  gridSize: number;
}

export interface PlaybackState {
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  playbackRate: number;
  volume: number;
}

// Default values
export const DEFAULT_SUBTITLE_STYLE: SubtitleStyle = {
  fontFamily: 'Arial, sans-serif',
  fontSize: 24,
  fontWeight: 'normal',
  fontStyle: 'normal',
  fontColor: '#FFFFFF',
  backgroundColor: '#000000',
  backgroundOpacity: 0.8,
  textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
  textStroke: '',
  padding: 10,
  borderRadius: 4,
  position: 'bottom-center',
  alignment: 'center',
  lineHeight: 1.4,
  letterSpacing: 0,
  marginX: 10,
  marginY: 10
};

export const DEFAULT_TIMELINE_STATE: TimelineState = {
  zoomLevel: 1,
  scrollPosition: 0,
  showWaveform: false,
  showTimestamps: true,
  snapToGrid: true,
  gridSize: 0.1
};

export const DEFAULT_PLAYBACK_STATE: PlaybackState = {
  currentTime: 0,
  duration: 0,
  isPlaying: false,
  playbackRate: 1,
  volume: 1
};

// Keyboard shortcut types
export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  action: string;
  description: string;
}

export const KEYBOARD_SHORTCUTS: KeyboardShortcut[] = [
  { key: ' ', action: 'playPause', description: 'Play/Pause' },
  { key: 'ArrowLeft', action: 'skipBackward5', description: 'Skip backward 5s' },
  { key: 'ArrowRight', action: 'skipForward5', description: 'Skip forward 5s' },
  { key: 'ArrowLeft', shift: true, action: 'skipBackward10', description: 'Skip backward 10s' },
  { key: 'ArrowRight', shift: true, action: 'skipForward10', description: 'Skip forward 10s' },
  { key: 'ArrowLeft', alt: true, action: 'skipBackward1', description: 'Skip backward 1s' },
  { key: 'ArrowRight', alt: true, action: 'skipForward1', description: 'Skip forward 1s' },
  { key: 'Home', action: 'jumpToStart', description: 'Jump to start' },
  { key: 'End', action: 'jumpToEnd', description: 'Jump to end' },
  { key: 'n', ctrl: true, action: 'newSubtitle', description: 'New subtitle at current time' },
  { key: 'Delete', action: 'deleteSelected', description: 'Delete selected subtitles' },
  { key: 'm', ctrl: true, action: 'mergeSelected', description: 'Merge selected subtitles' },
  { key: 's', ctrl: true, shift: true, action: 'splitAtPlayhead', description: 'Split subtitle at playhead' },
  { key: 'a', ctrl: true, action: 'selectAll', description: 'Select all subtitles' },
  { key: 'Escape', action: 'clearSelection', description: 'Clear selection' },
  { key: 'Tab', action: 'nextSubtitle', description: 'Next subtitle' },
  { key: 'Tab', shift: true, action: 'previousSubtitle', description: 'Previous subtitle' },
  { key: 's', ctrl: true, action: 'save', description: 'Save project' },
  { key: 'e', ctrl: true, action: 'export', description: 'Export subtitles' },
  { key: '+', ctrl: true, action: 'zoomIn', description: 'Zoom in' },
  { key: '-', ctrl: true, action: 'zoomOut', description: 'Zoom out' },
  { key: '0', ctrl: true, action: 'resetZoom', description: 'Reset zoom' }
];

// Error types
export interface SubtitleError {
  code: string;
  message: string;
  timestamp: Date;
  context?: any;
}

// Position types
export interface SubtitlePosition {
  x: number;
  y: number;
  width: number;
  height: number;
  unit: 'percent' | 'pixels';
}

// Video export types
export interface VideoExportOptions {
  format: 'webm' | 'mp4';
  quality: number;
  framerate: number;
  resolution: string;
  burnSubtitles: boolean;
  subtitleTrackId?: string;
} 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 