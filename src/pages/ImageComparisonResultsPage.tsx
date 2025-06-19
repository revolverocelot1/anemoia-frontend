import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { motion } from 'framer-motion';
import LoadingOverlay from '../components/LoadingOverlay';
import { FaArrowLeft, FaExclamationTriangle, FaCheckCircle, FaThumbsUp, FaEye } from 'react-icons/fa';

// Define the structure of the results we expect from the worker
interface AnalysisResults {
  stats: {
    mismatchedPixels?: number;
    differencesFound?: number;
    mse?: number;
    ssim?: number;
    imageWidth?: number;
    imageHeight?: number;
  };
  annotations?: {
    diffImageData: ImageData;
    differences: BoundingBox[];
  };
  ocr?: {
    image1: string;
    image2: string;
  };
  classification?: {
    image1: ClassificationResult[];
    image2: ClassificationResult[];
  };
}

interface BoundingBox {
  id: number;
  x: number;
  y: number;
  w: number;
  h: number;
  area: number;
}

interface ClassificationResult {
  className: string;
  probability: number;
}

// Helper functions for stats interpretation
const getSsimAnalysis = (ssimValue: number) => {
  if (ssimValue > 0.99) return { level: 'Identical', color: 'text-green-400', icon: <FaCheckCircle /> };
  if (ssimValue > 0.95) return { level: 'Very High Similarity', color: 'text-green-500', icon: <FaThumbsUp /> };
  if (ssimValue > 0.85) return { level: 'High Similarity', color: 'text-yellow-400', icon: <FaEye /> };
  if (ssimValue > 0.7) return { level: 'Moderate Similarity', color: 'text-orange-400', icon: <FaExclamationTriangle /> };
  return { level: 'Low Similarity', color: 'text-red-500', icon: <FaExclamationTriangle /> };
};

const getMseAnalysis = (mseValue: number) => {
  if (mseValue < 10) return { level: 'Very Low Difference', color: 'text-green-400', icon: <FaCheckCircle /> };
  if (mseValue < 100) return { level: 'Low Difference', color: 'text-green-500', icon: <FaThumbsUp /> };
  if (mseValue < 500) return { level: 'Noticeable Difference', color: 'text-yellow-400', icon: <FaEye /> };
  if (mseValue < 1500) return { level: 'Significant Difference', color: 'text-orange-400', icon: <FaExclamationTriangle /> };
  return { level: 'Very High Difference', color: 'text-red-500', icon: <FaExclamationTriangle /> };
};

const getMismatchAnalysis = (mismatchPercent: number) => {
  if (mismatchPercent < 0.1) return { level: 'Negligible Mismatch', color: 'text-green-400', icon: <FaCheckCircle /> };
  if (mismatchPercent < 1) return { level: 'Very Low Mismatch', color: 'text-green-500', icon: <FaThumbsUp /> };
  if (mismatchPercent < 5) return { level: 'Low Mismatch', color: 'text-yellow-400', icon: <FaEye /> };
  if (mismatchPercent < 15) return { level: 'Moderate Mismatch', color: 'text-orange-400', icon: <FaExclamationTriangle /> };
  return { level: 'High Mismatch', color: 'text-red-500', icon: <FaExclamationTriangle /> };
};

const ImageComparisonResultsPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { image1, image2, settings } = location.state || {};

  const [results, setResults] = useState<AnalysisResults | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState('Initializing...');
  const [error, setError] = useState<string | null>(null);

  const workerRef = useRef<Worker | null>(null);
  const annotatedCanvasRef = useRef<HTMLCanvasElement>(null);
  const image2Ref = useRef<HTMLImageElement>(new Image());

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
    const effectiveSettings = settings || {
        enableAnnotations: true,
        enableOcr: false,
        enableClassification: false,
        normalizeRatio: true,
    };

    // Set image source to trigger load
    image2Ref.current.src = image2;

    // Start the analysis only after the image is loaded
    image2Ref.current.onload = () => {
      setLoadingMessage('Starting analysis...');
      workerRef.current?.postMessage({
        image1: image1,
        image2: image2,
        settings: effectiveSettings,
      });
    };

    // Cleanup function to terminate the worker when the component unmounts
    return () => {
      workerRef.current?.terminate();
    };
  }, [image1, image2, settings, navigate]);

  // Effect to draw the annotated canvas once results are available
  useEffect(() => {
    if (results?.annotations && annotatedCanvasRef.current && image2Ref.current.complete) {
      const canvas = annotatedCanvasRef.current;
      const ctx = canvas.getContext('2d');
      const { differences } = results.annotations;
      const img = image2Ref.current;

      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      
      if (ctx) {
        // Draw the "Edited" image as the base
        ctx.drawImage(img, 0, 0);

        // Draw the bounding boxes and numbers
        ctx.strokeStyle = '#FF00FF'; // A vibrant magenta
        ctx.lineWidth = Math.max(2, Math.min(img.width, img.height) * 0.005);
        ctx.fillStyle = '#FF00FF';
        const fontSize = Math.max(16, Math.min(img.width, img.height) * 0.02);
        ctx.font = `bold ${fontSize}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        differences.forEach(d => {
          ctx.strokeRect(d.x, d.y, d.w, d.h);
          // Draw a filled circle for the number background
          const centerX = d.x + d.w / 2;
          const centerY = d.y + d.h / 2;
          ctx.beginPath();
          ctx.arc(centerX, centerY, fontSize * 0.8, 0, 2 * Math.PI, false);
          ctx.fill();
          ctx.fillStyle = '#FFFFFF'; // White text
          ctx.fillText(String(d.id), centerX, centerY);
          ctx.fillStyle = '#FF00FF'; // Reset for next circle
        });
      }
    }
  }, [results]);

  if (loading) {
    return <LoadingOverlay message={loadingMessage} />;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white p-4">
        <h2 className="text-2xl font-bold text-red-500 mb-4">Analysis Failed</h2>
        <p className="text-lg mb-8 text-center">{error}</p>
        <button
          onClick={() => navigate('/compare')}
          className="flex items-center px-6 py-3 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition-colors shadow-lg"
        >
          <FaArrowLeft className="mr-2" />
          Try Again
        </button>
      </div>
    );
  }

  if (!results) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white p-4">
        <h2 className="text-2xl font-bold text-yellow-400 mb-4">No Results</h2>
        <p className="text-lg mb-8 text-center">Could not retrieve analysis results.</p>
        <button
          onClick={() => navigate('/compare')}
          className="flex items-center px-6 py-3 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition-colors shadow-lg"
        >
          <FaArrowLeft className="mr-2" />
          Start New Comparison
        </button>
      </div>
    );
  }

  const { stats, ocr, annotations } = results;
  const mismatchPercent = stats.mismatchedPixels && stats.imageWidth && stats.imageHeight 
      ? (stats.mismatchedPixels / (stats.imageWidth * stats.imageHeight)) * 100 
      : 0;

  const ssimAnalysis = stats.ssim ? getSsimAnalysis(stats.ssim) : null;
  const mseAnalysis = stats.mse ? getMseAnalysis(stats.mse) : null;
  const mismatchAnalysis = mismatchPercent ? getMismatchAnalysis(mismatchPercent) : null;

  return (
    <div className="bg-[#121212] text-white min-h-screen">
       <Header />
       <main className="px-4 sm:px-6 lg:px-8 py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">Comparison Results</h2>
                <button
                    onClick={() => navigate('/compare')}
                    className="flex items-center px-6 py-3 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition-colors shadow-lg"
                >
                    <FaArrowLeft className="mr-2" />
                    Start New Comparison
                </button>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
              
              {/* Left Column: Annotated Image */}
              <div className="lg:col-span-3 bg-[#1E1E1E] p-4 rounded-lg shadow-2xl">
                <h3 className="text-xl font-semibold mb-4 text-center">Edited Image with Differences</h3>
                <div className="relative w-full">
                  <canvas ref={annotatedCanvasRef} className="w-full h-auto rounded-lg shadow-lg"></canvas>
                </div>
              </div>

              {/* Right Column: Stats */}
              <div className="lg:col-span-2 space-y-6">
                {ssimAnalysis && stats.ssim && (
                  <StatCard title="Structural Similarity (SSIM)" value={stats.ssim.toFixed(5)} analysis={ssimAnalysis}>
                    Measures the perceptual difference between two images. A value of 1.0 means they are structurally identical.
                  </StatCard>
                )}
                {mseAnalysis && stats.mse && (
                  <StatCard title="Mean Squared Error (MSE)" value={stats.mse.toFixed(4)} analysis={mseAnalysis}>
                    Calculates the average squared difference between pixels. Lower values indicate higher similarity. A value of 0 means they are identical.
                  </StatCard>
                )}
                {mismatchAnalysis && (
                  <StatCard title="Mismatched Pixels" value={`${mismatchPercent.toFixed(3)}%`} analysis={mismatchAnalysis}>
                    Represents the percentage of pixels that are different between the two images, based on a sensitivity threshold.
                  </StatCard>
                )}
                {typeof stats.differencesFound === 'number' && (
                  <StatCard title="Distinct Difference Regions" value={stats.differencesFound} analysis={{ level: `${stats.differencesFound > 0 ? 'Detected' : 'None'}`, color: `${stats.differencesFound > 0 ? 'text-yellow-400' : 'text-green-400'}`, icon: <FaEye /> }}>
                    The number of separate, contiguous areas where differences were detected by the algorithm.
                  </StatCard>
                )}
              </div>
            </div>
            
            {/* OCR and Difference Details Sections */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
              {ocr && (
                <ResultsSection title="Extracted Text (OCR)">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <OcrResult title="Original Image" text={ocr.image1} />
                    <OcrResult title="Edited Image" text={ocr.image2} />
                  </div>
                </ResultsSection>
              )}
              
              {results.classification && (
                <ResultsSection title="AI Image Classification">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <ClassificationResultDisplay title="Original Image" data={results.classification.image1} />
                      <ClassificationResultDisplay title="Edited Image" data={results.classification.image2} />
                   </div>
                   <p className="text-xs text-gray-500 mt-4">
                    <strong>How this works:</strong> An AI model (EfficientNet B0) pre-trained on the ImageNet dataset analyzes each image and predicts the most likely objects it contains. This provides a high-level understanding of the image content.
                  </p>
                </ResultsSection>
              )}

              {annotations && annotations.differences.length > 0 && (
                <ResultsSection title="Difference Details">
                  <div className="space-y-2 text-sm max-h-60 overflow-y-auto pr-2">
                      {annotations.differences.map((d: BoundingBox) => (
                          <p key={d.id} className="text-gray-300 p-2 bg-gray-800/50 rounded">
                              <span className="font-bold text-[#FF00FF]">Difference {d.id}:</span> Area of {d.area} pixels at ({d.x}, {d.y}) with size {d.w}x{d.h}.
                          </p>
                      ))}
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
  <div className="bg-[#1E1E1E] p-6 rounded-lg shadow-2xl">
    <h3 className="text-xl font-bold mb-4">{title}</h3>
    {children}
  </div>
);

interface StatCardProps {
    title: string;
    value: string | number;
    analysis: { level: string; color: string; icon: JSX.Element; };
    children: React.ReactNode;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, analysis, children }) => (
  <div className="bg-[#1E1E1E] p-5 rounded-lg shadow-2xl border-l-4 border-indigo-500">
    <h4 className="text-lg font-semibold text-gray-300">{title}</h4>
    <div className="text-4xl font-bold my-2 text-white">{value}</div>
    <div className={`flex items-center font-semibold text-lg ${analysis.color}`}>
      {analysis.icon}
      <span className="ml-2">{analysis.level}</span>
    </div>
    <p className="text-gray-400 mt-3 text-sm">{children}</p>
  </div>
);

const OcrResult: React.FC<{ title: string, text: string }> = ({ title, text }) => (
  <div className="bg-gray-800/50 p-4 rounded-lg h-full">
    <h4 className="font-bold text-lg mb-2 text-gray-300">{title}</h4>
    <p className="text-gray-400 whitespace-pre-wrap text-sm">{text || '(No text detected)'}</p>
  </div>
);

const ClassificationResultDisplay: React.FC<{ title: string; data: ClassificationResult[] }> = ({ title, data }) => (
  <div className="bg-gray-800/50 p-4 rounded-lg">
    <h4 className="font-bold text-lg mb-2 text-gray-300">{title}</h4>
    <ul className="space-y-2">
      {data && data.length > 0 ? (
        data.map((item, index) => (
          <li key={index} className="flex justify-between items-center text-sm">
            <span className="text-gray-300">{item.className}</span>
            <span className="font-mono text-cyan-400">{(item.probability * 100).toFixed(1)}%</span>
          </li>
        ))
      ) : (
        <p className="text-gray-400 text-sm">No classification data.</p>
      )}
    </ul>
  </div>
);

export default ImageComparisonResultsPage; 