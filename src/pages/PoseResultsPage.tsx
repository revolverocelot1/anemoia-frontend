import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
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

const drawSkeleton = (ctx: CanvasRenderingContext2D, keypoints: Keypoint[]) => {
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#0c7ff2';

  // draw joints
  keypoints.forEach(kp => {
    if ((kp.score ?? 0) > 0.3) {
      ctx.beginPath();
      ctx.arc(kp.x, kp.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#34d399';
      ctx.fill();
    }
  });

  // draw limbs
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

const PoseResultsPage = () => {
  const navigate = useNavigate();
  const { state } = useLocation() as { state?: any };
  const [overlayURL, setOverlayURL] = useState<string | null>(state?.overlay ?? null);
  const [skeletonURL, setSkeletonURL] = useState<string | null>(state?.skeleton ?? null);

  const imageURL: string | undefined = state?.image;
  const poses: any[] | undefined = state?.poses;

  // If no state passed, redirect back to upload page
  useEffect(() => {
    if (!imageURL || !poses) {
      navigate('/pose-estimation', { replace: true });
      return;
    }

    // If overlay and skeleton already provided, skip generating
    if (overlayURL && skeletonURL) return;

    const img = new Image();
    img.onload = () => {
      const { width, height } = img;

      // Overlay canvas
      const overlayCanvas = document.createElement('canvas');
      overlayCanvas.width = width;
      overlayCanvas.height = height;
      const overlayCtx = overlayCanvas.getContext('2d')!;
      overlayCtx.drawImage(img, 0, 0);
      poses.forEach((p: any) => drawSkeleton(overlayCtx, p.keypoints));
      setOverlayURL(overlayCanvas.toDataURL('image/png'));

      // Skeleton-only canvas
      const skeletonCanvas = document.createElement('canvas');
      skeletonCanvas.width = width;
      skeletonCanvas.height = height;
      const skeletonCtx = skeletonCanvas.getContext('2d')!;
      skeletonCtx.fillStyle = 'black';
      skeletonCtx.fillRect(0, 0, width, height);
      poses.forEach((p: any) => drawSkeleton(skeletonCtx, p.keypoints));
      setSkeletonURL(skeletonCanvas.toDataURL('image/png'));
    };
    img.src = imageURL;
  }, [imageURL, poses, navigate]);

  if (!imageURL || !poses) return null;

  return (
    <div className="relative flex min-h-screen flex-col overflow-x-hidden bg-[var(--background-dark)] text-[var(--text-primary)]">
      <div className="layout-container flex h-full grow flex-col">
        <Header />
        <main className="px-4 sm:px-6 md:px-10 flex flex-1 justify-center py-12">
          <div className="layout-content-container flex flex-col items-center max-w-6xl flex-1 w-full">
            <div className="text-center mb-10">
              <h2 className="text-3xl md:text-4xl font-bold mb-3 tracking-tight">Pose Estimation Results</h2>
              <p className="text-md md:text-lg text-[var(--text-secondary)] max-w-xl mx-auto">
                Here are the results of the pose estimation. You can download the images or try a new estimation.
              </p>
            </div>

            <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 mb-10">
              {/* Original */}
              <div className="flex flex-col items-center bg-[var(--secondary-color)] rounded-xl shadow-xl p-6">
                <h3 className="text-lg font-semibold mb-4">Original Image</h3>
                <img src={imageURL} alt="Original input" className="rounded-lg aspect-square object-cover w-full" />
                <a href={imageURL} download="original.png" className="mt-6 w-full flex items-center justify-center gap-2 rounded-lg h-10 px-4 bg-[var(--input-background)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-sm font-medium transition-colors">
                  <span className="material-symbols-outlined text-base">download</span>
                  Download
                </a>
              </div>

              {/* Overlay */}
              <div className="flex flex-col items-center bg-[var(--secondary-color)] rounded-xl shadow-xl p-6">
                <h3 className="text-lg font-semibold mb-4">Pose Overlay</h3>
                {overlayURL && <img src={overlayURL} alt="Pose overlay" className="rounded-lg aspect-square object-cover w-full" />}
                {overlayURL && (
                  <a href={overlayURL} download="pose_overlay.png" className="mt-6 w-full flex items-center justify-center gap-2 rounded-lg h-10 px-4 bg-[var(--input-background)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-sm font-medium transition-colors">
                    <span className="material-symbols-outlined text-base">download</span>
                    Download
                  </a>
                )}
              </div>

              {/* Skeleton */}
              <div className="flex flex-col items-center bg-[var(--secondary-color)] rounded-xl shadow-xl p-6">
                <h3 className="text-lg font-semibold mb-4">Pose Representation</h3>
                {skeletonURL && <img src={skeletonURL} alt="Pose skeleton" className="rounded-lg aspect-square object-cover w-full bg-black" />}
                {skeletonURL && (
                  <a href={skeletonURL} download="pose_skeleton.png" className="mt-6 w-full flex items-center justify-center gap-2 rounded-lg h-10 px-4 bg-[var(--input-background)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-sm font-medium transition-colors">
                    <span className="material-symbols-outlined text-base">download</span>
                    Download
                  </a>
                )}
              </div>
            </div>

            {/* Keypoints JSON toggle */}
            <details className="w-full bg-[var(--input-background)] rounded-md p-4 text-[var(--text-secondary)] mb-8">
              <summary className="cursor-pointer text-sm font-medium text-[var(--text-primary)] mb-2">Show keypoints JSON</summary>
              <pre className="overflow-x-auto text-xs whitespace-pre-wrap">{JSON.stringify(poses, null, 2)}</pre>
            </details>

            <div className="w-full max-w-md mx-auto">
              <button onClick={() => navigate('/pose-estimation')} className="w-full flex items-center justify-center gap-2 rounded-lg h-12 px-6 bg-[var(--primary-color)] text-white text-base font-semibold tracking-wide hover:bg-blue-600 transition-colors">
                <span className="material-symbols-outlined">arrow_back</span>
                New Estimation
              </button>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
};

export default PoseResultsPage; 