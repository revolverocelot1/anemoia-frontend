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
        <main className="px-10 md:px-20 lg:px-40 flex flex-1 justify-center py-12">
          <div className="layout-content-container flex flex-col items-center max-w-3xl flex-1 w-full">
            {uiState === 'idle' || uiState === 'processing' ? (
              <div className="w-full bg-[var(--secondary-color)] rounded-xl shadow-lg p-8 space-y-6">
                <input type="file" accept="image/*" onChange={(e)=>{if(e.target.files) handleFile(e.target.files[0])}} className="block w-full text-sm text-gray-300" />
                {imagePreview && <img src={imagePreview} alt="preview" className="w-full rounded" />}
                {uiState==='processing' && <p className="text-center text-[var(--text-secondary)]">Processing...</p>}
              </div>
            ): uiState==='output' ? (
              <div className="w-full bg-[var(--secondary-color)] rounded-xl shadow-lg p-8 space-y-6">
                <img src={imagePreview || ''} alt="Pose" className="w-full rounded" />
                <button className="button" onClick={()=>setUiState('idle')}>New Image</button>
              </div>
            ): (
              <p className="text-red-500">{errorMessage}</p>
            )}
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
};

export default PosePage; 