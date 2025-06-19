import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import ImageSlider from '../components/ImageSlider';
import { motion } from 'framer-motion';
import LoadingOverlay from '../components/LoadingOverlay';
import { FaArrowLeft, FaExclamationTriangle, FaCheckCircle, FaThumbsUp, FaEye, FaSlidersH, FaChartBar, FaSearchPlus } from 'react-icons/fa';

// Define the structure of the results we expect from the worker
interface AnalysisResults {
  stats: {
    mismatchedPixels?: number;
    differencesFound?: number;
    mse?: number | null;
    ssim?: number | null;
    imageWidth?: number;
    imageHeight?: number;
    pixelDiffPercentage?: number;
  };
  annotations?: {
    diffImageData: ImageData | null;
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
  intensity?: number;
}

interface ClassificationResult {
  className: string;
  probability: number;
  bbox?: number[] | null;
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

// Helper function to safely format numbers
const formatNumber = (value: number | null | undefined, decimalPlaces: number): string => {
  if (value === null || value === undefined || isNaN(value)) {
    return 'N/A';
  }
  return value.toFixed(decimalPlaces);
};

const ImageComparisonResultsPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { image1, image2, settings } = location.state || {};

  const [results, setResults] = useState<AnalysisResults | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState('Initializing...');
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'slider' | 'annotations' | 'analysis'>('slider');

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
        enableOcr: true,
        enableClassification: true,
        normalizeAspectRatio: true,
    };

    // Set image source to trigger load
    image2Ref.current.src = image2;

