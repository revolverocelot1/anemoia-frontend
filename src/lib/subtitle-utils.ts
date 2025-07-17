// Minimal subtitle utilities for compatibility

import type { SubtitleSegment, SubtitleStyle } from '../types/subtitle';

export function exportToSRT(segments: SubtitleSegment[]): string {
  let srtContent = '';
  const sortedSegments = [...segments].sort((a, b) => a.startTime - b.startTime);
  
  sortedSegments.forEach((segment, index) => {
    srtContent += `${index + 1}\n`;
    srtContent += `${formatTimeSRT(segment.startTime)} --> ${formatTimeSRT(segment.endTime)}\n`;
    srtContent += `${segment.text}\n\n`;
  });
  
  return srtContent.trim();
}

export function exportToWebVTT(segments: SubtitleSegment[]): string {
  let vttContent = 'WEBVTT\n\n';
  const sortedSegments = [...segments].sort((a, b) => a.startTime - b.startTime);
  
  sortedSegments.forEach((segment) => {
    vttContent += `${formatTimeVTT(segment.startTime)} --> ${formatTimeVTT(segment.endTime)}\n`;
    vttContent += `${segment.text}\n\n`;
  });
  
  return vttContent.trim();
}

export function exportToASS(segments: SubtitleSegment[], style?: Partial<SubtitleStyle>): string {
  // Minimal ASS format export
  let assContent = '[Script Info]\n';
  assContent += 'Title: Subtitles\n';
  assContent += 'ScriptType: v4.00+\n\n';
  
  assContent += '[V4+ Styles]\n';
  assContent += 'Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\n';
  assContent += 'Style: Default,Arial,48,&H00FFFFFF,&H000000FF,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,2,0,2,10,10,10,1\n\n';
  
  assContent += '[Events]\n';
  assContent += 'Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n';
  
  const sortedSegments = [...segments].sort((a, b) => a.startTime - b.startTime);
  sortedSegments.forEach((segment) => {
    const start = formatTimeASS(segment.startTime);
    const end = formatTimeASS(segment.endTime);
    assContent += `Dialogue: 0,${start},${end},Default,,0,0,0,,${segment.text}\n`;
  });
  
  return assContent;
}

function formatTimeSRT(time: number): string {
  const hours = Math.floor(time / 3600);
  const minutes = Math.floor((time % 3600) / 60);
  const seconds = Math.floor(time % 60);
  const milliseconds = Math.floor((time % 1) * 1000);
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')},${milliseconds.toString().padStart(3, '0')}`;
}

function formatTimeVTT(time: number): string {
  const hours = Math.floor(time / 3600);
  const minutes = Math.floor((time % 3600) / 60);
  const seconds = Math.floor(time % 60);
  const milliseconds = Math.floor((time % 1) * 1000);
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
}

function formatTimeASS(time: number): string {
  const hours = Math.floor(time / 3600);
  const minutes = Math.floor((time % 3600) / 60);
  const seconds = Math.floor(time % 60);
  const centiseconds = Math.floor((time % 1) * 100);
  
  return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`;
} 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 