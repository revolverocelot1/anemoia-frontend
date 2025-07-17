// Minimal subtitle types for compatibility

export interface SubtitleSegment {
  id: string;
  startTime: number;
  endTime: number;
  text: string;
  style?: Partial<SubtitleStyle>;
}

export interface SubtitleStyle {
  fontFamily: string;
  fontSize: number;
  fontWeight: string;
  fontStyle: string;
  color: string;
  backgroundColor: string;
  backgroundOpacity: number;
  outlineColor: string;
  outlineWidth: number;
  shadowColor: string;
  shadowOffsetX: number;
  shadowOffsetY: number;
  shadowBlur: number;
  position: string;
  marginBottom: number;
  lineHeight: number;
  textAlign: 'left' | 'center' | 'right';
}

export interface SubtitleTrack {
  id: string;
  name: string;
  language?: string;
  segments: SubtitleSegment[];
  isVisible: boolean;
  isActive: boolean;
  style: SubtitleStyle;
}

export interface SubtitleProject {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  videoUrl?: string;
  videoDuration: number;
  videoWidth?: number;
  videoHeight?: number;
  tracks: SubtitleTrack[];
  activeTrackId?: string;
  defaultStyle?: SubtitleStyle;
  style?: SubtitleStyle;
}

export const DEFAULT_SUBTITLE_STYLE: SubtitleStyle = {
  fontFamily: 'Arial',
  fontSize: 48,
  fontWeight: 'normal',
  fontStyle: 'normal',
  color: '#FFFFFF',
  backgroundColor: '#000000',
  backgroundOpacity: 0.75,
  outlineColor: '#000000',
  outlineWidth: 2,
  shadowColor: '#000000',
  shadowOffsetX: 2,
  shadowOffsetY: 2,
  shadowBlur: 2,
  position: 'bottom-center',
  marginBottom: 50,
  lineHeight: 1.2,
  textAlign: 'center'
}; 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 