    // Start the analysis only after the image is loaded
    image2Ref.current.onload = () => {
      setLoadingMessage('Starting comprehensive analysis...');
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
      
      if (ctx && differences && differences.length > 0) {
        // Draw the "Edited" image as the base
        ctx.drawImage(img, 0, 0);

        // Draw the bounding boxes and numbers with better styling
        differences.forEach((d) => {
          // Use different colors for different intensity levels
          const intensityRatio = (d.intensity || 50) / 255;
          const hue = Math.max(0, (1 - intensityRatio) * 120); // Green to red based on intensity
          ctx.strokeStyle = `hsl(${hue}, 80%, 50%)`;
          ctx.fillStyle = `hsla(${hue}, 80%, 50%, 0.3)`;
          
          ctx.lineWidth = Math.max(2, Math.min(img.width, img.height) * 0.003);
          
          // Draw filled rectangle for better visibility
          ctx.fillRect(d.x, d.y, d.w, d.h);
          ctx.strokeRect(d.x, d.y, d.w, d.h);
          
          // Draw a filled circle for the number background
          const centerX = d.x + d.w / 2;
          const centerY = d.y + d.h / 2;
          const fontSize = Math.max(14, Math.min(img.width, img.height) * 0.015);
          
          ctx.font = `bold ${fontSize}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          
          // White circle background
          ctx.fillStyle = '#FFFFFF';
          ctx.beginPath();
          ctx.arc(centerX, centerY, fontSize * 0.8, 0, 2 * Math.PI, false);
          ctx.fill();
          
          // Black text
          ctx.fillStyle = '#000000';
          ctx.fillText(String(d.id), centerX, centerY);
        });
      } else if (ctx) {
        // Just draw the image without annotations
        ctx.drawImage(img, 0, 0);
      }
    }
  }, [results, activeTab]);

  if (loading) {
    return <LoadingOverlay message={loadingMessage} />;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white p-4">
        <h2 className="text-2xl font-bold text-red-500 mb-4">Analysis Failed</h2>
        <p className="text-lg mb-8 text-center max-w-md">{error}</p>
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
  const mismatchPercent = stats.pixelDiffPercentage || 0;

  const ssimAnalysis = (stats.ssim !== null && stats.ssim !== undefined) ? getSsimAnalysis(stats.ssim) : null;
  const mseAnalysis = (stats.mse !== null && stats.mse !== undefined) ? getMseAnalysis(stats.mse) : null;
  const mismatchAnalysis = mismatchPercent > 0 ? getMismatchAnalysis(mismatchPercent) : null;

  return (
    <div className="bg-[#121212] text-white min-h-screen">
       <Header />
       <main className="px-4 sm:px-6 lg:px-8 py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">Advanced Image Comparison Results</h2>
                <button
                    onClick={() => navigate('/compare')}
                    className="flex items-center px-6 py-3 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition-colors shadow-lg"
                >
                    <FaArrowLeft className="mr-2" />
                    New Comparison
                </button>
            </div>
            
            {/* Tab Navigation */}
            <div className="flex flex-wrap gap-2 mb-8 bg-[#1E1E1E] p-1 rounded-lg">
              <button
                onClick={() => setActiveTab('slider')}
                className={`flex items-center px-4 py-2 rounded-md transition-colors ${
                  activeTab === 'slider' ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:text-white hover:bg-gray-700'
                }`}
              >
                <FaSlidersH className="mr-2" />
                Interactive Comparison
              </button>
              <button
                onClick={() => setActiveTab('annotations')}
                className={`flex items-center px-4 py-2 rounded-md transition-colors ${
                  activeTab === 'annotations' ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:text-white hover:bg-gray-700'
                }`}
              >
                <FaSearchPlus className="mr-2" />
                Difference Analysis
              </button>
              <button
                onClick={() => setActiveTab('analysis')}
                className={`flex items-center px-4 py-2 rounded-md transition-colors ${
                  activeTab === 'analysis' ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:text-white hover:bg-gray-700'
                }`}
              >
                <FaChartBar className="mr-2" />
                Statistical Analysis
              </button>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
              
              {/* Left Column: Main Content */}
              <div className="lg:col-span-3">
                {activeTab === 'slider' && (
                  <div className="bg-[#1E1E1E] p-4 rounded-lg shadow-2xl">
                    <h3 className="text-xl font-semibold mb-4 text-center">Interactive Image Comparison</h3>
                    <div className="aspect-video w-full">
                      <ImageSlider 
                        image1Url={image1} 
                        image2Url={image2}
                        image1Label="Original"
                        image2Label="Edited"
                        className="w-full h-full"
                      />
                    </div>
                    <p className="text-sm text-gray-400 mt-4 text-center">
                      Drag the slider to compare the original and edited images side by side
                    </p>
                  </div>
                )}

                {activeTab === 'annotations' && (
                  <div className="bg-[#1E1E1E] p-4 rounded-lg shadow-2xl">
                    <h3 className="text-xl font-semibold mb-4 text-center">
                      Difference Detection {annotations?.differences && annotations.differences.length > 0 && 
                        <span className="text-yellow-400">({annotations.differences.length} regions found)</span>
                      }
                    </h3>
                    <div className="relative w-full">
                      <canvas ref={annotatedCanvasRef} className="w-full h-auto rounded-lg shadow-lg max-h-[70vh] object-contain"></canvas>
                      {(!annotations?.differences || annotations.differences.length === 0) && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-lg">
                          <div className="text-center">
                            <FaCheckCircle className="text-green-400 text-4xl mx-auto mb-2" />
                            <p className="text-lg font-semibold">No significant differences detected</p>
                            <p className="text-sm text-gray-400">Images appear to be very similar</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === 'analysis' && (
                  <div className="bg-[#1E1E1E] p-4 rounded-lg shadow-2xl">
                    <h3 className="text-xl font-semibold mb-4 text-center">Detailed Statistical Analysis</h3>
                    <div className="space-y-6">
                      {/* Statistics Overview */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-gray-800 p-4 rounded-lg">
                          <h4 className="text-sm font-medium text-gray-300 mb-2">Image Dimensions</h4>
                          <p className="text-2xl font-bold">{stats.imageWidth} × {stats.imageHeight}</p>
                          <p className="text-xs text-gray-400">{((stats.imageWidth || 0) * (stats.imageHeight || 0)).toLocaleString()} pixels</p>
                        </div>
                        <div className="bg-gray-800 p-4 rounded-lg">
                          <h4 className="text-sm font-medium text-gray-300 mb-2">Total Differences</h4>
                          <p className="text-2xl font-bold text-yellow-400">{stats.mismatchedPixels?.toLocaleString() || 'N/A'}</p>
                          <p className="text-xs text-gray-400">pixels changed</p>
                        </div>
                      </div>
                      
                      {/* Difference Breakdown */}
                      {annotations?.differences && annotations.differences.length > 0 && (
                        <div className="bg-gray-800 p-4 rounded-lg">
                          <h4 className="text-sm font-medium text-gray-300 mb-3">Difference Regions Breakdown</h4>
                          <div className="max-h-40 overflow-y-auto space-y-2">
                            {annotations.differences.slice(0, 10).map((diff) => (
                              <div key={diff.id} className="flex justify-between items-center text-sm">
                                <span>Region {diff.id}</span>
                                <span className="text-gray-400">{diff.area.toLocaleString()} px² at ({diff.x}, {diff.y})</span>
                              </div>
                            ))}
                            {annotations.differences.length > 10 && (
                              <p className="text-xs text-gray-500 text-center">
                                ... and {annotations.differences.length - 10} more regions
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: Stats */}
              <div className="lg:col-span-2 space-y-6">
                {ssimAnalysis && (
                  <StatCard title="Structural Similarity (SSIM)" value={formatNumber(stats.ssim, 5)} analysis={ssimAnalysis}>
                    Measures the perceptual difference between two images. Higher values indicate greater similarity.
                  </StatCard>
                )}
                {mseAnalysis && (
                  <StatCard title="Mean Squared Error (MSE)" value={formatNumber(stats.mse, 4)} analysis={mseAnalysis}>
                    Calculates the average squared difference between pixels. Lower values indicate higher similarity.
                  </StatCard>
                )}
                {mismatchAnalysis && (
                  <StatCard title="Mismatched Pixels" value={`${formatNumber(mismatchPercent, 3)}%`} analysis={mismatchAnalysis}>
                    Percentage of pixels that differ between the two images using advanced detection algorithms.
                  </StatCard>
                )}
                {typeof stats.differencesFound === 'number' && (
                  <StatCard title="Difference Regions" value={stats.differencesFound} analysis={{ 
                    level: stats.differencesFound === 0 ? 'No regions' : stats.differencesFound < 5 ? 'Few regions' : stats.differencesFound < 15 ? 'Moderate' : 'Many regions', 
                    color: stats.differencesFound === 0 ? 'text-green-400' : stats.differencesFound < 5 ? 'text-yellow-400' : 'text-orange-400', 
                    icon: <FaEye /> 
                  }}>
                    Distinct areas where significant differences were detected using smart algorithms.
                  </StatCard>
                )}
              </div>
            </div>
            
            {/* Bottom Sections */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
              {ocr && (ocr.image1 !== 'N/A' || ocr.image2 !== 'N/A') && (
                <ResultsSection title="Enhanced OCR Text Detection">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <OcrResult title="Original Image" text={ocr.image1} />
                    <OcrResult title="Edited Image" text={ocr.image2} />
                  </div>
                  <p className="text-xs text-gray-500 mt-4">
                    <strong>Enhanced OCR:</strong> Uses advanced preprocessing including upscaling, sharpening, and adaptive thresholding for better text recognition.
                  </p>
                </ResultsSection>
              )}
              
              {results.classification && (results.classification.image1.length > 0 || results.classification.image2.length > 0) && (
                <ResultsSection title="AI Object & Scene Detection">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <ClassificationResultDisplay title="Original Image" data={results.classification.image1} />
                      <ClassificationResultDisplay title="Edited Image" data={results.classification.image2} />
                   </div>
                   <p className="text-xs text-gray-500 mt-4">
                    <strong>How this works:</strong> Uses COCO-SSD for real object detection (people, vehicles, animals, etc.) with fallback to advanced feature analysis for scene classification.
                  </p>
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
    <div className="max-h-32 overflow-y-auto">
      <p className="text-gray-400 whitespace-pre-wrap text-sm">
        {text && text !== 'N/A' && text !== 'OCR processing failed' ? text : '(No text detected)'}
      </p>
    </div>
  </div>
);

const ClassificationResultDisplay: React.FC<{ title: string; data: ClassificationResult[] }> = ({ title, data }) => (
  <div className="bg-gray-800/50 p-4 rounded-lg">
    <h4 className="font-bold text-lg mb-2 text-gray-300">{title}</h4>
    <div className="max-h-40 overflow-y-auto">
      <ul className="space-y-2">
        {data && data.length > 0 ? (
          data.map((item, index) => (
            <li key={index} className="flex justify-between items-center text-sm">
              <span className="text-gray-300 flex-1 mr-2" title={item.className}>
                {item.className.length > 30 ? `${item.className.substring(0, 30)}...` : item.className}
              </span>
              <span className="font-mono text-cyan-400 flex-shrink-0">
                {formatNumber(item.probability * 100, 1)}%
              </span>
            </li>
          ))
        ) : (
          <p className="text-gray-400 text-sm">No objects or features detected.</p>
        )}
      </ul>
    </div>
  </div>
);

export default ImageComparisonResultsPage; 