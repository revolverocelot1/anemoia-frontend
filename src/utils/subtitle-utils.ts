import type { SubtitleSegment, SubtitleTrack } from '../types/subtitle';

// Format time to SRT/VTT format
export function formatTime(seconds: number, format: 'srt' | 'vtt' = 'srt'): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const millis = Math.floor((seconds % 1) * 1000);
  
  const separator = format === 'srt' ? ',' : '.';
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}${separator}${millis.toString().padStart(3, '0')}`;
}

// Parse time from SRT/VTT format
export function parseTime(timeStr: string): number {
  const parts = timeStr.replace(',', '.').split(':');
  if (parts.length !== 3) return 0;
  
  const hours = parseInt(parts[0], 10) || 0;
  const minutes = parseInt(parts[1], 10) || 0;
  const seconds = parseFloat(parts[2]) || 0;
  
  return hours * 3600 + minutes * 60 + seconds;
}

// Export to SRT format
export function exportToSRT(segments: SubtitleSegment[]): string {
  return segments
    .map((segment, index) => {
      return `${index + 1}\n${formatTime(segment.startTime, 'srt')} --> ${formatTime(segment.endTime, 'srt')}\n${segment.text}\n`;
    })
    .join('\n');
}

// Export to WebVTT format
export function exportToWebVTT(segments: SubtitleSegment[]): string {
  const header = 'WEBVTT\n\n';
  const content = segments
    .map((segment, index) => {
      return `${index + 1}\n${formatTime(segment.startTime, 'vtt')} --> ${formatTime(segment.endTime, 'vtt')}\n${segment.text}\n`;
    })
    .join('\n');
  
  return header + content;
}

// Import from SRT format
export function importFromSRT(content: string): SubtitleSegment[] {
  const segments: SubtitleSegment[] = [];
  const blocks = content.trim().split(/\n\s*\n/);
  
  for (const block of blocks) {
    const lines = block.trim().split('\n');
    if (lines.length >= 3) {
      const timeLine = lines[1];
      const textLines = lines.slice(2);
      
      const timeMatch = timeLine.match(/(\d{2}:\d{2}:\d{2}[,\.]\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}[,\.]\d{3})/);
      if (timeMatch) {
        segments.push({
          id: `segment-${Date.now()}-${Math.random()}`,
          startTime: parseTime(timeMatch[1]),
          endTime: parseTime(timeMatch[2]),
          text: textLines.join('\n')
        });
      }
    }
  }
  
  return segments;
}

// Import from WebVTT format
export function importFromWebVTT(content: string): SubtitleSegment[] {
  // Remove WEBVTT header
  const cleanContent = content.replace(/^WEBVTT\s*\n/i, '');
  return importFromSRT(cleanContent);
}

// Download file
export function downloadFile(content: string, filename: string, mimeType: string = 'text/plain') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Export subtitles
export function exportSubtitles(segments: SubtitleSegment[], format: 'srt' | 'vtt', filename?: string) {
  const content = format === 'srt' ? exportToSRT(segments) : exportToWebVTT(segments);
  const defaultFilename = `subtitles.${format}`;
  downloadFile(content, filename || defaultFilename, 'text/plain');
}

// Calculate reading speed
export function calculateReadingSpeed(segment: SubtitleSegment): number {
  const duration = segment.endTime - segment.startTime;
  const wordCount = segment.text.split(/\s+/).length;
  return wordCount / duration; // words per second
}

// Find overlapping segments
export function findOverlaps(segments: SubtitleSegment[]): Array<[SubtitleSegment, SubtitleSegment]> {
  const overlaps: Array<[SubtitleSegment, SubtitleSegment]> = [];
  
  for (let i = 0; i < segments.length - 1; i++) {
    for (let j = i + 1; j < segments.length; j++) {
      const a = segments[i];
      const b = segments[j];
      
      if (a.startTime < b.endTime && b.startTime < a.endTime) {
        overlaps.push([a, b]);
      }
    }
  }
  
  return overlaps;
}

// Fix overlapping segments
export function fixOverlaps(segments: SubtitleSegment[]): SubtitleSegment[] {
  const sorted = [...segments].sort((a, b) => a.startTime - b.startTime);
  
  for (let i = 0; i < sorted.length - 1; i++) {
    const current = sorted[i];
    const next = sorted[i + 1];
    
    if (current.endTime > next.startTime) {
      // Adjust the end time of current to start time of next
      current.endTime = next.startTime - 0.01;
    }
  }
  
  return sorted;
}

// Shift segments by time
export function shiftSegments(segments: SubtitleSegment[], deltaTime: number): SubtitleSegment[] {
  return segments.map(segment => ({
    ...segment,
    startTime: Math.max(0, segment.startTime + deltaTime),
    endTime: Math.max(0, segment.endTime + deltaTime)
  }));
}

// Scale segment timing
export function scaleSegments(segments: SubtitleSegment[], factor: number): SubtitleSegment[] {
  return segments.map(segment => ({
    ...segment,
    startTime: segment.startTime * factor,
    endTime: segment.endTime * factor
  }));
} 