import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { motion } from 'framer-motion';
import LoadingOverlay from '../components/LoadingOverlay';

const ImageComparisonResultsPage: React.FC = () => {
  const location = useLocation();
  const { image1, image2, enableAnnotations, enableOcr, enableClassification } = location.state || {};
  const [showAnnotations, setShowAnnotations] = useState(enableAnnotations);
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    // Create a new worker
    workerRef.current = new Worker(new URL('../workers/comparison.worker.ts', import.meta.url), {
      type: 'module',
    });

    // Post a message to the worker to start processing
    workerRef.current.postMessage({
      image1,
      image2,
      settings: {
        enableAnnotations,
        enableOcr,
        enableClassification,
      },
    });

    // Listen for messages from the worker
    workerRef.current.onmessage = (event) => {
      setResults(event.data);
      setLoading(false);
    };

    // Terminate the worker when the component unmounts
    return () => {
      workerRef.current?.terminate();
    };
  }, [image1, image2, enableAnnotations, enableOcr, enableClassification]);

  if (loading) {
    return <LoadingOverlay message="Our AI is comparing the images... this may take a moment." />;
  }

  return (
    <div className="bg-[var(--dark-bg)]" style={{ fontFamily: '"Space Grotesk", "Noto Sans", sans-serif' }}>
       <style>{`
        :root { --dark-bg: #111827;--card-bg: #1F2937;--primary-accent: #3B82F6;--text-primary: #F3F4F6;--text-secondary: #9CA3AF;--border-color: #374151;}
        .toggle-switch-bg:checked { background-color: var(--primary-accent) !important; }
        .toggle-switch-bg:checked + .toggle-switch-dot { transform: translateX(100%); }
      `}</style>
      <div className="relative flex size-full min-h-screen flex-col group/design-root overflow-x-hidden">
        <div className="layout-container flex h-full grow flex-col">
          <Header />
          <main className="px-4 sm:px-8 md:px-16 lg:px-24 xl:px-40 flex flex-1 justify-center py-8">
            <motion.div 
              className="layout-content-container flex flex-col max-w-5xl w-full flex-1"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="mb-8 p-4">
                <h1 className="text-[var(--text-primary)] tracking-tight text-3xl sm:text-4xl font-bold leading-tight">Image Comparison Output</h1>
              </div>

              <motion.section 
                className="mb-8 bg-[var(--card-bg)] rounded-xl shadow-lg p-4 sm:p-6"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1, duration: 0.4 }}
              >
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
                  <h2 className="text-[var(--text-primary)] text-xl sm:text-2xl font-semibold leading-tight tracking-[-0.015em] mb-2 sm:mb-0">Output Images</h2>
                  {enableAnnotations && (
                    <div className="flex items-center gap-2">
                      <span className="text-[var(--text-secondary)] text-sm">Show Annotations:</span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input className="sr-only peer toggle-switch-bg" type="checkbox" checked={showAnnotations} onChange={() => setShowAnnotations(!showAnnotations)} />
                        <div className="w-11 h-6 bg-gray-500 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[var(--primary-accent)] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all toggle-switch-dot"></div>
                      </label>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="relative aspect-[4/3] rounded-lg overflow-hidden group border-2 border-transparent hover:border-[var(--primary-accent)] transition-colors">
                    <img src={image1} alt="Image 1" className="absolute inset-0 w-full h-full object-cover" />
                    <div className="absolute top-2 left-2 bg-[var(--primary-accent)] text-white text-xs font-semibold px-2 py-1 rounded">Image 1</div>
                     {showAnnotations && results?.differences.map((d: any) => (
                        <div key={d.id} className="absolute border-2 border-red-500" style={{ left: `${d.x}px`, top: `${d.y}px`, width: `${d.w}px`, height: `${d.h}px` }}>
                            <span className="absolute -top-5 -left-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">{d.id}</span>
                        </div>
                    ))}
                  </div>
                  <div className="relative aspect-[4/3] rounded-lg overflow-hidden group border-2 border-transparent hover:border-[var(--primary-accent)] transition-colors">
                    <img src={image2} alt="Image 2" className="absolute inset-0 w-full h-full object-cover" />
                    <div className="absolute top-2 left-2 bg-[var(--primary-accent)] text-white text-xs font-semibold px-2 py-1 rounded">Image 2</div>
                     {showAnnotations && results?.differences.map((d: any) => (
                        <div key={d.id} className="absolute border-2 border-red-500" style={{ left: `${d.x}px`, top: `${d.y}px`, width: `${d.w}px`, height: `${d.h}px` }}>
                             <span className="absolute -top-5 -left-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">{d.id}</span>
                        </div>
                    ))}
                  </div>
                </div>
              </motion.section>

              <motion.section 
                className="grid grid-cols-1 md:grid-cols-1 gap-6 mb-8"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.5 }}
              >
                 <div className="bg-[var(--card-bg)] rounded-xl shadow-lg p-4 sm:p-6">
                    <h3 className="text-[var(--text-primary)] text-lg font-semibold leading-tight tracking-[-0.015em] mb-3">Processing Statistics</h3>
                    <p className="text-[var(--text-secondary)] text-sm font-normal leading-normal mb-1">Processing Time: <span className="text-[var(--text-primary)] font-medium">{results?.stats.processingTime}</span></p>
                    <p className="text-[var(--text-secondary)] text-sm font-normal leading-normal mb-1">Differences Found: <span className="text-[var(--text-primary)] font-medium">{results?.stats.differencesFound}</span></p>
                    <p className="text-[var(--text-secondary)] text-sm font-normal leading-normal mb-1">Mismatched Pixels: <span className="text-[var(--text-primary)] font-medium">{results?.stats.mismatchedPixels}</span></p>
                    <p className="text-[var(--text-secondary)] text-sm font-normal leading-normal mb-1">Mean Squared Error: <span className="text-[var(--text-primary)] font-medium">{results?.stats.mse}</span></p>
                    <p className="text-[var(--text-secondary)] text-sm font-normal leading-normal">Structural Similarity: <span className="text-[var(--text-primary)] font-medium">{results?.stats.ssim}</span></p>
                 </div>
              </motion.section>

              {enableOcr && (
                <motion.section 
                  className="bg-[var(--card-bg)] rounded-xl shadow-lg p-4 sm:p-6 mb-8"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3, duration: 0.5 }}
                >
                  <h3 className="text-[var(--text-primary)] text-lg font-semibold leading-tight tracking-[-0.015em] mb-3">OCR Text</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-[var(--text-secondary)] text-xs font-medium mb-1">Image 1:</p>
                      <p className="text-[var(--text-primary)] text-sm font-normal leading-normal bg-[var(--dark-bg)] p-2 rounded-md">{results?.ocr.image1}</p>
                    </div>
                    <div>
                      <p className="text-[var(--text-secondary)] text-xs font-medium mb-1">Image 2:</p>
                      <p className="text-[var(--text-primary)] text-sm font-normal leading-normal bg-[var(--dark-bg)] p-2 rounded-md">{results?.ocr.image2}</p>
                    </div>
                  </div>
                </motion.section>
              )}

              {enableClassification && (
                 <motion.section 
                  className="bg-[var(--card-bg)] rounded-xl shadow-lg p-4 sm:p-6 mb-8"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4, duration: 0.5 }}
                >
                  <h3 className="text-[var(--text-primary)] text-lg font-semibold leading-tight tracking-[-0.015em] mb-3">Image Classification</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-[var(--text-secondary)] text-xs font-medium mb-1">Image 1:</p>
                      <p className="text-[var(--text-primary)] text-sm font-normal leading-normal bg-[var(--dark-bg)] p-2 rounded-md">{results?.classification.image1}</p>
                    </div>
                    <div>
                      <p className="text-[var(--text-secondary)] text-xs font-medium mb-1">Image 2:</p>
                      <p className="text-[var(--text-primary)] text-sm font-normal leading-normal bg-[var(--dark-bg)] p-2 rounded-md">{results?.classification.image2}</p>
                    </div>
                  </div>
                </motion.section>
              )}
              
              {showAnnotations && (
                 <motion.section 
                  className="bg-[var(--card-bg)] rounded-xl shadow-lg p-4 sm:p-6"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5, duration: 0.5 }}
                >
                    <h3 className="text-[var(--text-primary)] text-lg font-semibold leading-tight tracking-[-0.015em] mb-3">Annotation Details</h3>
                    <div className="space-y-2 text-sm">
                        {results?.differences.sort((a: any, b: any) => b.area - a.area).map((d: any) => (
                            <p key={d.id} className="text-[var(--text-secondary)]">
                                <span className="font-bold text-red-400">Difference {d.id}:</span> Box at ({d.x}, {d.y}), Size ({d.w} x {d.h}), Area ({d.area} pixels)
                            </p>
                        ))}
                    </div>
                 </motion.section>
              )}

            </motion.div>
          </main>
          <Footer />
        </div>
      </div>
    </div>
  );
};

export default ImageComparisonResultsPage; 