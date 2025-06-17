import React, { useRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface UpscalerStats {
  originalWidth: number;
  originalHeight: number;
  upscaledWidth: number;
  upscaledHeight: number;
  processingTime: number;
  scaleFactor: number;
  modelName: string;
  backend: string;
  fileSize?: string;
  originalFileSize?: string;
}

interface UpscalerOutputProps {
  originalImageFile: File;
  upscaledImageUrl: string;
  stats: UpscalerStats;
  onReset: () => void;
}

const StatItem: React.FC<{ icon: string; label: string; value: string; accent?: string }> = ({ icon, label, value, accent }) => (
  <div className="stat-item">
    <span className={`material-symbols-outlined text-2xl ${accent ? `text-[var(--accent-color-${accent})]` : 'text-[var(--primary-color)]'}`}>
      {icon}
    </span>
    <div>
      <p className="text-sm font-medium text-gray-400">{label}</p>
      <p className="text-base text-white">{value}</p>
    </div>
  </div>
);

const UpscalerOutput: React.FC<UpscalerOutputProps> = ({ originalImageFile, upscaledImageUrl, stats, onReset }) => {
  const [originalUrl, setOriginalUrl] = useState('');

  useEffect(() => {
    const url = URL.createObjectURL(originalImageFile);
    setOriginalUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [originalImageFile]);

  const slider = useRef<HTMLInputElement>(null);
  const container = useRef<HTMLDivElement>(null);
  const originalImageWrapper = useRef<HTMLDivElement>(null);
  const handle = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const updateSliderView = (value: number) => {
    if (!originalImageWrapper.current || !handle.current) return;
    const percent = `${value}%`;
    originalImageWrapper.current.style.width = percent;
    handle.current.style.left = percent;
  };

  const onSliderInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateSliderView(parseFloat(e.target.value));
  };
  
  const startDrag = () => { isDragging.current = true; };
  const endDrag = () => { isDragging.current = false; };
  
  const onDrag = (e: MouseEvent | TouchEvent) => {
    if (!isDragging.current || !container.current || !slider.current) return;
    const rect = container.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    let x = clientX - rect.left;
    const width = rect.width;
    
    if (x < 0) x = 0;
    if (x > width) x = width;
    
    const percentage = (x / width) * 100;
    slider.current.value = String(percentage);
    updateSliderView(percentage);
  };
  
  useEffect(() => {
    document.addEventListener('mousemove', onDrag);
    document.addEventListener('touchmove', onDrag);
    document.addEventListener('mouseup', endDrag);
    document.addEventListener('touchend', endDrag);
    
    return () => {
      document.removeEventListener('mousemove', onDrag);
      document.removeEventListener('touchmove', onDrag);
      document.removeEventListener('mouseup', endDrag);
      document.removeEventListener('touchend', endDrag);
    };
  }, []);


  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = upscaledImageUrl;
    a.download = `upscaled_${originalImageFile.name}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <motion.div 
      className="w-full"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    >
      <div className="text-center mb-8">
        <h2 className="text-4xl md:text-5xl font-bold mb-2 tracking-tighter">AI Upscaler Results</h2>
        <p className="text-lg md:text-xl text-[var(--text-secondary)]">
          Your image has been successfully upscaled! Compare and download below.
        </p>
      </div>

      <div className="w-full bg-[var(--card-bg-color)] p-6 sm:p-8 rounded-xl shadow-xl mb-8">
        <div ref={container} className="image-comparison-slider">
          <img alt="Upscaled Image" className="upscaled-image w-full" src={upscaledImageUrl} />
          <div ref={originalImageWrapper} className="original-image-container">
            {originalUrl && <img alt="Original Image" src={originalUrl} />}
          </div>
          <div ref={handle} className="slider-handle" onMouseDown={startDrag} onTouchStart={startDrag}>
            <span className="material-symbols-outlined">compare_arrows</span>
          </div>
          <input ref={slider} type="range" min="0" max="100" defaultValue="50" className="slider" onInput={onSliderInput} />
        </div>
        <div className="mt-4 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center text-sm text-[var(--text-secondary)]">
            <span className="material-symbols-outlined text-lg mr-1.5 text-[var(--primary-color)]">photo_library</span>
            <span>Original</span>
          </div>
          <div className="flex items-center text-sm text-[var(--text-secondary)]">
            <span className="material-symbols-outlined text-lg mr-1.5 text-[var(--accent-color-1)]">auto_awesome</span>
            <span>Upscaled ({stats.scaleFactor}x)</span>
          </div>
        </div>
      </div>

      <div className="w-full bg-[var(--card-bg-color)] p-6 sm:p-8 rounded-xl shadow-xl mb-8">
        <h3 className="text-2xl font-semibold mb-4 text-center sm:text-left">Image Statistics</h3>
        <div className="stats-grid">
          <StatItem icon="aspect_ratio" label="Original Dimensions" value={`${stats.originalWidth} x ${stats.originalHeight}px`} />
          <StatItem icon="aspect_ratio" label="Upscaled Dimensions" value={`${stats.upscaledWidth} x ${stats.upscaledHeight}px`} accent="1" />
          <StatItem icon="image_search" label="Original Size" value={stats.originalFileSize || 'N/A'} />
          <StatItem icon="image_search" label="Upscaled Size" value={stats.fileSize || 'N/A'} accent="1" />
          <StatItem icon="model_training" label="Model Used" value={stats.modelName} accent="2" />
          <StatItem icon="timer" label="Processing Time" value={`${stats.processingTime.toFixed(2)} seconds`} accent="4" />
        </div>
      </div>

      <div className="w-full flex flex-col sm:flex-row gap-4">
        <button onClick={handleDownload} className="button flex-1 h-12 text-lg">
          <span className="material-symbols-outlined">download</span>
          Download Upscaled Image
        </button>
        <button onClick={onReset} className="button button-secondary flex-1 h-12 text-lg">
          <span className="material-symbols-outlined">add_photo_alternate</span>
          Upscale Another Image
        </button>
      </div>
    </motion.div>
  );
};

export default UpscalerOutput; 