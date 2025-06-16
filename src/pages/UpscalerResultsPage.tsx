import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';

const UpscalerResultsPage = () => {
  const navigate = useNavigate();
  const { state } = useLocation() as { state?: any };
  const [sliderValue, setSliderValue] = useState(50);
  const [originalDimensions, setOriginalDimensions] = useState({ width: 0, height: 0 });
  const [upscaledDimensions, setUpscaledDimensions] = useState({ width: 0, height: 0 });
  const [originalSize, setOriginalSize] = useState('0 MB');
  const [upscaledSize, setUpscaledSize] = useState('0 MB');

  const originalImage: string | undefined = state?.original;
  const upscaledImage: string | undefined = state?.upscaled;
  const scaleFactor: string | undefined = state?.scaleFactor;
  const model: string | undefined = state?.model;

  // If no state passed, redirect back to upload page
  useEffect(() => {
    if (!originalImage || !upscaledImage) {
      navigate('/upscaler', { replace: true });
      return;
    }

    // Get original image dimensions and size
    const originalImg = new Image();
    originalImg.onload = () => {
      setOriginalDimensions({ width: originalImg.naturalWidth, height: originalImg.naturalHeight });
      
      // Estimate file size based on dimensions (rough calculation)
      const originalPixels = originalImg.naturalWidth * originalImg.naturalHeight;
      const originalSizeMB = (originalPixels * 3) / (1024 * 1024); // 3 bytes per pixel estimate
      setOriginalSize(`${originalSizeMB.toFixed(1)} MB`);
    };
    originalImg.src = originalImage;

    // Get upscaled image dimensions and size
    const upscaledImg = new Image();
    upscaledImg.onload = () => {
      setUpscaledDimensions({ width: upscaledImg.naturalWidth, height: upscaledImg.naturalHeight });
      
      // Estimate upscaled file size
      const upscaledPixels = upscaledImg.naturalWidth * upscaledImg.naturalHeight;
      const upscaledSizeMB = (upscaledPixels * 3) / (1024 * 1024);
      setUpscaledSize(`${upscaledSizeMB.toFixed(1)} MB`);
    };
    upscaledImg.src = upscaledImage;
  }, [originalImage, upscaledImage, navigate]);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSliderValue(parseInt(e.target.value));
  };

  const downloadUpscaledImage = () => {
    if (!upscaledImage) return;
    
    const link = document.createElement('a');
    link.href = upscaledImage;
    link.download = `upscaled_${scaleFactor || '2x'}_image.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!originalImage || !upscaledImage) return null;

  return (
    <div className="relative flex min-h-screen flex-col overflow-x-hidden bg-[#101a23] text-[var(--text-primary)]">
      <div className="layout-container flex h-full grow flex-col">
        <Header />
        <main className="px-4 sm:px-10 md:px-20 lg:px-40 flex flex-1 justify-center py-12">
          <div className="layout-content-container flex flex-col items-center w-full max-w-4xl flex-1">
            <div className="text-center mb-8">
              <h2 className="text-4xl md:text-5xl font-bold mb-2 tracking-tighter">AI Upscaler Results</h2>
              <p className="text-lg md:text-xl text-[var(--text-secondary)]">
                Your image has been successfully upscaled! Compare and download below.
              </p>
            </div>

            {/* Image Comparison Section */}
            <div className="w-full bg-[var(--secondary-color)] p-6 sm:p-8 rounded-xl shadow-xl mb-8">
              <div className="relative overflow-hidden rounded-xl shadow-lg">
                {/* Upscaled image (background) */}
                <img 
                  src={upscaledImage} 
                  alt="Upscaled Image" 
                  className="block w-full h-auto object-cover"
                />
                
                {/* Original image overlay */}
                <div 
                  className="absolute top-0 left-0 h-full overflow-hidden border-r-2 border-[var(--primary-color)]"
                  style={{ width: `${sliderValue}%` }}
                >
                  <img 
                    src={originalImage} 
                    alt="Original Image" 
                    className="absolute left-0 top-0 h-full w-auto max-w-none object-cover"
                  />
                </div>

                {/* Slider handle */}
                <div 
                  className="absolute top-1/2 w-10 h-10 bg-[var(--primary-color)] rounded-full cursor-ew-resize flex items-center justify-center z-10 shadow-lg transform -translate-y-1/2"
                  style={{ left: `${sliderValue}%`, transform: `translate(-50%, -50%)` }}
                >
                  <span className="material-symbols-outlined text-white text-xl">compare_arrows</span>
                </div>

                {/* Invisible range input */}
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={sliderValue}
                  onChange={handleSliderChange}
                  className="absolute top-0 left-0 w-full h-full opacity-0 cursor-ew-resize z-20"
                  aria-label="Image comparison slider"
                />
              </div>

              <div className="mt-4 flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="flex items-center text-sm text-[var(--text-secondary)]">
                  <span className="material-symbols-outlined text-lg mr-1.5 text-[var(--primary-color)]">photo_library</span>
                  <span>Original</span>
                </div>
                <div className="flex items-center text-sm text-[var(--text-secondary)]">
                  <span className="material-symbols-outlined text-lg mr-1.5 text-[var(--accent-color-1)]">auto_awesome</span>
                  <span>Upscaled ({scaleFactor || '2x'})</span>
                </div>
              </div>
            </div>

            {/* Statistics Section */}
            <div className="w-full bg-[var(--secondary-color)] p-6 sm:p-8 rounded-xl shadow-xl mb-8">
              <h3 className="text-2xl font-semibold mb-4 text-center sm:text-left">Image Statistics</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 text-[var(--text-secondary)]">
                <div className="flex items-center">
                  <span className="material-symbols-outlined mr-3 text-[var(--primary-color)]">aspect_ratio</span>
                  <div>
                    <p className="text-sm font-medium">Original Dimensions:</p>
                    <p className="text-base text-[var(--text-primary)]">
                      {originalDimensions.width} x {originalDimensions.height} pixels
                    </p>
                  </div>
                </div>
                <div className="flex items-center">
                  <span className="material-symbols-outlined mr-3 text-[var(--accent-color-1)]">aspect_ratio</span>
                  <div>
                    <p className="text-sm font-medium">Upscaled Dimensions:</p>
                    <p className="text-base text-[var(--text-primary)]">
                      {upscaledDimensions.width} x {upscaledDimensions.height} pixels
                    </p>
                  </div>
                </div>
                <div className="flex items-center">
                  <span className="material-symbols-outlined mr-3 text-[var(--primary-color)]">image_search</span>
                  <div>
                    <p className="text-sm font-medium">Original Size:</p>
                    <p className="text-base text-[var(--text-primary)]">{originalSize}</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <span className="material-symbols-outlined mr-3 text-[var(--accent-color-1)]">image_search</span>
                  <div>
                    <p className="text-sm font-medium">Upscaled Size:</p>
                    <p className="text-base text-[var(--text-primary)]">{upscaledSize}</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <span className="material-symbols-outlined mr-3 text-[var(--accent-color-2)]">model_training</span>
                  <div>
                    <p className="text-sm font-medium">Model Used:</p>
                    <p className="text-base text-[var(--text-primary)]">{model || 'Real-ESRGAN'}</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <span className="material-symbols-outlined mr-3 text-[var(--accent-color-4)]">timer</span>
                  <div>
                    <p className="text-sm font-medium">Scale Factor:</p>
                    <p className="text-base text-[var(--text-primary)]">{scaleFactor || '2x'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="w-full flex flex-col sm:flex-row gap-4">
              <button 
                onClick={downloadUpscaledImage}
                className="flex-1 flex items-center justify-center gap-2 rounded-lg h-12 px-6 bg-[var(--primary-color)] text-white text-base font-bold tracking-wide hover:bg-blue-600 transition-colors"
              >
                <span className="material-symbols-outlined">download</span>
                <span>Download Upscaled Image</span>
              </button>
              <button 
                onClick={() => navigate('/upscaler')}
                className="flex-1 flex items-center justify-center gap-2 rounded-lg h-12 px-6 bg-transparent border-2 border-[var(--primary-color)] text-[var(--primary-color)] text-base font-bold tracking-wide hover:bg-[var(--primary-color)] hover:text-white transition-colors"
              >
                <span className="material-symbols-outlined">add_photo_alternate</span>
                <span>Upscale Another Image</span>
              </button>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
};

export default UpscalerResultsPage; 