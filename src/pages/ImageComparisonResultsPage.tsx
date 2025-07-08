import { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import Footer from '../components/Footer';
import { FaExclamationTriangle } from 'react-icons/fa';
import * as Comlink from 'comlink';
import CardGlass from '../components/CardGlass';

const ImageComparisonResultsPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { image1, image2, settings } = location.state || {};
  const isUIMode = settings?.isUIMode || false;
  
  const [isProcessing, setIsProcessing] = useState(true);
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'visual' | 'text' | 'report'>('visual');
  const [progress, setProgress] = useState<{ step: string; percent: number }>({ step: 'Initializing...', percent: 0 });
  const workerRef = useRef<any>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!image1 || !image2) {
      navigate('/compare');
      return;
    }

    const runComparison = async () => {
      try {
        setIsProcessing(true);
        setError(null);
        setProgress({ step: 'Initializing comparison engine...', percent: 10 });

        // Set a timeout of 60 seconds for UI comparison (increased for first-time downloads)
        const TIMEOUT_MS = 60000;
        
        if (isUIMode) {
          // Set timeout for UI comparison
          timeoutRef.current = setTimeout(() => {
            setError('UI comparison is taking longer than expected. This may happen on first run while downloading OCR models. Please try again.');
            setIsProcessing(false);
          }, TIMEOUT_MS);

        // Initialize the UI comparison worker
        const UIComparisonWorker = Comlink.wrap<any>(
            new Worker(new URL('../workers/uicomparisonWorking.worker.ts', import.meta.url), {
            type: 'module'
          })
        );
        
          workerRef.current = UIComparisonWorker;
          
          setProgress({ step: 'Initializing comparison engine...', percent: 20 });
        await workerRef.current.initialize();
          
          setProgress({ step: 'Converting images...', percent: 30 });

        // Convert images to ImageData
        const [imageData1, imageData2] = await Promise.all([
          createImageData(image1),
          createImageData(image2)
        ]);

          setProgress({ step: 'Analyzing UI elements and text...', percent: 50 });

        // Run comprehensive comparison
        const comparisonResults = await workerRef.current.compareScreenshots(
          imageData1,
          imageData2,
          {
              enableOCR: settings?.enableOcr ?? true,
              enableVisualAnalysis: settings?.enableAnnotations ?? true,
            threshold: 0.1
          }
        );

          setProgress({ step: 'Generating report...', percent: 90 });
          
          // Clear timeout on success
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
          }

          setResults(comparisonResults);
          setProgress({ step: 'Complete!', percent: 100 });
        } else {
          // Use standard comparison worker
          const ComparisonWorker = Comlink.wrap<any>(
            new Worker(new URL('../workers/comparison.worker.ts', import.meta.url), {
              type: 'module'
            })
          );
          
          workerRef.current = ComparisonWorker;

          // Run standard comparison
          const comparisonResults = await workerRef.current.compareImages(
            image1,
            image2,
            settings
          );

        setResults(comparisonResults);
        }
      } catch (err) {
        console.error('Comparison error:', err);
        setError(err instanceof Error ? err.message : 'Failed to compare images');
      } finally {
        setIsProcessing(false);
      }
    };

    runComparison();

    return () => {
      if (workerRef.current?.cleanup) {
        workerRef.current.cleanup();
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [image1, image2, navigate, isUIMode, settings]);

  const createImageData = async (imageUrl: string): Promise<ImageData> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0);
        resolve(ctx.getImageData(0, 0, img.width, img.height));
      };
      img.onerror = reject;
      img.src = imageUrl;
    });
  };

  const downloadReport = (format: 'json' | 'html') => {
    if (!results?.report) return;

    const content = format === 'json' 
      ? JSON.stringify(results.report.json, null, 2)
      : results.report.html;
    
    const blob = new Blob([content], { 
      type: format === 'json' ? 'application/json' : 'text/html' 
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ui-comparison-report.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!image1 || !image2) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white">
      <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10"></div>
      
      <div className="relative z-10 container mx-auto px-4 py-8">
        <Link to="/compare" className="inline-flex items-center text-blue-400 hover:text-blue-300 mb-6">
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Image Comparison
        </Link>

        <h1 className="text-4xl font-bold mb-8 bg-gradient-to-r from-blue-400 to-purple-600 text-transparent bg-clip-text">
          {isUIMode ? 'UI Screenshot Comparison Results' : 'Image Comparison Results'}
        </h1>

        {isProcessing && (
          <CardGlass className="p-8">
            <div className="flex flex-col items-center">
              <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500 mb-4"></div>
              <p className="text-lg">{isUIMode ? 'Analyzing UI screenshots...' : 'Analyzing images...'}</p>
              <p className="text-sm text-gray-400 mt-2">{progress.step}</p>
              {isUIMode && (
                <div className="w-full max-w-xs mt-4">
                  <div className="bg-gray-700 rounded-full h-2 overflow-hidden">
                    <div 
                      className="bg-blue-500 h-full transition-all duration-500"
                      style={{ width: `${progress.percent}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-2 text-center">{progress.percent}% complete</p>
                </div>
              )}
            </div>
          </CardGlass>
        )}

        {error && (
          <CardGlass className="p-6 bg-red-900/20 border-red-500">
            <div className="flex items-start space-x-3">
              <FaExclamationTriangle className="text-red-400 mt-1 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-red-400 font-semibold">Error during comparison</p>
                <p className="text-gray-300 mt-1">{error}</p>
                {isUIMode && error.includes('first run') && (
                  <div className="mt-3 p-3 bg-blue-900/20 border border-blue-500/30 rounded">
                    <p className="text-sm text-blue-300">
                      <strong>First-time setup:</strong> The OCR engine needs to download language models on first use. 
                      This is a one-time process and subsequent comparisons will be much faster.
                    </p>
                  </div>
                )}
                <div className="mt-4 flex space-x-3">
                  <button
                    onClick={() => window.location.reload()}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded transition-colors"
                  >
                    Try Again
                  </button>
                  <Link
                    to="/compare"
                    className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded transition-colors inline-block"
                  >
                    Back to Upload
                  </Link>
                </div>
              </div>
            </div>
          </CardGlass>
        )}

        {results && !isProcessing && (
          <>
            {/* Composite Score */}
            <CardGlass className="p-8 mb-8">
              <div className="text-center">
                <h2 className="text-2xl font-semibold mb-4">Composite Difference Score</h2>
                <div className={`text-6xl font-bold mb-4 ${
                  results.compositeScore < 20 ? 'text-green-400' : 
                  results.compositeScore < 50 ? 'text-yellow-400' : 
                  'text-red-400'
                }`}>
                  {results.compositeScore}%
                </div>
                <p className="text-lg text-gray-300">
                  {results.compositeScore === 0 ? 'Identical' : 
                   results.compositeScore < 20 ? 'Minor changes' :
                   results.compositeScore < 50 ? 'Moderate changes' :
                   'Significant changes'}
                </p>
              </div>
            </CardGlass>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <CardGlass className="p-6">
                <p className="text-xl">{results.summary.visualSummary}</p>
              </CardGlass>
              <CardGlass className="p-6">
                <p className="text-xl">{results.summary.textSummary}</p>
              </CardGlass>
              <CardGlass className="p-6">
                <p className="text-xl">{results.summary.elementSummary}</p>
              </CardGlass>
            </div>

            {/* Detailed Metrics */}
            <CardGlass className="p-6 mb-8">
              <h3 className="text-xl font-semibold mb-4">Detailed Metrics</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-400">
                    {results.metrics.percentageChanged.toFixed(1)}%
                  </div>
                  <p className="text-sm text-gray-400">Visual Area Changed</p>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-yellow-400">
                    {results.metrics.textMismatches}
                  </div>
                  <p className="text-sm text-gray-400">Text Mismatches</p>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-400">
                    {results.metrics.elementsAdded}
                  </div>
                  <p className="text-sm text-gray-400">Elements Added</p>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-red-400">
                    {results.metrics.elementsRemoved}
                  </div>
                  <p className="text-sm text-gray-400">Elements Removed</p>
                </div>
              </div>
            </CardGlass>

            {/* Tabs for different views */}
            <div className="mb-6">
              <div className="flex space-x-4 border-b border-gray-700">
                <button
                  className={`pb-2 px-4 ${activeTab === 'visual' ? 'border-b-2 border-blue-500 text-blue-400' : 'text-gray-400'}`}
                  onClick={() => setActiveTab('visual')}
                >
                  Visual Comparison
                </button>
              <button
                  className={`pb-2 px-4 ${activeTab === 'text' ? 'border-b-2 border-blue-500 text-blue-400' : 'text-gray-400'}`}
                  onClick={() => setActiveTab('text')}
                >
                  Text Changes
              </button>
              <button
                  className={`pb-2 px-4 ${activeTab === 'report' ? 'border-b-2 border-blue-500 text-blue-400' : 'text-gray-400'}`}
                  onClick={() => setActiveTab('report')}
                >
                  Generate Report
              </button>
              </div>
                </div>
            
            {/* Tab Content */}
            {activeTab === 'visual' && (
              <CardGlass className="p-6">
                <h3 className="text-xl font-semibold mb-4">Visual Comparison</h3>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div>
                    <h4 className="text-sm text-gray-400 mb-2">Original</h4>
                    <img src={image1} alt="Original" className="w-full rounded-lg shadow-lg" />
                    </div>
                  <div>
                    <h4 className="text-sm text-gray-400 mb-2">New Version</h4>
                    <img src={image2} alt="New Version" className="w-full rounded-lg shadow-lg" />
                  </div>
                  <div>
                    <h4 className="text-sm text-gray-400 mb-2">Annotated Differences</h4>
                    <canvas 
                      ref={(canvas) => {
                        if (canvas && results.annotatedImageData) {
                          canvas.width = results.annotatedImageData.width;
                          canvas.height = results.annotatedImageData.height;
                          const ctx = canvas.getContext('2d');
                          if (ctx) {
                            ctx.putImageData(results.annotatedImageData, 0, 0);
                          }
                        }
                      }}
                      className="w-full rounded-lg shadow-lg"
                    />
                    </div>
                </div>
              </CardGlass>
            )}

            {activeTab === 'text' && (
              <CardGlass className="p-6">
                <h3 className="text-xl font-semibold mb-4">Text Changes</h3>
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {results.textChanges.length === 0 ? (
                    <p className="text-gray-400">No text changes detected</p>
                  ) : (
                    results.textChanges.map((change: any, index: number) => (
                      <div key={index} className={`p-4 rounded-lg ${
                        change.type === 'added' ? 'bg-green-900/20 border border-green-500' :
                        change.type === 'removed' ? 'bg-red-900/20 border border-red-500' :
                        change.type === 'modified' ? 'bg-yellow-900/20 border border-yellow-500' :
                        'bg-blue-900/20 border border-blue-500'
                      }`}>
                        <div className="flex items-center justify-between">
                          <span className="font-semibold capitalize">{change.type}</span>
                          {change.details?.misspelling && (
                            <span className="text-xs bg-orange-500/20 px-2 py-1 rounded">Possible Misspelling</span>
                          )}
                        </div>
                        {change.oldText && (
                          <p className="mt-2"><span className="text-gray-400">Old:</span> "{change.oldText}"</p>
                        )}
                        {change.newText && (
                          <p><span className="text-gray-400">New:</span> "{change.newText}"</p>
                        )}
                        {change.details?.positionChange && (
                          <p className="text-sm text-gray-400 mt-1">
                            Moved: {change.details.positionChange.dx}px horizontal, {change.details.positionChange.dy}px vertical
                          </p>
                        )}
                        {change.details?.fontSizeChange && (
                          <p className="text-sm text-gray-400 mt-1">
                            Font size: {change.details.fontSizeChange.old}px → {change.details.fontSizeChange.new}px
                          </p>
                            )}
                          </div>
                    ))
                      )}
                    </div>
              </CardGlass>
            )}

            {activeTab === 'report' && (
              <CardGlass className="p-6">
                <h3 className="text-xl font-semibold mb-4">Generate Report</h3>
                <p className="text-gray-400 mb-6">
                  Export a comprehensive report of all detected changes in your preferred format.
                </p>
                <div className="flex space-x-4">
                  <button
                    onClick={() => downloadReport('json')}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                  >
                    Download JSON Report
                  </button>
                  <button
                    onClick={() => downloadReport('html')}
                    className="px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
                  >
                    Download HTML Report
                  </button>
              </div>
              </CardGlass>
            )}
          </>
        )}
            </div>
            
       <Footer />
    </div>
  );
};

export default ImageComparisonResultsPage; 