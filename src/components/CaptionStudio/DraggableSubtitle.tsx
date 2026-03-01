import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Move, Type, Palette, Square } from 'lucide-react';
import { SubtitleSegment, SubtitleStyle, SubtitlePosition } from '../../types/caption-studio';

interface DraggableSubtitleProps {
  subtitle: SubtitleSegment;
  videoWidth: number;
  videoHeight: number;
  onUpdate: (updates: Partial<SubtitleSegment>) => void;
  onTextUpdate?: (text: string) => void;
  isEditing?: boolean;
  onEditingChange?: (editing: boolean) => void;
}

const DraggableSubtitle: React.FC<DraggableSubtitleProps> = ({
  subtitle,
  videoWidth,
  videoHeight,
  onUpdate,
  onTextUpdate,
  isEditing = false,
  onEditingChange
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [localIsEditing, setLocalIsEditing] = useState(isEditing);
  const [editingText, setEditingText] = useState(subtitle.text);
  const [localPosition, setLocalPosition] = useState<SubtitlePosition>(
    subtitle.position || {
      x: 50,
      y: 85,
      alignment: 'center',
      verticalAlignment: 'bottom'
    }
  );
  const [localStyle, setLocalStyle] = useState<SubtitleStyle>(
    subtitle.style || {
      fontFamily: 'Arial',
      fontSize: 24,
      fontWeight: 'bold',
      fontStyle: 'normal',
      color: '#FFFFFF',
      backgroundColor: '#000000',
      backgroundOpacity: 0.75,
      strokeColor: '#000000',
      strokeWidth: 2,
      shadowColor: '#000000',
      shadowBlur: 3,
      padding: 10
    }
  );

  const containerRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef({ x: 0, y: 0 });

  // Calculate pixel position from percentage
  const getPixelPosition = () => {
    return {
      x: (localPosition.x / 100) * videoWidth,
      y: (localPosition.y / 100) * videoHeight
    };
  };

  // Handle drag start
  const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setIsDragging(true);
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      dragStartRef.current = {
        x: clientX - rect.left,
        y: clientY - rect.top
      };
    }
  };

  // Handle drag move
  useEffect(() => {
    if (!isDragging) return;

    const handleMove = (e: MouseEvent | TouchEvent) => {
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      
      const container = containerRef.current?.parentElement;
      if (!container) return;
      
      const rect = container.getBoundingClientRect();
      const x = clientX - rect.left - dragStartRef.current.x;
      const y = clientY - rect.top - dragStartRef.current.y;
      
      // Convert to percentage
      const percentX = (x / rect.width) * 100;
      const percentY = (y / rect.height) * 100;
      
      // Clamp values
      const clampedX = Math.max(0, Math.min(100, percentX));
      const clampedY = Math.max(0, Math.min(100, percentY));
      
      setLocalPosition({
        ...localPosition,
        x: clampedX,
        y: clampedY
      });
    };

    const handleEnd = () => {
      setIsDragging(false);
      // Save position
      onUpdate({
        position: localPosition
      });
    };

    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleEnd);
    document.addEventListener('touchmove', handleMove);
    document.addEventListener('touchend', handleEnd);

    return () => {
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleEnd);
      document.removeEventListener('touchmove', handleMove);
      document.removeEventListener('touchend', handleEnd);
    };
  }, [isDragging, localPosition, onUpdate]);

  // Quick style controls
  const fontSizes = [16, 20, 24, 28, 32, 36, 40, 48];
  const colors = ['#FFFFFF', '#FFFF00', '#00FF00', '#00FFFF', '#FF00FF', '#FFA500', '#FF0000'];
  const backgroundColors = ['#000000', '#333333', '#666666', 'transparent'];

  const updateStyle = (updates: Partial<SubtitleStyle>) => {
    const newStyle = { ...localStyle, ...updates };
    setLocalStyle(newStyle);
    onUpdate({ style: newStyle });
  };

  const pixelPos = getPixelPosition();

  return (
    <div
      ref={containerRef}
      className="absolute pointer-events-auto"
      style={{
        left: `${pixelPos.x}px`,
        top: `${pixelPos.y}px`,
        transform: `translate(
          ${localPosition.alignment === 'center' ? '-50%' : localPosition.alignment === 'right' ? '-100%' : '0'}, 
          ${localPosition.verticalAlignment === 'middle' ? '-50%' : localPosition.verticalAlignment === 'bottom' ? '-100%' : '0'}
        )`,
        cursor: isDragging ? 'grabbing' : 'grab'
      }}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => !isDragging && setShowControls(false)}
    >
      {/* Subtitle preview */}
      <div
        className="relative"
        onMouseDown={handleDragStart}
        onTouchStart={handleDragStart}
      >
        <div
          style={{
            fontFamily: localStyle.fontFamily,
            fontSize: `${localStyle.fontSize}px`,
            fontWeight: localStyle.fontWeight,
            fontStyle: localStyle.fontStyle,
            color: localStyle.color,
            backgroundColor: localStyle.backgroundColor === 'transparent' 
              ? 'transparent' 
              : `${localStyle.backgroundColor}${Math.round((localStyle.backgroundOpacity || 0.75) * 255).toString(16).padStart(2, '0')}`,
            padding: `${localStyle.padding}px`,
            borderRadius: '4px',
            textShadow: localStyle.shadowBlur 
              ? `${localStyle.shadowColor} 0 0 ${localStyle.shadowBlur}px`
              : 'none',
            WebkitTextStroke: localStyle.strokeWidth 
              ? `${localStyle.strokeWidth}px ${localStyle.strokeColor}`
              : 'none',
            textAlign: localPosition.alignment,
            whiteSpace: 'pre-wrap',
            maxWidth: `${videoWidth * 0.8}px`
          }}
        >
          {localIsEditing ? (
            <input
              type="text"
              value={editingText}
              onChange={(e) => {
                setEditingText(e.target.value);
                if (onTextUpdate) {
                  onTextUpdate(e.target.value);
                }
              }}
              onBlur={() => {
                setLocalIsEditing(false);
                if (onEditingChange) {
                  onEditingChange(false);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  setLocalIsEditing(false);
                  if (onEditingChange) {
                    onEditingChange(false);
                  }
                }
              }}
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              className="bg-transparent border-none outline-none w-full text-center"
              style={{
                fontFamily: 'inherit',
                fontSize: 'inherit',
                fontWeight: 'inherit',
                fontStyle: 'inherit',
                color: 'inherit',
                textShadow: 'inherit',
                WebkitTextStroke: 'inherit'
              }}
              autoFocus
            />
          ) : (
            <span
              onDoubleClick={(e) => {
                e.stopPropagation();
                setLocalIsEditing(true);
                if (onEditingChange) {
                  onEditingChange(true);
                }
              }}
              style={{ cursor: 'text' }}
            >
              {subtitle.text}
            </span>
          )}
        </div>

        {/* Drag handle indicator */}
        {showControls && (
          <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-purple-600 text-white px-2 py-1 rounded text-xs flex items-center gap-1">
            <Move className="w-3 h-3" />
            Drag to move
          </div>
        )}
      </div>

      {/* Quick controls */}
      {showControls && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute top-full mt-2 left-1/2 transform -translate-x-1/2 bg-gray-900 rounded-lg p-3 shadow-xl"
          style={{ minWidth: '300px' }}
        >
          {/* Font size */}
          <div className="mb-3">
            <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
              <Type className="w-3 h-3" />
              Font Size
            </div>
            <div className="flex gap-1">
              {fontSizes.map(size => (
                <button
                  key={size}
                  onClick={() => updateStyle({ fontSize: size })}
                  className={`w-8 h-8 rounded text-xs transition-all ${
                    localStyle.fontSize === size
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          {/* Text color */}
          <div className="mb-3">
            <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
              <Palette className="w-3 h-3" />
              Text Color
            </div>
            <div className="flex gap-1">
              {colors.map(color => (
                <button
                  key={color}
                  onClick={() => updateStyle({ color })}
                  className={`w-8 h-8 rounded border-2 transition-all ${
                    localStyle.color === color
                      ? 'border-purple-500'
                      : 'border-gray-700'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          {/* Background */}
          <div className="mb-3">
            <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
              <Square className="w-3 h-3" />
              Background
            </div>
            <div className="flex gap-1">
              {backgroundColors.map(color => (
                <button
                  key={color}
                  onClick={() => updateStyle({ 
                    backgroundColor: color,
                    backgroundOpacity: color === 'transparent' ? 0 : 0.75
                  })}
                  className={`w-8 h-8 rounded border-2 transition-all ${
                    localStyle.backgroundColor === color
                      ? 'border-purple-500'
                      : 'border-gray-700'
                  }`}
                  style={{ 
                    backgroundColor: color === 'transparent' ? 'transparent' : color,
                    backgroundImage: color === 'transparent' 
                      ? 'linear-gradient(45deg, #374151 25%, transparent 25%, transparent 75%, #374151 75%, #374151), linear-gradient(45deg, #374151 25%, transparent 25%, transparent 75%, #374151 75%, #374151)'
                      : 'none',
                    backgroundSize: '8px 8px',
                    backgroundPosition: '0 0, 4px 4px'
                  }}
                />
              ))}
            </div>
          </div>

          {/* Alignment */}
          <div>
            <div className="text-xs text-gray-400 mb-1">Alignment</div>
            <div className="flex gap-1">
              {(['left', 'center', 'right'] as const).map(align => (
                <button
                  key={align}
                  onClick={() => {
                    const newPosition = { ...localPosition, alignment: align };
                    setLocalPosition(newPosition);
                    onUpdate({ position: newPosition });
                  }}
                  className={`px-3 py-1 rounded text-xs transition-all ${
                    localPosition.alignment === align
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  {align}
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default DraggableSubtitle; 