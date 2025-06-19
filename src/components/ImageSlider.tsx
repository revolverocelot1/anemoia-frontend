import React, { useState, useRef, useEffect } from 'react';

interface ImageSliderProps {
  image1Url: string;
  image2Url: string;
  image1Label?: string;
  image2Label?: string;
  className?: string;
}

const ImageSlider: React.FC<ImageSliderProps> = ({
  image1Url,
  image2Url,
  image1Label = "Original",
  image2Label = "Edited",
  className = ""
}) => {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    updateSliderPosition(e);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging) {
      updateSliderPosition(e);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    setIsDragging(true);
    updateSliderPosition(e.touches[0]);
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (isDragging && e.touches[0]) {
      updateSliderPosition(e.touches[0]);
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  const updateSliderPosition = (e: MouseEvent | Touch | React.MouseEvent | React.Touch) => {
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPosition(percentage);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchmove', handleTouchMove);
      document.addEventListener('touchend', handleTouchEnd);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDragging]);

  return (
    <div className={`relative w-full h-full bg-gray-900 rounded-lg overflow-hidden shadow-2xl ${className}`}>
      {/* Container for images */}
      <div ref={containerRef} className="relative w-full h-full cursor-col-resize select-none">
        {/* Background image (image2 - edited) */}
        <div className="absolute inset-0 w-full h-full">
          <img
            src={image2Url}
            alt={image2Label}
            className="w-full h-full object-contain"
            draggable={false}
          />
          <div className="absolute top-4 right-4 bg-black bg-opacity-60 text-white px-3 py-1 rounded-full text-sm font-medium">
            {image2Label}
          </div>
        </div>

        {/* Foreground image (image1 - original) with clip */}
        <div 
          className="absolute inset-0 w-full h-full overflow-hidden"
          style={{ 
            clipPath: `polygon(0 0, ${sliderPosition}% 0, ${sliderPosition}% 100%, 0 100%)` 
          }}
        >
          <img
            src={image1Url}
            alt={image1Label}
            className="w-full h-full object-contain"
            draggable={false}
          />
          <div className="absolute top-4 left-4 bg-black bg-opacity-60 text-white px-3 py-1 rounded-full text-sm font-medium">
            {image1Label}
          </div>
        </div>

        {/* Slider line and handle */}
        <div 
          className="absolute top-0 bottom-0 w-1 bg-white shadow-lg z-10 cursor-col-resize"
          style={{ left: `${sliderPosition}%`, transform: 'translateX(-50%)' }}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
        >
          {/* Slider handle */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full shadow-lg border-2 border-gray-300 cursor-col-resize flex items-center justify-center">
            <div className="w-1 h-4 bg-gray-400 rounded-full mr-1"></div>
            <div className="w-1 h-4 bg-gray-400 rounded-full"></div>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-60 text-white px-4 py-2 rounded-full text-sm">
        Drag to compare images
      </div>

      {/* Position indicator */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-60 text-white px-3 py-1 rounded-full text-xs">
        {sliderPosition.toFixed(0)}% {image1Label} | {(100 - sliderPosition).toFixed(0)}% {image2Label}
      </div>
    </div>
  );
};

export default ImageSlider; 