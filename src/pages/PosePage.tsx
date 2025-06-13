import { useState, useRef, useEffect } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';

interface Keypoint { x: number; y: number; score: number | undefined; name?: string; }

const POSE_CONNECTIONS: [number, number][] = [
  [5, 7], [7, 9], // left arm
  [6, 8], [8, 10], // right arm
  [5, 6], // shoulders
  [5, 11], [6, 12], // torso
  [11, 13], [13, 15], // left leg
  [12, 14], [14, 16], // right leg
  [11, 12], // hips
];

const PosePage = () => {
  const [uiState, setUiState] = useState<'idle' | 'loading_model' | 'processing' | 'output' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [poses, setPoses] = useState<any[]>([]);
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    workerRef.current = new Worker(new URL('../workers/pose.worker.ts', import.meta.url), { type: 'module' });

    workerRef.current.onmessage = (e: MessageEvent) => {
      const { status, error, poses } = e.data;
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
          setUiState('output');
          setPoses(poses);
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
  }, []);

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
        workerRef.current?.postMessage({ command: 'estimate', imageData });
      };
      img.src = ev.target?.result as string;
      setImagePreview(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const drawSkeleton = (ctx: CanvasRenderingContext2D, keypoints: Keypoint[]) => {
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#0c7ff2';
    POSE_CONNECTIONS.forEach(([i, j]) => {
      const kp1 = keypoints[i];
      const kp2 = keypoints[j];
      if (kp1 && kp2 && (kp1.score ?? 0) > 0.3 && (kp2.score ?? 0) > 0.3) {
        ctx.beginPath();
        ctx.moveTo(kp1.x, kp1.y);
        ctx.lineTo(kp2.x, kp2.y);
        ctx.stroke();
      }
    });
  };

  useEffect(() => {
    if (uiState === 'output' && poses.length && imagePreview) {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0);
        drawSkeleton(ctx, poses[0].keypoints);
        setImagePreview(canvas.toDataURL('image/png'));
      };
      img.src = imagePreview;
    }
  }, [uiState]);

  const handleGenerate = () => {
    // nothing extra; estimation happens on upload
  };

  return (
    <div className="relative flex min-h-screen flex-col overflow-x-hidden">
      <div className="layout-container flex h-full grow flex-col">
        <Header />
        <main className="px-4 sm:px-6 md:px-10 flex flex-1 justify-center py-12">
          <div className="layout-content-container flex flex-col items-center max-w-3xl flex-1 w-full">
            <div className="text-center mb-10">
              <h2 className="text-3xl md:text-4xl font-bold mb-3 tracking-tight text-[var(--text-primary)]">Pose Estimation</h2>
              <p className="text-md md:text-lg text-[var(--text-secondary)] max-w-xl mx-auto">
                Upload an image to detect and visualize human poses using our MoveNet Lightning model.
              </p>
            </div>

            <div className="w-full bg-[var(--secondary-color)] rounded-xl shadow-xl p-6 md:p-8 space-y-6">
              {/* Upload area / result */}
              {uiState !== 'output' && (
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2" htmlFor="image-upload">Upload Image</label>
                  <div className="mt-1 flex justify-center px-6 pt-10 pb-12 border-2 border-[var(--input-background)] border-dashed rounded-md hover:border-[var(--primary-color)] transition-colors duration-150">
                    <div className="space-y-1 text-center">
                      <span className="material-symbols-outlined text-5xl text-[var(--text-secondary)]">cloud_upload</span>
                      <div className="flex text-sm text-[var(--text-secondary)]">
                        <label htmlFor="file-upload" className="relative cursor-pointer bg-[var(--secondary-color)] rounded-md font-medium text-[var(--primary-color)] hover:text-blue-400 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-offset-[var(--secondary-color)] focus-within:ring-[var(--primary-color)]">
                          <span>Upload a file</span>
                          <input id="file-upload" name="file-upload" type="file" className="sr-only" accept="image/*" onChange={(e)=>{if(e.target.files) handleFile(e.target.files[0])}} />
                        </label>
                        <p className="pl-1">or drag and drop</p>
                      </div>
                      <p className="text-xs text-[var(--text-secondary)]">PNG, JPG, GIF up to 10MB</p>
                    </div>
                  </div>
                  {imagePreview && (
                    <img src={imagePreview} alt="preview" className="w-full rounded mt-6" />
                  )}
                </div>
              )}

              {uiState === 'output' && (
                <img src={imagePreview || ''} alt="Pose" className="w-full rounded" />
              )}

              {/* Footer area inside card */}
              {uiState === 'processing' && (
                <p className="text-center text-[var(--text-secondary)]">Processing...</p>
              )}
              {uiState === 'error' && (
                <p className="text-center text-red-500 text-sm">{errorMessage}</p>
              )}

              {uiState === 'output' ? (
                <button className="w-full flex items-center justify-center gap-2 rounded-lg h-12 px-6 bg-[var(--primary-color)] text-white text-base font-semibold tracking-wide hover:bg-blue-600 transition-colors duration-150" type="button" onClick={()=>setUiState('idle')}>
                  <span className="material-symbols-outlined">restart_alt</span>
                  New Image
                </button>
              ) : (
                <button className="w-full flex items-center justify-center gap-2 rounded-lg h-12 px-6 bg-[var(--primary-color)] text-white text-base font-semibold tracking-wide hover:bg-blue-600 transition-colors duration-150" type="button" disabled={uiState==='processing' || !imagePreview} onClick={handleGenerate}>
                  <span className="material-symbols-outlined">auto_awesome</span>
                  {uiState==='loading_model' ? 'Loading model…' : uiState==='processing' ? 'Estimating…' : 'Estimate Pose'}
                </button>
              )}
            </div>
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
};

export default PosePage; 