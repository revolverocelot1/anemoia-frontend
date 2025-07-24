import { useEffect } from 'react';
import { fastSubtitleEmbedService } from '../services/fast-subtitle-embed.service';
import { ffmpegVideoExportService } from '../services/ffmpeg-video-export.service';

export const FFmpegPreloader: React.FC = () => {
  useEffect(() => {
    // Pre-load FFmpeg instances in the background
    const preloadFFmpeg = async () => {
      console.log('[FFmpegPreloader] Starting background FFmpeg preload...');
      
      try {
        // Pre-load fast subtitle service (highest priority)
        await fastSubtitleEmbedService.preloadFFmpeg();
        console.log('[FFmpegPreloader] Fast subtitle service ready');
        
        // Pre-load regular ffmpeg service
        await ffmpegVideoExportService.loadFFmpeg();
        console.log('[FFmpegPreloader] Regular FFmpeg service ready');
        
      } catch (error) {
        console.error('[FFmpegPreloader] Failed to preload FFmpeg:', error);
      }
    };
    
    // Start preloading after a short delay to not block initial render
    const timer = setTimeout(preloadFFmpeg, 1000);
    
    return () => {
      clearTimeout(timer);
    };
  }, []);
  
  // This component doesn't render anything
  return null;
};

export default FFmpegPreloader; 