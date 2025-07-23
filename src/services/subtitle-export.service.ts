import type { SubtitleSegment, ExportOptions, VideoExportOptions } from '../types/caption-studio';
import { SubtitleRenderer } from './subtitle-renderer.service';

export class SubtitleExportService {
  // Convert time in seconds to SRT format (00:00:00,000)
  private formatSRTTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const millis = Math.floor((seconds % 1) * 1000);
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${millis.toString().padStart(3, '0')}`;
  }

  // Convert time in seconds to VTT format (00:00:00.000)
  private formatVTTTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const millis = Math.floor((seconds % 1) * 1000);
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${millis.toString().padStart(3, '0')}`;
  }

  // Export subtitles to SRT format
  exportToSRT(subtitles: SubtitleSegment[]): string {
    let srtContent = '';
    const sortedSubtitles = [...subtitles].sort((a, b) => a.startTime - b.startTime);
    
    sortedSubtitles.forEach((subtitle, index) => {
      srtContent += `${index + 1}\n`;
      srtContent += `${this.formatSRTTime(subtitle.startTime)} --> ${this.formatSRTTime(subtitle.endTime)}\n`;
      srtContent += `${subtitle.text}\n\n`;
    });
    
    return srtContent.trim();
  }

  // Export subtitles to WebVTT format
  exportToVTT(subtitles: SubtitleSegment[], includeStyles: boolean = true): string {
    let vttContent = 'WEBVTT\n\n';
    
    // Add style block if requested
    if (includeStyles && subtitles.some(s => s.style)) {
      vttContent += 'STYLE\n';
      vttContent += '::cue {\n';
      vttContent += '  background-color: rgba(0, 0, 0, 0.8);\n';
      vttContent += '  color: white;\n';
      vttContent += '}\n\n';
    }
    
    const sortedSubtitles = [...subtitles].sort((a, b) => a.startTime - b.startTime);
    
    sortedSubtitles.forEach((subtitle, index) => {
      // Add cue identifier
      vttContent += `${index + 1}\n`;
      
      // Add timing
      vttContent += `${this.formatVTTTime(subtitle.startTime)} --> ${this.formatVTTTime(subtitle.endTime)}`;
      
      // Add position if available
      if (subtitle.position) {
        const vttPosition = this.getVTTPosition(subtitle.position);
        if (vttPosition) {
          vttContent += ` ${vttPosition}`;
        }
      }
      
      vttContent += '\n';
      vttContent += `${subtitle.text}\n\n`;
    });
    
    return vttContent.trim();
  }

  // Export subtitles to ASS (Advanced SubStation Alpha) format
  exportToASS(subtitles: SubtitleSegment[]): string {
    let assContent = '[Script Info]\n';
    assContent += 'Title: Subtitles\n';
    assContent += 'ScriptType: v4.00+\n';
    assContent += 'Collisions: Normal\n';
    assContent += 'PlayDepth: 0\n\n';
    
    assContent += '[V4+ Styles]\n';
    assContent += 'Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\n';
    assContent += 'Style: Default,Arial,24,&H00FFFFFF,&H000000FF,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,2,2,2,10,10,10,1\n\n';
    
    assContent += '[Events]\n';
    assContent += 'Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n';
    
    const sortedSubtitles = [...subtitles].sort((a, b) => a.startTime - b.startTime);
    
    sortedSubtitles.forEach(subtitle => {
      const start = this.formatASSTime(subtitle.startTime);
      const end = this.formatASSTime(subtitle.endTime);
      assContent += `Dialogue: 0,${start},${end},Default,,0,0,0,,${subtitle.text}\n`;
    });
    
    return assContent;
  }

  // Export subtitles to JSON format
  exportToJSON(subtitles: SubtitleSegment[]): string {
    return JSON.stringify(subtitles, null, 2);
  }

  // Format time for ASS format
  private formatASSTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const centisecs = Math.floor((seconds % 1) * 100);
    
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${centisecs.toString().padStart(2, '0')}`;
  }

  // Get VTT position string
  private getVTTPosition(position: SubtitleSegment['position']): string {
    if (!position) return '';
    
    let vttPosition = '';
    
    // Line position (vertical)
    if (position.y !== undefined) {
      vttPosition += `line:${position.y}%`;
    }
    
    // Position (horizontal)
    if (position.x !== undefined) {
      if (vttPosition) vttPosition += ' ';
      vttPosition += `position:${position.x}%`;
    }
    
    // Alignment
    if (position.alignment && position.alignment !== 'center') {
      if (vttPosition) vttPosition += ' ';
      vttPosition += `align:${position.alignment}`;
    }
    
    return vttPosition;
  }

  // Download file utility
  downloadFile(content: string, filename: string, mimeType: string = 'text/plain') {
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

  // Export subtitles based on options
  exportSubtitles(subtitles: SubtitleSegment[], options: ExportOptions, baseFilename: string = 'subtitles') {
    let content: string;
    let extension: string;
    let mimeType: string;
    
    switch (options.format) {
      case 'srt':
        content = this.exportToSRT(subtitles);
        extension = 'srt';
        mimeType = 'text/plain';
        break;
        
      case 'vtt':
        content = this.exportToVTT(subtitles, options.includeStyles);
        extension = 'vtt';
        mimeType = 'text/vtt';
        break;
        
      case 'ass':
        content = this.exportToASS(subtitles);
        extension = 'ass';
        mimeType = 'text/plain';
        break;
        
      case 'json':
        content = this.exportToJSON(subtitles);
        extension = 'json';
        mimeType = 'application/json';
        break;
        
      default:
        throw new Error(`Unsupported format: ${options.format}`);
    }
    
    // Apply encoding if needed
    if (options.encoding === 'utf-16') {
      // Convert to UTF-16
      const encoder = new TextEncoder();
      const utf8Bytes = encoder.encode(content);
      content = String.fromCharCode(0xFEFF) + content; // Add BOM
    }
    
    const filename = `${baseFilename}.${extension}`;
    this.downloadFile(content, filename, mimeType);
  }
}

export const subtitleExportService = new SubtitleExportService(); 