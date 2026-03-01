import React, { useRef, useEffect, useState } from 'react';
import { SubtitleSegment } from '../../types/caption-studio';

interface SubtitleTimelineProps {
  subtitles: SubtitleSegment[];
  duration: number;
  currentTime: number;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onTimeClick: (time: number) => void;
  className?: string;
}

const SubtitleTimeline: React.FC<SubtitleTimelineProps> = ({
  subtitles,
  duration,
  currentTime,
  selectedId,
  onSelect,
  onTimeClick,
  className = ''
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [scrollOffset, setScrollOffset] = useState(0);
  const [hoveredSubtitle, setHoveredSubtitle] = useState<string | null>(null);

  // Constants
  const TIMELINE_HEIGHT = 60;
  const RULER_HEIGHT = 30;
  const SUBTITLE_HEIGHT = 25;
  const PADDING = 10;
  const MIN_ZOOM = 0.5;
  const MAX_ZOOM = 10;

  // Calculate timeline width based on zoom
  const timelineWidth = duration * 100 * zoom;

  // Draw timeline
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    // Set canvas size
    const containerWidth = containerRef.current?.clientWidth || 800;
    canvas.width = containerWidth;
    canvas.height = TIMELINE_HEIGHT + RULER_HEIGHT;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw ruler
    drawRuler(ctx, containerWidth);

    // Draw subtitles
    drawSubtitles(ctx, containerWidth);

    // Draw current time indicator
    drawTimeIndicator(ctx, containerWidth);
  }, [subtitles, duration, currentTime, selectedId, hoveredSubtitle, zoom, scrollOffset]);

  const drawRuler = (ctx: CanvasRenderingContext2D, width: number) => {
    ctx.fillStyle = '#374151';
    ctx.fillRect(0, 0, width, RULER_HEIGHT);

    // Calculate visible time range
    const visibleStartTime = (scrollOffset / timelineWidth) * duration;
    const visibleEndTime = ((scrollOffset + width) / timelineWidth) * duration;
    
    // Draw time marks
    ctx.font = '10px sans-serif';
    ctx.fillStyle = '#9CA3AF';
    
    const interval = getTimeInterval(zoom);
    const startMark = Math.floor(visibleStartTime / interval) * interval;
    
    for (let time = startMark; time <= visibleEndTime; time += interval) {
      const x = (time / duration) * timelineWidth - scrollOffset;
      
      // Major mark
      ctx.strokeStyle = '#6B7280';
      ctx.beginPath();
      ctx.moveTo(x, RULER_HEIGHT - 10);
      ctx.lineTo(x, RULER_HEIGHT);
      ctx.stroke();
      
      // Time label
      const label = formatTimeShort(time);
      const labelWidth = ctx.measureText(label).width;
      ctx.fillText(label, x - labelWidth / 2, RULER_HEIGHT - 15);
    }
  };

  const drawSubtitles = (ctx: CanvasRenderingContext2D, width: number) => {
    ctx.save();
    ctx.translate(0, RULER_HEIGHT);

    // Background
    ctx.fillStyle = '#1F2937';
    ctx.fillRect(0, 0, width, TIMELINE_HEIGHT);

    // Draw each subtitle
    subtitles.forEach(subtitle => {
      const x = (subtitle.startTime / duration) * timelineWidth - scrollOffset;
      const width = ((subtitle.endTime - subtitle.startTime) / duration) * timelineWidth;
      const y = PADDING;

      // Skip if outside visible area
      if (x + width < 0 || x > ctx.canvas.width) return;

      // Subtitle background
      if (subtitle.id === selectedId) {
        ctx.fillStyle = '#7C3AED';
      } else if (subtitle.id === hoveredSubtitle) {
        ctx.fillStyle = '#6D28D9';
      } else {
        ctx.fillStyle = '#4B5563';
      }
      
      ctx.fillRect(x, y, width, SUBTITLE_HEIGHT);

      // Subtitle text (truncated)
      ctx.save();
      ctx.clip();
      ctx.font = '11px sans-serif';
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(subtitle.text, x + 5, y + SUBTITLE_HEIGHT / 2 + 4);
      ctx.restore();

      // Border
      ctx.strokeStyle = subtitle.id === selectedId ? '#A78BFA' : '#374151';
      ctx.strokeRect(x, y, width, SUBTITLE_HEIGHT);
    });

    ctx.restore();
  };

  const drawTimeIndicator = (ctx: CanvasRenderingContext2D, width: number) => {
    const x = (currentTime / duration) * timelineWidth - scrollOffset;
    
    ctx.strokeStyle = '#EF4444';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, ctx.canvas.height);
    ctx.stroke();
    
    // Time handle
    ctx.fillStyle = '#EF4444';
    ctx.beginPath();
    ctx.moveTo(x - 5, 0);
    ctx.lineTo(x + 5, 0);
    ctx.lineTo(x, 10);
    ctx.closePath();
    ctx.fill();
  };

  const getTimeInterval = (zoom: number): number => {
    if (zoom < 1) return 10;
    if (zoom < 2) return 5;
    if (zoom < 5) return 2;
    return 1;
  };

  const formatTimeShort = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleClick = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Check if clicked on ruler
    if (y < RULER_HEIGHT) {
      const clickedTime = ((x + scrollOffset) / timelineWidth) * duration;
      onTimeClick(Math.max(0, Math.min(duration, clickedTime)));
      return;
    }

    // Check if clicked on subtitle
    const clickedSubtitle = subtitles.find(subtitle => {
      const subX = (subtitle.startTime / duration) * timelineWidth - scrollOffset;
      const subWidth = ((subtitle.endTime - subtitle.startTime) / duration) * timelineWidth;
      const subY = RULER_HEIGHT + PADDING;
      
      return x >= subX && x <= subX + subWidth && 
             y >= subY && y <= subY + SUBTITLE_HEIGHT;
    });

    if (clickedSubtitle) {
      onSelect(clickedSubtitle.id);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Find hovered subtitle
    const hovered = subtitles.find(subtitle => {
      const subX = (subtitle.startTime / duration) * timelineWidth - scrollOffset;
      const subWidth = ((subtitle.endTime - subtitle.startTime) / duration) * timelineWidth;
      const subY = RULER_HEIGHT + PADDING;
      
      return x >= subX && x <= subX + subWidth && 
             y >= subY && y <= subY + SUBTITLE_HEIGHT;
    });

    setHoveredSubtitle(hovered?.id || null);
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      // Zoom
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      setZoom(prev => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, prev * delta)));
    } else {
      // Horizontal scroll
      setScrollOffset(prev => 
        Math.max(0, Math.min(timelineWidth - containerRef.current!.clientWidth, prev + e.deltaX))
      );
    }
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <canvas
        ref={canvasRef}
        className="cursor-pointer"
        onClick={handleClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoveredSubtitle(null)}
        onWheel={handleWheel}
      />
      
      {/* Zoom controls */}
      <div className="absolute top-2 right-2 flex items-center gap-2 bg-gray-800 rounded-lg p-1">
        <button
          onClick={() => setZoom(prev => Math.max(MIN_ZOOM, prev - 0.1))}
          className="text-gray-400 hover:text-white px-2 py-1"
        >
          -
        </button>
        <span className="text-sm text-gray-400 w-12 text-center">
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={() => setZoom(prev => Math.min(MAX_ZOOM, prev + 0.1))}
          className="text-gray-400 hover:text-white px-2 py-1"
        >
          +
        </button>
      </div>
      
      {/* Scroll hint */}
      {containerRef.current && timelineWidth > containerRef.current.clientWidth && (
        <div className="absolute bottom-2 left-2 text-xs text-gray-500">
          Scroll horizontally • Ctrl+Scroll to zoom
        </div>
      )}
    </div>
  );
};

export default SubtitleTimeline; 