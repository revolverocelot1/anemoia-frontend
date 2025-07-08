export interface SubtitleSegment {
  id: string;
  text: string;
  startTime: number; // in seconds
  endTime: number; // in seconds
  speaker?: string;
  confidence?: number;
}

export interface SubtitleStyle {
  fontFamily: string;
  fontSize: number;
  fontWeight: 'normal' | 'bold' | 'lighter' | 'bolder' | number;
  fontStyle: 'normal' | 'italic';
  color: string;
  backgroundColor?: string;
  backgroundOpacity?: number;
  strokeColor?: string;
  strokeWidth?: number;
  shadowColor?: string;
  shadowBlur?: number;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
  padding?: number;
  borderRadius?: number;
  textAlign: 'left' | 'center' | 'right';
  verticalAlign: 'top' | 'middle' | 'bottom';
  lineHeight?: number;
  letterSpacing?: number;
}

export interface SubtitlePosition {
  x: number; // percentage or pixels
  y: number; // percentage or pixels
  width: number; // percentage or pixels
  height: number; // percentage or pixels
  unit: 'percent' | 'pixels';
}

export interface SubtitleTrack {
  id: string;
  name: string;
  language: string;
  segments: SubtitleSegment[];
  style: SubtitleStyle;
  position: SubtitlePosition;
  visible: boolean;
  locked: boolean;
}

export interface SubtitleProject {
  id: string;
  name: string;
  videoUrl?: string;
  videoFile?: File;
  videoDuration: number;
  tracks: SubtitleTrack[];
  activeTrackId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SubtitleExportOptions {
  format: 'srt' | 'vtt' | 'ass' | 'json';
  includeStyles: boolean;
  includePositions: boolean;
  encoding: 'utf-8' | 'utf-16';
}

export interface SubtitleImportResult {
  segments: SubtitleSegment[];
  format: string;
  language?: string;
  styles?: Partial<SubtitleStyle>;
}

export const DEFAULT_SUBTITLE_STYLE: SubtitleStyle = {
  fontFamily: 'Inter, system-ui, sans-serif',
  fontSize: 24,
  fontWeight: 'normal',
  fontStyle: 'normal',
  color: '#ffffff',
  backgroundColor: '#000000',
  backgroundOpacity: 0.7,
  strokeColor: '#000000',
  strokeWidth: 2,
  shadowColor: '#000000',
  shadowBlur: 4,
  shadowOffsetX: 2,
  shadowOffsetY: 2,
  padding: 8,
  borderRadius: 4,
  textAlign: 'center',
  verticalAlign: 'bottom',
  lineHeight: 1.2,
  letterSpacing: 0
};

export const DEFAULT_SUBTITLE_POSITION: SubtitlePosition = {
  x: 50,
  y: 85,
  width: 80,
  height: 15,
  unit: 'percent'
}; 