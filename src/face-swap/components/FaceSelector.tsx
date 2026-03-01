import React, { useEffect, useRef } from 'react';

interface FaceInfo {
  id: number;
  selected: boolean;
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

interface FaceSelectorProps {
  image: ImageData;
  faces: FaceInfo[];
  selectedFaces: number[];
  onFaceSelect: (faceId: number) => void;
  singleSelect?: boolean;
  className?: string;
}

export const FaceSelector: React.FC<FaceSelectorProps> = ({
  image,
  faces,
  selectedFaces,
  onFaceSelect,
  singleSelect = false,
  className = ''
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d')!;
    canvas.width = image.width;
    canvas.height = image.height;

    // Draw the image
    ctx.putImageData(image, 0, 0);

    // Draw face bounding boxes
    faces.forEach((face) => {
      const isSelected = selectedFaces.includes(face.id);
      
      ctx.strokeStyle = isSelected ? '#4a9eff' : '#888888';
      ctx.lineWidth = 3;
      ctx.strokeRect(
        face.boundingBox.x,
        face.boundingBox.y,
        face.boundingBox.width,
        face.boundingBox.height
      );

      // Draw face number
      ctx.fillStyle = isSelected ? '#4a9eff' : '#888888';
      ctx.fillRect(
        face.boundingBox.x,
        face.boundingBox.y - 30,
        30,
        30
      );
      
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(
        (face.id + 1).toString(),
        face.boundingBox.x + 15,
        face.boundingBox.y - 15
      );
    });
  }, [image, faces, selectedFaces]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    // Check which face was clicked
    for (const face of faces) {
      const box = face.boundingBox;
      if (
        x >= box.x &&
        x <= box.x + box.width &&
        y >= box.y &&
        y <= box.y + box.height
      ) {
        onFaceSelect(face.id);
        break;
      }
    }
  };

  return (
    <div className={`face-selector ${className}`}>
      <div className="face-canvas-container">
        <canvas
          ref={canvasRef}
          className="face-canvas"
          onClick={handleCanvasClick}
          style={{ cursor: 'pointer' }}
        />
      </div>
      <p className="face-count">
        {faces.length === 0
          ? 'No faces detected'
          : singleSelect
          ? `${faces.length} face${faces.length > 1 ? 's' : ''} detected - Click to select`
          : `${faces.length} face${faces.length > 1 ? 's' : ''} detected - Click to toggle`}
      </p>
    </div>
  );
}; 