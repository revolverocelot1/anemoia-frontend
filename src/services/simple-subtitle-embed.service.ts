import type { SubtitleSegment } from '../types/caption-studio';
import { ffmpegVideoExportService } from './ffmpeg-video-export.service';

export class SimpleSubtitleEmbedService {
  /**
   * Creates a video with embedded subtitle track using FFmpeg
   * This now properly embeds subtitles into the video container
   */
  async embedSubtitlesAsTrack(
    videoBlob: Blob,
    subtitles: SubtitleSegment[],
    onProgress?: (progress: number) => void
  ): Promise<Blob> {
    console.log('[SimpleEmbed] Starting subtitle track embedding with FFmpeg...');
    
    try {
      // Ensure FFmpeg is loaded
      await ffmpegVideoExportService.loadFFmpeg();
      
      // Use FFmpeg service to embed subtitles as a track
      const result = await ffmpegVideoExportService.exportVideoWithSubtitleTrack(
        videoBlob,
        subtitles,
        {
          format: 'mp4', // Default to MP4 for better compatibility
          quality: 'high',
          burnSubtitles: false,
          embedSubtitles: true,
          fps: 30
        },
        onProgress
      );
      
      console.log('[SimpleEmbed] Subtitle track embedding complete with FFmpeg');
      return result;
      
    } catch (error) {
      console.error('[SimpleEmbed] Failed to embed subtitles with FFmpeg:', error);
      // If FFmpeg fails, try the download approach as fallback
      console.log('[SimpleEmbed] Falling back to separate file download');
      this.downloadVideoWithSubtitles(videoBlob, subtitles);
      return videoBlob;
    }
  }
  
  /**
   * Embeds subtitles by burning them into video frames using FFmpeg
   */
  async burnSubtitlesIntoVideo(
    videoBlob: Blob,
    subtitles: SubtitleSegment[],
    onProgress?: (progress: number) => void
  ): Promise<Blob> {
    console.log('[SimpleEmbed] Starting subtitle burning with FFmpeg...');
    
    try {
      // Ensure FFmpeg is loaded
      await ffmpegVideoExportService.loadFFmpeg();
      
      // Use FFmpeg service to burn subtitles into video
      const result = await ffmpegVideoExportService.exportVideoWithBurnedSubtitles(
        videoBlob,
        subtitles,
        {
          format: 'mp4',
          quality: 'high',
          burnSubtitles: true,
          embedSubtitles: false,
          fps: 30
        },
        onProgress
      );
      
      console.log('[SimpleEmbed] Subtitle burning complete with FFmpeg');
      return result;
      
    } catch (error) {
      console.error('[SimpleEmbed] Failed to burn subtitles with FFmpeg:', error);
      throw new Error('Failed to burn subtitles into video: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  }
  
  /**
   * Creates a downloadable subtitle file that can be loaded alongside the video
   */
  createSubtitleFile(subtitles: SubtitleSegment[], format: 'vtt' | 'srt' = 'vtt'): Blob {
    let content: string;
    let mimeType: string;
    
    if (format === 'vtt') {
      content = this.createWebVTT(subtitles);
      mimeType = 'text/vtt';
    } else {
      content = this.createSRT(subtitles);
      mimeType = 'text/plain';
    }
    
    return new Blob([content], { type: mimeType });
  }
  
  /**
   * Downloads both video and subtitle files together
   * This is now a fallback option when FFmpeg embedding fails
   */
  downloadVideoWithSubtitles(
    videoBlob: Blob,
    subtitles: SubtitleSegment[],
    baseFilename: string = 'video'
  ): void {
    // Download video
    const videoUrl = URL.createObjectURL(videoBlob);
    const videoLink = document.createElement('a');
    videoLink.href = videoUrl;
    videoLink.download = `${baseFilename}.mp4`;
    videoLink.click();
    URL.revokeObjectURL(videoUrl);
    
    // Download subtitle file
    setTimeout(() => {
      const subtitleBlob = this.createSubtitleFile(subtitles, 'vtt');
      const subtitleUrl = URL.createObjectURL(subtitleBlob);
      const subtitleLink = document.createElement('a');
      subtitleLink.href = subtitleUrl;
      subtitleLink.download = `${baseFilename}.vtt`;
      subtitleLink.click();
      URL.revokeObjectURL(subtitleUrl);
      
      console.log('[SimpleEmbed] Downloaded video and subtitle files separately (fallback mode)');
      console.log('[SimpleEmbed] To use: Open video in VLC, then go to Subtitle > Add Subtitle File...');
      
      // Show user notification about fallback
      alert('Note: Subtitles could not be embedded directly. The video and subtitle files have been downloaded separately. To view with subtitles, open the video in a player like VLC and add the subtitle file manually.');
    }, 500); // Small delay to avoid browser blocking multiple downloads
  }
  
  private createWebVTT(subtitles: SubtitleSegment[]): string {
    let vtt = 'WEBVTT\n\n';
    
    subtitles
      .sort((a, b) => a.startTime - b.startTime)
      .forEach((subtitle, index) => {
        const start = this.formatTime(subtitle.startTime);
        const end = this.formatTime(subtitle.endTime);
        vtt += `${index + 1}\n${start} --> ${end}\n${subtitle.text}\n\n`;
      });
    
    return vtt;
  }
  
  private createSRT(subtitles: SubtitleSegment[]): string {
    return subtitles
      .sort((a, b) => a.startTime - b.startTime)
      .map((subtitle, index) => {
        const start = this.formatSRTTime(subtitle.startTime);
        const end = this.formatSRTTime(subtitle.endTime);
        return `${index + 1}\n${start} --> ${end}\n${subtitle.text}\n`;
      })
      .join('\n');
  }
  
  private formatTime(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);
    
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
  }
  
  private formatSRTTime(seconds: number): string {
    const formatted = this.formatTime(seconds);
    return formatted.replace('.', ','); // SRT uses comma for milliseconds
  }
  
  private async addMetadataToVideo(videoBlob: Blob, vttContent: string): Promise<Blob> {
    // This is a placeholder for future implementation
    // In a real implementation, we would need to:
    // 1. Parse the video container format
    // 2. Add subtitle track metadata
    // 3. Rebuild the container
    
    // For now, we'll just return the original video
    // and rely on external subtitle files
    console.log('[SimpleEmbed] Note: Browser limitations prevent direct subtitle embedding');
    console.log('[SimpleEmbed] Subtitle file will be downloaded separately');
    
    return videoBlob;
  }
}

export const simpleSubtitleEmbedService = new SimpleSubtitleEmbedService(); 