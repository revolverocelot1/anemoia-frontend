import React, { useRef, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import './ImageUploader.css';

interface ImageUploaderProps {
  onImageUpload: (imageData: ImageData) => void;
  label: string;
  accept?: string;
  className?: string;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  onImageUpload,
  label,
  accept = 'image/*',
  className = ''
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processImage = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) return;
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(reader.error);
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(file);
    });

    // Create an ImageBitmap for faster decode when available
    let bitmap: ImageBitmap | null = null;
    try {
      bitmap = await createImageBitmap(file);
    } catch {}

    // Draw to canvas and cap max dimension for performance
    const img = new Image();
    await new Promise<void>((res) => {
      img.onload = () => res();
      img.src = dataUrl;
    });

    const MAX_DIM = 1600;
    const scale = Math.min(1, MAX_DIM / Math.max(img.width, img.height));
    const w = Math.max(1, Math.round(img.width * scale));
    const h = Math.max(1, Math.round(img.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
    if (bitmap) {
      ctx.drawImage(bitmap, 0, 0, w, h);
      try { bitmap.close(); } catch {}
    } else {
      ctx.drawImage(img, 0, 0, w, h);
    }

    const imageData = ctx.getImageData(0, 0, w, h);
    setPreview(canvas.toDataURL('image/jpeg', 0.9));
    onImageUpload(imageData);
  }, [onImageUpload]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processImage(file);
    }
  }, [processImage]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      processImage(file);
    }
  }, [processImage]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleReset = useCallback(() => {
    setPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  return (
    <div className={`image-uploader-wrapper ${className}`}>
      {!preview ? (
        <div
          className={`image-uploader ${isDragging ? 'drag-over' : ''}`}
          onClick={handleClick}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
          <div className="upload-content">
            <div className="upload-icon">📸</div>
            <div className="upload-label">{label}</div>
            <div className="upload-hint">Click or drag & drop an image here</div>
          </div>
        </div>
      ) : (
        <div className="image-preview">
          <img src={preview} alt="Preview" />
          <button className="change-image-button" onClick={handleReset}>
            Change Image
          </button>
        </div>
      )}
    </div>
  );
}; 