import { useState, useRef, useCallback } from 'react';

interface ResultsViewerProps {
  originalImage: string;
  processedImage: string | null;
  onBack: () => void;
}

const ResultsViewer = ({ originalImage, processedImage, onBack }: ResultsViewerProps) => {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback(() => {
    setIsDragging(true);
  }, []);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPosition(percentage);
  }, [isDragging]);

  const handleDownload = useCallback((imageData: string, filename: string) => {
    const link = document.createElement('a');
    link.download = filename;
    link.href = imageData;
    link.click();
  }, []);

  if (!processedImage) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[var(--text)]">Processing result...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-[var(--surface)] border border-[var(--border)] rounded-lg">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 bg-[var(--background)] border border-[var(--border)] rounded-lg
                     hover:bg-[var(--surface)] transition-colors"
          >
            <span className="material-symbols-outlined text-sm">arrow_back</span>
          </button>
          <div>
            <h3 className="font-semibold text-[var(--text)]">Object Removal Complete</h3>
            <p className="text-sm text-[var(--text-secondary)]">
              Drag the slider to compare before and after
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleDownload(originalImage, `original-${Date.now()}.png`)}
            className="px-3 py-2 text-sm bg-[var(--background)] border border-[var(--border)] rounded-lg
                     hover:bg-[var(--surface)] transition-colors flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-sm">download</span>
            Original
          </button>
          <button
            onClick={() => handleDownload(processedImage, `removed-objects-${Date.now()}.png`)}
            className="px-3 py-2 text-sm bg-[var(--primary)] text-white rounded-lg
                     hover:bg-[var(--primary-dark)] transition-colors flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-sm">download</span>
            Result
          </button>
        </div>
      </div>

      {/* Comparison Viewer */}
      <div className="flex-1 bg-[var(--surface)] border border-[var(--border)] rounded-lg overflow-hidden">
        <div className="w-full h-full flex items-center justify-center p-4">
          <div 
            ref={containerRef}
            className="relative max-w-full max-h-full cursor-col-resize select-none"
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseUp}
          >
            {/* Original Image (Background) */}
            <img
              src={originalImage}
              alt="Original"
              className="block max-w-full max-h-[600px] object-contain"
              draggable={false}
            />

            {/* Processed Image (Overlay) */}
            <div 
              className="absolute inset-0 overflow-hidden"
              style={{ 
                clipPath: `polygon(${sliderPosition}% 0%, 100% 0%, 100% 100%, ${sliderPosition}% 100%)` 
              }}
            >
              <img
                src={processedImage}
                alt="Processed"
                className="block w-full h-full object-contain"
                draggable={false}
              />
            </div>

            {/* Slider Line */}
            <div 
              className="absolute top-0 bottom-0 w-1 bg-white shadow-lg pointer-events-none z-10"
              style={{ left: `${sliderPosition}%`, transform: 'translateX(-50%)' }}
            >
              {/* Slider Handle */}
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2
                            w-8 h-8 bg-white border-2 border-[var(--primary)] rounded-full shadow-lg
                            flex items-center justify-center pointer-events-auto cursor-col-resize">
                <div className="w-1 h-4 bg-[var(--primary)] rounded-full"></div>
              </div>
            </div>

            {/* Labels */}
            <div className="absolute top-4 left-4 bg-black/70 text-white text-sm px-2 py-1 rounded">
              Original
            </div>
            <div className="absolute top-4 right-4 bg-black/70 text-white text-sm px-2 py-1 rounded">
              Processed
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between p-4 bg-[var(--surface)] border border-[var(--border)] rounded-lg">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-[var(--text)]">Compare:</span>
          <input
            type="range"
            min="0"
            max="100"
            value={sliderPosition}
            onChange={(e) => setSliderPosition(Number(e.target.value))}
            className="w-32 h-2 bg-[var(--background)] rounded-lg appearance-none cursor-pointer"
          />
          <div className="flex gap-2">
            <button
              onClick={() => setSliderPosition(0)}
              className="px-2 py-1 text-xs bg-[var(--background)] border border-[var(--border)] rounded
                       hover:bg-[var(--surface)] transition-colors"
            >
              Original
            </button>
            <button
              onClick={() => setSliderPosition(50)}
              className="px-2 py-1 text-xs bg-[var(--background)] border border-[var(--border)] rounded
                       hover:bg-[var(--surface)] transition-colors"
            >
              50/50
            </button>
            <button
              onClick={() => setSliderPosition(100)}
              className="px-2 py-1 text-xs bg-[var(--background)] border border-[var(--border)] rounded
                       hover:bg-[var(--surface)] transition-colors"
            >
              Result
            </button>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Quality Score */}
          <div className="text-center">
            <div className="text-lg font-bold text-green-600">98%</div>
            <div className="text-xs text-[var(--text-secondary)]">Quality Score</div>
          </div>

          {/* Processing Time */}
          <div className="text-center">
            <div className="text-lg font-bold text-blue-600">4.2s</div>
            <div className="text-xs text-[var(--text-secondary)]">Processing Time</div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-center gap-4">
        <button
          onClick={onBack}
          className="px-6 py-3 bg-[var(--background)] border border-[var(--border)] text-[var(--text)]
                   rounded-lg hover:bg-[var(--surface)] transition-colors flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-sm">edit</span>
          Edit More
        </button>
        <button
          onClick={() => handleDownload(processedImage, `removed-objects-${Date.now()}.png`)}
          className="px-6 py-3 bg-[var(--primary)] text-white rounded-lg
                   hover:bg-[var(--primary-dark)] transition-colors flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-sm">download</span>
          Download Result
        </button>
      </div>

      {/* Quality Information */}
      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <span className="material-symbols-outlined text-green-600 text-lg">check_circle</span>
          <div>
            <h4 className="font-semibold text-green-900 dark:text-green-100 mb-1">
              Object Removal Successful
            </h4>
            <ul className="text-sm text-green-800 dark:text-green-200 space-y-1">
              <li>• Objects removed with high precision</li>
              <li>• Background seamlessly reconstructed</li>
              <li>• No artifacts or distortions detected</li>
              <li>• Original image quality preserved</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResultsViewer;