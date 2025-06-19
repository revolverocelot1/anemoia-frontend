import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { motion } from 'framer-motion';
import LoadingOverlay from '../components/LoadingOverlay';

// Define the structure of the results we expect from the worker
interface AnalysisResults {
  stats: {
    mismatchedPixels?: number;
    differencesFound?: number;
    mse?: number;
    ssim?: number;
    processingTime?: string;
  };
  annotations?: {
    diffImageData: ImageData;
    differences: any[];
  };
  ocr?: {
    image1: string;
    image2: string;
  };
  classification?: {
    image1: any[];
    image2: any[];
  };
}

const ImageComparisonResultsPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { image1, image2, enableAnnotations, enableOcr, enableClassification } = location.state || {};

  const [results, setResults] = useState<AnalysisResults | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState('Initializing...');
  const [error, setError] = useState<string | null>(null);
  const [showAnnotations, setShowAnnotations] = useState(true);

  const workerRef = useRef<Worker | null>(null);
  const diffCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    // If we land on this page without state, navigate back to the input page.
    if (!image1 || !image2) {
      navigate('/compare');
      return;
    }

    // Initialize the web worker
    workerRef.current = new Worker(new URL('../workers/comparison.worker.ts', import.meta.url), {
      type: 'module',
    });

    // Handle messages from the worker
    workerRef.current.onmessage = (event: MessageEvent) => {
      const { type, payload } = event.data;
      switch (type) {
        case 'progress':
          setLoadingMessage(payload.message);
          break;
        case 'results':
          setResults(payload);
          setLoading(false);
          break;
        case 'error':
          setError(payload);
          setLoading(false);
          break;
      }
    };

    // Handle any errors from the worker itself
    workerRef.current.onerror = (err) => {
      console.error("Worker error:", err);
      setError(`An unexpected worker error occurred: ${err.message}`);
      setLoading(false);
    };
    
    // Start the analysis
    setLoadingMessage('Starting analysis...');
    workerRef.current.postMessage({
      image1: image1,
      image2: image2,
      settings: { enableAnnotations, enableOcr, enableClassification },
    });

    // Cleanup function to terminate the worker when the component unmounts
    return () => {
      workerRef.current?.terminate();
    };
  }, [image1, image2, enableAnnotations, enableOcr, enableClassification, navigate]);

  // Effect to draw the diff canvas once results are available
  useEffect(() => {
    if (results?.annotations && diffCanvasRef.current) {
      const canvas = diffCanvasRef.current;
      const ctx = canvas.getContext('2d');
      const { diffImageData, differences } = results.annotations;

      canvas.width = diffImageData.width;
      canvas.height = diffImageData.height;
      
      if (ctx) {
        // Draw the base diff image
        ctx.putImageData(diffImageData, 0, 0);

        // If annotations are enabled, draw the bounding boxes and numbers
        if (showAnnotations) {
          ctx.strokeStyle = 'magenta';
          ctx.lineWidth = 2;
          ctx.fillStyle = 'magenta';
          ctx.font = 'bold 16px Arial';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';

          differences.forEach(d => {
            ctx.strokeRect(d.x, d.y, d.w, d.h);
            ctx.fillText(String(d.id), d.x + d.w / 2, d.y + d.h / 2);
          });
        }
      }
    }
  }, [results, showAnnotations]);


  if (loading) {
    return <LoadingOverlay message={loadingMessage} />;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white p-4">
        <h2 className="text-2xl font-bold text-red-500 mb-4">Analysis Failed</h2>
        <p className="text-lg mb-4 text-center">{error}</p>
        <button
          onClick={() => navigate('/compare')}
          className="px-6 py-2 bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="bg-[#121212] text-white min-h-screen">
       <Header />
       <main className="px-4 sm:px-8 md:px-16 lg:px-24 xl:px-40 py-8 sm:py-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <h2 className="text-3xl sm:text-4xl font-bold text-center mb-8">Comparison Results</h2>
            
            <section className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                <div>
                    <h3 className="text-xl font-semibold mb-4 text-center">Image 1</h3>
                    <img src={image1} alt="Original" className="rounded-lg shadow-lg w-full" />
                </div>
                <div>
                    <h3 className="text-xl font-semibold mb-4 text-center">Image 2</h3>
                    <img src={image2} alt="Comparison" className="rounded-lg shadow-lg w-full" />
                </div>
            </section>
            
            {results?.annotations && (
              <ResultsSection title="Difference Analysis">
                <div className="flex justify-center mb-4">
                    <label className="flex items-center cursor-pointer">
                        <span className="mr-3 text-lg">Show Annotations</span>
                        <div className="relative">
                            <input type="checkbox" className="sr-only" checked={showAnnotations} onChange={() => setShowAnnotations(!showAnnotations)} />
                            <div className="w-14 h-8 bg-gray-600 rounded-full shadow-inner"></div>
                            <div className={`dot absolute w-6 h-6 bg-white rounded-full shadow -left-1 -top-1 transition-transform ${showAnnotations ? 'transform translate-x-full bg-green-400' : ''}`}></div>
                        </div>
                    </label>
                </div>
                <canvas ref={diffCanvasRef} className="w-full rounded-lg shadow-lg"></canvas>
              </ResultsSection>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {results?.stats && (
                <ResultsSection title="Processing Statistics">
                  <StatItem label="Differences Found" value={results.stats.differencesFound ?? 'N/A'} />
                  <StatItem label="Mismatched Pixels" value={results.stats.mismatchedPixels?.toLocaleString() ?? 'N/A'} />
                  <StatItem label="Mean Squared Error (MSE)" value={results.stats.mse?.toFixed(6) ?? 'N/A'} />
                  <StatItem label="Structural Similarity (SSIM)" value={results.stats.ssim?.toFixed(6) ?? 'N/A'} />
                </ResultsSection>
              )}

              {results?.annotations && results.annotations.differences.length > 0 && (
                <ResultsSection title="Top 20 Differences (by size)">
                  <div className="space-y-2 text-sm max-h-80 overflow-y-auto">
                      {results.annotations.differences.map((d: any) => (
                          <p key={d.id} className="text-gray-300">
                              <span className="font-bold text-magenta-400">Difference {d.id}:</span> Box at ({d.x}, {d.y}), Size ({d.w} x {d.h}), Area ({d.area} pixels)
                          </p>
                      ))}
                  </div>
                </ResultsSection>
              )}

              {results?.ocr && (
                <ResultsSection title="OCR Text Extraction">
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <OcrResult title="Image 1 Text" text={results.ocr.image1} />
                      <OcrResult title="Image 2 Text" text={results.ocr.image2} />
                   </div>
                </ResultsSection>
              )}

              {results?.classification && (
                <ResultsSection title="Image Classification">
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <ClassificationResult title="Image 1 Classification" data={results.classification.image1} />
                      <ClassificationResult title="Image 2 Classification" data={results.classification.image2} />
                   </div>
                </ResultsSection>
              )}
            </div>
        </motion.div>
       </main>
       <Footer />
    </div>
  );
};

// Helper components for consistent styling
const ResultsSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="bg-[#1E1E1E] p-6 rounded-lg shadow-2xl mb-8">
    <h3 className="text-2xl font-bold mb-4">{title}</h3>
    {children}
  </div>
);

const StatItem: React.FC<{ label: string; value: string | number }> = ({ label, value }) => (
  <div className="flex justify-between items-center py-2 border-b border-gray-700">
    <p className="text-gray-300">{label}</p>
    <p className="font-mono text-lg text-green-400">{value}</p>
  </div>
);

const OcrResult: React.FC<{ title: string, text: string }> = ({ title, text }) => (
  <div>
    <h4 className="font-semibold mb-2">{title}</h4>
    <p className="text-sm bg-black/20 p-3 rounded-md text-gray-400 whitespace-pre-wrap">{text || 'No text detected.'}</p>
  </div>
);

const ClassificationResult: React.FC<{ title: string, data: any[] }> = ({ title, data }) => (
   <div>
    <h4 className="font-semibold mb-2">{title}</h4>
    <ul className="space-y-1">
      {data.map((item, index) => (
        <li key={index} className="flex justify-between text-sm">
          <span>{item.className}</span>
          <span className="font-mono text-cyan-400">{(item.probability * 100).toFixed(2)}%</span>
        </li>
      ))}
    </ul>
  </div>
);

export default ImageComparisonResultsPage; 