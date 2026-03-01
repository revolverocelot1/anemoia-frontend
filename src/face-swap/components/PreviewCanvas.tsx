import React, { useEffect, useRef } from 'react';

interface PreviewCanvasProps {
  image: ImageData;
  className?: string;
}

export const PreviewCanvas: React.FC<PreviewCanvasProps> = ({
  image,
  className = ''
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = image.width;
    canvas.height = image.height;
    const ctx = canvas.getContext('2d')!;
    ctx.putImageData(image, 0, 0);
  }, [image]);

  return (
    <div className={`preview-canvas ${className}`}>
      <canvas ref={canvasRef} />
    </div>
  );
}; 