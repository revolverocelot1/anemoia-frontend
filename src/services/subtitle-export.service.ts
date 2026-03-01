import type { SubtitleSegment, ExportOptions } from '../types/caption-studio';

export class SubtitleExportService {
  // Convert subtitle segments to SRT format
  toSRT(subtitles: SubtitleSegment[]): string {
    return subtitles
      .sort((a, b) => a.startTime - b.startTime)
      .map((subtitle, index) => {
        const startTime = this.formatSRTTime(subtitle.startTime);
        const endTime = this.formatSRTTime(subtitle.endTime);
        return `${index + 1}\n${startTime} --> ${endTime}\n${subtitle.text}\n`;
      })
      .join('\n');
  }

  // Convert subtitle segments to WebVTT format
  toWebVTT(subtitles: SubtitleSegment[], includeStyles: boolean = true): string {
    let vtt = 'WEBVTT\n\n';
    
    if (includeStyles && subtitles.length > 0) {
      // Add style section if needed
      vtt += 'STYLE\n';
      vtt += '::cue {\n';
      vtt += '  background-color: rgba(0, 0, 0, 0.8);\n';
      vtt += '  color: white;\n';
      vtt += '  font-size: 16px;\n';
      vtt += '}\n\n';
    }
    
    subtitles
      .sort((a, b) => a.startTime - b.startTime)
      .forEach((subtitle) => {
        const startTime = this.formatVTTTime(subtitle.startTime);
        const endTime = this.formatVTTTime(subtitle.endTime);
        
        let cueSettings = '';
        if (subtitle.position) {
          cueSettings = ` position:${subtitle.position.x}% line:${subtitle.position.y}%`;
        }
        
        vtt += `${startTime} --> ${endTime}${cueSettings}\n${subtitle.text}\n\n`;
      });
    
    return vtt;
  }

  // Convert subtitle segments to ASS/SSA format
  toASS(subtitles: SubtitleSegment[], videoWidth: number = 1920, videoHeight: number = 1080): string {
    let ass = `[Script Info]
Title: Generated Subtitles
ScriptType: v4.00+
PlayResX: ${videoWidth}
PlayResY: ${videoHeight}
WrapStyle: 0
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Arial,48,&H00FFFFFF,&H000000FF,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,2,1,2,10,10,10,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n`;

    subtitles
      .sort((a, b) => a.startTime - b.startTime)
      .forEach((subtitle) => {
        const start = this.formatASSTime(subtitle.startTime);
        const end = this.formatASSTime(subtitle.endTime);
        const text = subtitle.text.replace(/\n/g, '\\N');
        
        // Convert style to ASS format if available
        let styleName = 'Default';
        if (subtitle.style) {
          // Could create custom styles here based on subtitle.style
          styleName = 'Default';
        }
        
        ass += `Dialogue: 0,${start},${end},${styleName},,0,0,0,,${text}\n`;
      });

    return ass;
  }

  // Export subtitles to a file
  exportSubtitles(
    subtitles: SubtitleSegment[],
    options: ExportOptions,
    filename: string = 'subtitles'
  ): void {
    let content: string;
    let mimeType: string;
    let extension: string;

    switch (options.format) {
      case 'srt':
        content = this.toSRT(subtitles);
        mimeType = 'text/plain';
        extension = 'srt';
        break;
      case 'vtt':
        content = this.toWebVTT(subtitles, options.includeStyles || false);
        mimeType = 'text/vtt';
        extension = 'vtt';
        break;
      case 'ass':
        content = this.toASS(subtitles);
        mimeType = 'text/plain';
        extension = 'ass';
        break;
      case 'json':
        content = JSON.stringify(subtitles, null, 2);
        mimeType = 'application/json';
        extension = 'json';
        break;
      default:
        throw new Error(`Unsupported format: ${options.format}`);
    }

    // Handle encoding
    const encoding = options.encoding || 'utf-8';
    const blob = new Blob([content], { type: `${mimeType};charset=${encoding}` });

    // Create download link
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.${extension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Format time for SRT (HH:MM:SS,mmm)
  private formatSRTTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const millis = Math.floor((seconds % 1) * 1000);
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${millis.toString().padStart(3, '0')}`;
  }

  // Format time for WebVTT (HH:MM:SS.mmm)
  private formatVTTTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const millis = Math.floor((seconds % 1) * 1000);
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${millis.toString().padStart(3, '0')}`;
  }

  // Format time for ASS (H:MM:SS.cc)
  private formatASSTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const centisecs = Math.floor((seconds % 1) * 100);
    
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${centisecs.toString().padStart(2, '0')}`;
  }

  // Parse time from various formats
  parseTime(timeString: string, format: 'srt' | 'vtt' | 'ass'): number {
    const parts = timeString.split(/[:,.]/).map(p => parseInt(p, 10));
    
    if (parts.length < 4) return 0;
    
    const [hours, minutes, seconds] = parts;
    let fraction = parts[3];
    
    // Convert to seconds based on format
    if (format === 'srt') {
      // SRT uses milliseconds
      fraction = fraction / 1000;
    } else if (format === 'ass') {
      // ASS uses centiseconds
      fraction = fraction / 100;
    } else {
      // VTT uses milliseconds
      fraction = fraction / 1000;
    }
    
    return hours * 3600 + minutes * 60 + seconds + fraction;
  }
}

export const subtitleExportService = new SubtitleExportService(); 