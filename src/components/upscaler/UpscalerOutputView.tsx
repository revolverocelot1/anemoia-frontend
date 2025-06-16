import React from 'react';

interface UpscalerOutputViewProps {
  originalImageFile: File; // Or URL string if preferred
  upscaledImageUrl: string;
  onReset: () => void;
  // Add props for stats etc.
}

const UpscalerOutputView: React.FC<UpscalerOutputViewProps> = ({
  originalImageFile,
  upscaledImageUrl,
  onReset,
}) => {
  const originalImageUrl = URL.createObjectURL(originalImageFile);

  return (
    <div className="w-full">
      <h2 className="text-3xl font-bold text-center mb-8 text-[var(--text-primary)]">AI Upscaler - Output</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h3 className="text-xl text-center text-[var(--text-secondary)] mb-2">Original</h3>
          <img src={originalImageUrl} alt="Original" className="max-w-full h-auto rounded-lg" />
        </div>
        <div>
          <h3 className="text-xl text-center text-[var(--text-secondary)] mb-2">Upscaled</h3>
          <img src={upscaledImageUrl} alt="Upscaled" className="max-w-full h-auto rounded-lg" />
        </div>
      </div>
      <button onClick={onReset} className="button mt-8 mx-auto block">Upscale Another Image</button>
      <p className="text-center mt-4 text-[var(--text-secondary)]">
        (This is a placeholder output view. It will be updated with the provided HTML template, including comparison slider.)
      </p>
    </div>
  );
};

export default UpscalerOutputView;
