import { v4 as uuidv4 } from 'uuid';
import type { SubtitleSegment } from '../types/subtitle';

/**
 * Generate subtitle template based on video duration
 */
export function generateSubtitleTemplate(
  duration: number,
  options: {
    segmentDuration?: number;
    overlap?: number;
    minSegmentDuration?: number;
  } = {}
): SubtitleSegment[] {
  const {
    segmentDuration = 5, // 5 seconds per segment
    overlap = 0.1, // 100ms overlap
    minSegmentDuration = 1 // Minimum 1 second
  } = options;

  const segments: SubtitleSegment[] = [];
  let currentTime = 0;

  while (currentTime < duration) {
    const remainingTime = duration - currentTime;
    const actualDuration = Math.max(
      minSegmentDuration,
      Math.min(segmentDuration, remainingTime)
    );

    segments.push({
      id: uuidv4(),
      text: '',
      startTime: currentTime,
      endTime: Math.min(duration, currentTime + actualDuration),
      confidence: 1
    });

    currentTime += actualDuration - overlap;
  }

  return segments;
}

/**
 * Create subtitle at specific time
 */
export function createSubtitleAtTime(
  time: number,
  duration: number = 2,
  text: string = ''
): SubtitleSegment {
  return {
    id: uuidv4(),
    text,
    startTime: time,
    endTime: time + duration,
    confidence: 1
  };
}

/**
 * Export subtitles to SRT format
 */
export function exportToSRT(segments: SubtitleSegment[]): string {
  const sortedSegments = [...segments].sort((a, b) => a.startTime - b.startTime);
  
  return sortedSegments
    .map((segment, index) => {
      const startTime = formatSRTTime(segment.startTime);
      const endTime = formatSRTTime(segment.endTime);
      
      return `${index + 1}\n${startTime} --> ${endTime}\n${segment.text}\n`;
    })
    .join('\n');
}

/**
 * Export subtitles to WebVTT format
 */
export function exportToWebVTT(segments: SubtitleSegment[]): string {
  const sortedSegments = [...segments].sort((a, b) => a.startTime - b.startTime);
  
  let vtt = 'WEBVTT\n\n';
  
  sortedSegments.forEach((segment, index) => {
    const startTime = formatVTTTime(segment.startTime);
    const endTime = formatVTTTime(segment.endTime);
    
    vtt += `${index + 1}\n`;
    vtt += `${startTime} --> ${endTime}\n`;
    vtt += `${segment.text}\n\n`;
  });
  
  return vtt;
}

/**
 * Import subtitles from SRT format
 */
export function importFromSRT(srtContent: string): SubtitleSegment[] {
  const segments: SubtitleSegment[] = [];
  const blocks = srtContent.trim().split(/\n\s*\n/);
  
  blocks.forEach(block => {
    const lines = block.trim().split('\n');
    if (lines.length >= 3) {
      const timeLine = lines[1];
      const textLines = lines.slice(2);
      
      const timeMatch = timeLine.match(
        /(\d{2}):(\d{2}):(\d{2})[,.](\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})[,.](\d{3})/
      );
      
      if (timeMatch) {
        const startTime = 
          parseInt(timeMatch[1]) * 3600 +
          parseInt(timeMatch[2]) * 60 +
          parseInt(timeMatch[3]) +
          parseInt(timeMatch[4]) / 1000;
          
        const endTime = 
          parseInt(timeMatch[5]) * 3600 +
          parseInt(timeMatch[6]) * 60 +
          parseInt(timeMatch[7]) +
          parseInt(timeMatch[8]) / 1000;
          
        segments.push({
          id: uuidv4(),
          text: textLines.join('\n'),
          startTime,
          endTime,
          confidence: 1
        });
      }
    }
  });
  
  return segments;
}

/**
 * Import subtitles from WebVTT format
 */
export function importFromWebVTT(vttContent: string): SubtitleSegment[] {
  const segments: SubtitleSegment[] = [];
  
  // Remove WEBVTT header and metadata
  const content = vttContent.replace(/^WEBVTT.*?\n\n/s, '');
  const blocks = content.trim().split(/\n\s*\n/);
  
  blocks.forEach(block => {
    const lines = block.trim().split('\n');
    
    // Find the timing line
    const timeLineIndex = lines.findIndex(line => 
      line.includes('-->') && /\d{2}:\d{2}[:.]\d{3}/.test(line)
    );
    
    if (timeLineIndex !== -1) {
      const timeLine = lines[timeLineIndex];
      const textLines = lines.slice(timeLineIndex + 1);
      
      const timeMatch = timeLine.match(
        /(\d{2}):(\d{2})[:.]([\d.]+)\s*-->\s*(\d{2}):(\d{2})[:.]([\d.]+)/
      );
      
      if (timeMatch) {
        const startTime = 
          parseInt(timeMatch[1]) * 3600 +
          parseInt(timeMatch[2]) * 60 +
          parseFloat(timeMatch[3]);
          
        const endTime = 
          parseInt(timeMatch[4]) * 3600 +
          parseInt(timeMatch[5]) * 60 +
          parseFloat(timeMatch[6]);
          
        segments.push({
          id: uuidv4(),
          text: textLines.join('\n').replace(/<[^>]*>/g, ''), // Remove HTML tags
          startTime,
          endTime,
          confidence: 1
        });
      }
    }
  });
  
  return segments;
}

/**
 * Format time for SRT
 */
function formatSRTTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
}

/**
 * Format time for WebVTT
 */
function formatVTTTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  
  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
}

/**
 * Validate subtitle segments
 */
export function validateSegments(segments: SubtitleSegment[]): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  segments.forEach((segment, index) => {
    if (segment.startTime >= segment.endTime) {
      errors.push(`Segment ${index + 1}: Start time must be before end time`);
    }
    
    if (segment.startTime < 0) {
      errors.push(`Segment ${index + 1}: Start time cannot be negative`);
    }
    
    if (!segment.text.trim()) {
      errors.push(`Segment ${index + 1}: Text cannot be empty`);
    }
  });
  
  // Check for overlaps
  const sortedSegments = [...segments].sort((a, b) => a.startTime - b.startTime);
  for (let i = 0; i < sortedSegments.length - 1; i++) {
    if (sortedSegments[i].endTime > sortedSegments[i + 1].startTime) {
      errors.push(
        `Overlap detected between segments ${i + 1} and ${i + 2}`
      );
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Auto-fix common subtitle issues
 */
export function autoFixSegments(segments: SubtitleSegment[]): SubtitleSegment[] {
  const fixed = [...segments];
  
  // Sort by start time
  fixed.sort((a, b) => a.startTime - b.startTime);
  
  // Fix overlaps
  for (let i = 0; i < fixed.length - 1; i++) {
    if (fixed[i].endTime > fixed[i + 1].startTime) {
      fixed[i].endTime = fixed[i + 1].startTime - 0.01;
    }
  }
  
  // Fix negative times
  fixed.forEach(segment => {
    if (segment.startTime < 0) segment.startTime = 0;
    if (segment.endTime < segment.startTime) {
      segment.endTime = segment.startTime + 1;
    }
  });
  
  return fixed;
} 