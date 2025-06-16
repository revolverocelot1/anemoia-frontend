import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';

type ScaleFactor = '2x' | '4x' | '8x';

const UpscalerPage = () => {
  const [uiState, setUiState] = useState<'idle' | 'loading_model' | 'processing' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [originalPreview, setOriginalPreview] = useState<string | null>(null);
  const [scaleFactor, setScaleFactor] = useState<ScaleFactor>('2x');
  const originalPreviewRef = useRef<string | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Initialize upscaler worker (placeholder for now)
    workerRef.current = new Worker(new URL('../workers/upscaler.worker.ts', import.meta.url), { type: 'module' });

    workerRef.current.onmessage = (e: MessageEvent) => {
      const { status, error, upscaledImage } = e.data;
      switch (status) {
        case 'loading_model':
          setUiState('loading_model');
          break;
        case 'model_ready':
          setUiState('idle');
          break;
        case 'processing':
          setUiState('processing');
          break;
        case 'complete':
          const previewSrc = originalPreviewRef.current;
          if (!previewSrc) return;
          
          // Navigate to results page with original and upscaled images
          navigate('/upscaler/results', {
            state: {
              original: previewSrc,
              upscaled: upscaledImage,
              scaleFactor,
              model: 'Real-ESRGAN',
            }
          });
          break;
        case 'error':
          setUiState('error');
          setErrorMessage(error);
          break;
      }
    };

    return () => {
      workerRef.current?.terminate();
    };
  }, [navigate, scaleFactor]);

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, img.width, img.height);
        
        // Send to worker for upscaling
        workerRef.current?.postMessage({ 
          command: 'upscale', 
          imageData, 
          scaleFactor: parseInt(scaleFactor.replace('x', ''))
        });
      };
      const dataUrl = ev.target?.result as string;
      setOriginalPreview(dataUrl);
      originalPreviewRef.current = dataUrl;
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  const handleUpscale = () => {
    if (!originalPreview) return;
    
    // Trigger upscaling process
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, img.width, img.height);
      
      workerRef.current?.postMessage({ 
        command: 'upscale', 
        imageData, 
        scaleFactor: parseInt(scaleFactor.replace('x', ''))
      });
    };
    img.src = originalPreview;
  };

  return (
    <div className="relative flex min-h-screen flex-col overflow-x-hidden bg-[#101a23] text-[var(--text-primary)]">
      <div className="layout-container flex h-full grow flex-col">
        <Header />
        <main className="px-10 md:px-20 lg:px-40 flex flex-1 justify-center py-12">
          <div className="layout-content-container flex flex-col items-center max-w-2xl flex-1 w-full">
            <div className="text-center mb-12">
              <h2 className="text-4xl md:text-5xl font-bold mb-4 tracking-tighter text-[var(--text-primary)]">AI Upscaler</h2>
              <p className="text-lg md:text-xl text-[var(--text-secondary)] max-w-2xl mx-auto">
                Enhance your images with our AI-powered upscaler using Real-ESRGAN. Upload your photo and choose a scale factor to begin.
              </p>
            </div>

            <div className="w-full bg-[var(--secondary-color)] p-8 rounded-xl shadow-xl space-y-6">
              {/* Upload area */}
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2" htmlFor="image-upload">Upload Image</label>
                <div 
                  className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-[var(--text-secondary)] border-dashed rounded-md cursor-pointer hover:border-[var(--primary-color)] transition-colors"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                      handleFile(e.dataTransfer.files[0]);
                    }
                  }}
                >
                  <div className="space-y-1 text-center">
                    <span className="material-symbols-outlined text-5xl text-[var(--text-secondary)]">cloud_upload</span>
                    <div className="flex text-sm text-[var(--text-secondary)]">
                      <label htmlFor="image-upload" className="relative bg-[var(--secondary-color)] rounded-md font-medium text-[var(--primary-color)] hover:text-blue-400 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-offset-gray-800 focus-within:ring-blue-500 cursor-pointer">
                        <span>Upload a file</span>
                        <input 
                          className="sr-only" 
                          id="image-upload" 
                          name="image-upload" 
                          type="file" 
                          accept="image/*"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              handleFile(e.target.files[0]);
                            }
                          }}
                        />
                      </label>
                      <p className="pl-1">or drag and drop</p>
                    </div>
                    <p className="text-xs text-[var(--text-secondary)]">PNG, JPG, GIF up to 10MB</p>
                  </div>
                </div>
                {originalPreview && (
                  <img src={originalPreview} alt="preview" className="w-full rounded mt-6" />
                )}
              </div>

              {/* Scale factor selection */}
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Scale Factor</label>
                <div className="grid grid-cols-3 gap-4">
                  {(['2x', '4x', '8x'] as ScaleFactor[]).map((factor) => (
                    <button
                      key={factor}
                      onClick={() => setScaleFactor(factor)}
                      className={`py-3 px-4 rounded-lg border-2 transition-colors font-medium ${
                        scaleFactor === factor
                          ? 'border-[var(--primary-color)] bg-[var(--primary-color)] text-white'
                          : 'border-gray-600 text-[var(--text-secondary)] hover:border-[var(--primary-color)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      {factor} Scale
                    </button>
                  ))}
                </div>
                <p className="text-xs text-[var(--text-secondary)] mt-2">
                  Higher scale factors will take longer to process and produce larger files.
                </p>
              </div>

              {/* Processing status */}
              {uiState === 'loading_model' && (
                <p className="text-center text-[var(--text-secondary)]">Loading AI model...</p>
              )}
              {uiState === 'processing' && (
                <p className="text-center text-[var(--text-secondary)]">Upscaling image... This may take a few moments.</p>
              )}
              {uiState === 'error' && (
                <p className="text-center text-red-500 text-sm">{errorMessage}</p>
              )}

              {/* Upscale button */}
              <button 
                className="w-full flex items-center justify-center gap-2 rounded-lg h-12 px-6 bg-[var(--primary-color)] text-white text-base font-bold tracking-wide hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" 
                type="button"
                disabled={uiState === 'processing' || uiState === 'loading_model' || !originalPreview}
                onClick={handleUpscale}
              >
                <span className="material-symbols-outlined">auto_awesome</span>
                <span>
                  {uiState === 'loading_model' ? 'Loading Model...' : 
                   uiState === 'processing' ? 'Upscaling...' : 
                   `Upscale Image (${scaleFactor})`}
                </span>
              </button>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
};

export default UpscalerPage; 