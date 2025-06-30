import { useState, useRef, useCallback } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import MaskingCanvas from '../components/objectRemoval/MaskingCanvas';
import ModelControls from '../components/objectRemoval/ModelControls';
import ProcessingOverlay from '../components/objectRemoval/ProcessingOverlay';
import ResultsViewer from '../components/objectRemoval/ResultsViewer';
import ImageUploader from '../components/objectRemoval/ImageUploader';

interface ProcessingState {
  isProcessing: boolean;
  stage: 'segmenting' | 'removing' | 'finalizing' | null;
  progress: number;
}

interface ObjectRemovalSettings {
  quality: 'fast' | 'balanced' | 'high';
  maskDilation: number;
  autoMask: boolean;
}

const ObjectRemovalPage = () => {
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [currentMask, setCurrentMask] = useState<ImageData | null>(null);
  const [processing, setProcessing] = useState<ProcessingState>({
    isProcessing: false,
    stage: null,
    progress: 0
  });
  const [settings, setSettings] = useState<ObjectRemovalSettings>({
    quality: 'balanced',
    maskDilation: 5,
    autoMask: true
  });
  const [showResults, setShowResults] = useState(false);
  const [history, setHistory] = useState<Array<{id: string, original: string, processed: string, timestamp: Date}>>([]);

  const workerRef = useRef<Worker | null>(null);

  const handleImageUpload = useCallback((imageData: string) => {
    setOriginalImage(imageData);
    setProcessedImage(null);
    setCurrentMask(null);
    setShowResults(false);
  }, []);

  const handleMaskUpdate = useCallback((maskData: ImageData) => {
    setCurrentMask(maskData);
  }, []);

  const handleProcessImage = useCallback(async () => {
    if (!originalImage || !currentMask) return;

    setProcessing({
      isProcessing: true,
      stage: 'segmenting',
      progress: 10
    });

    try {
      // Initialize worker if not already done
      if (!workerRef.current) {
        workerRef.current = new Worker(
          new URL('../workers/objectRemoval.worker.ts', import.meta.url),
          { type: 'module' }
        );
      }

      const worker = workerRef.current;

      // Set up worker message handler
      worker.onmessage = (event) => {
        const { type, data, progress, stage } = event.data;

        if (type === 'progress') {
          setProcessing(prev => ({
            ...prev,
            stage: stage || prev.stage,
            progress: progress || prev.progress
          }));
        } else if (type === 'result') {
          setProcessedImage(data.processedImage);
          setProcessing({
            isProcessing: false,
            stage: null,
            progress: 100
          });
          setShowResults(true);

          // Add to history
          const historyEntry = {
            id: Date.now().toString(),
            original: originalImage,
            processed: data.processedImage,
            timestamp: new Date()
          };
          setHistory(prev => [historyEntry, ...prev.slice(0, 4)]); // Keep last 5
        } else if (type === 'error') {
          console.error('Processing error:', data);
          setProcessing({
            isProcessing: false,
            stage: null,
            progress: 0
          });
          alert('Processing failed. Please try again.');
        }
      };

      // Send processing request to worker
      worker.postMessage({
        type: 'process',
        data: {
          originalImage,
          mask: currentMask,
          settings
        }
      });

    } catch (error) {
      console.error('Error during processing:', error);
      setProcessing({
        isProcessing: false,
        stage: null,
        progress: 0
      });
      alert('Processing failed. Please try again.');
    }
  }, [originalImage, currentMask, settings]);

  const handleDownload = useCallback(() => {
    if (!processedImage) return;

    const link = document.createElement('a');
    link.download = `removed-objects-${Date.now()}.png`;
    link.href = processedImage;
    link.click();
  }, [processedImage]);

  const handleReset = useCallback(() => {
    setProcessedImage(null);
    setCurrentMask(null);
    setShowResults(false);
    setProcessing({
      isProcessing: false,
      stage: null,
      progress: 0
    });
  }, []);

  return (
    <div className="relative flex size-full min-h-screen flex-col dark group/design-root overflow-x-hidden bg-[var(--background)]">
      <div className="layout-container flex h-full grow flex-col">
        <Header />
        
        <main className="px-4 md:px-8 lg:px-12 flex flex-1 justify-center py-8">
          <div className="layout-content-container flex flex-col items-center max-w-7xl flex-1 w-full">
            
            {/* Header Section */}
            <div className="text-center mb-8">
              <h1 className="text-3xl md:text-4xl font-bold mb-4 tracking-tighter text-[var(--text)]">
                AI Object Removal
              </h1>
              <p className="text-lg text-[var(--text-secondary)] max-w-2xl mx-auto">
                Remove unwanted objects from your images with professional AI technology. 
                Simply click on objects to select them, then let our AI do the magic.
              </p>
            </div>

            {/* Main Content */}
            <div className="w-full grid grid-cols-1 lg:grid-cols-4 gap-8">
              
              {/* Left Panel - Controls */}
              <div className="lg:col-span-1 space-y-6">
                <ModelControls 
                  settings={settings}
                  onSettingsChange={setSettings}
                  disabled={processing.isProcessing}
                />
                
                {/* Action Buttons */}
                <div className="space-y-3">
                  <button
                    onClick={handleProcessImage}
                    disabled={!originalImage || !currentMask || processing.isProcessing}
                    className="w-full bg-[var(--primary)] text-white py-3 px-4 rounded-lg font-medium
                             hover:bg-[var(--primary-dark)] disabled:opacity-50 disabled:cursor-not-allowed
                             transition-colors flex items-center justify-center gap-2"
                  >
                    {processing.isProcessing ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Processing...
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-sm">auto_fix_high</span>
                        Remove Objects
                      </>
                    )}
                  </button>
                  
                  <button
                    onClick={handleReset}
                    disabled={processing.isProcessing}
                    className="w-full bg-[var(--secondary)] text-[var(--text)] py-3 px-4 rounded-lg font-medium
                             hover:bg-[var(--secondary-dark)] disabled:opacity-50 disabled:cursor-not-allowed
                             transition-colors flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined text-sm">refresh</span>
                    Reset
                  </button>

                  {processedImage && (
                    <button
                      onClick={handleDownload}
                      className="w-full bg-green-600 text-white py-3 px-4 rounded-lg font-medium
                               hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                    >
                      <span className="material-symbols-outlined text-sm">download</span>
                      Download Result
                    </button>
                  )}
                </div>

                {/* Instructions */}
                <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-4">
                  <h3 className="font-semibold text-[var(--text)] mb-2">How to use:</h3>
                  <ol className="text-sm text-[var(--text-secondary)] space-y-1">
                    <li>1. Upload an image</li>
                    <li>2. Click on objects to select them</li>
                    <li>3. Adjust mask with brush tools</li>
                    <li>4. Click "Remove Objects"</li>
                    <li>5. Download your result</li>
                  </ol>
                </div>
              </div>

              {/* Center Panel - Main Canvas */}
              <div className="lg:col-span-2 relative">
                {!originalImage ? (
                  <ImageUploader onImageUpload={handleImageUpload} />
                ) : showResults ? (
                  <ResultsViewer 
                    originalImage={originalImage}
                    processedImage={processedImage}
                    onBack={() => setShowResults(false)}
                  />
                ) : (
                  <MaskingCanvas
                    image={originalImage}
                    onMaskUpdate={handleMaskUpdate}
                    settings={settings}
                    disabled={processing.isProcessing}
                  />
                )}
                
                {/* Processing Overlay */}
                {processing.isProcessing && (
                  <ProcessingOverlay 
                    stage={processing.stage}
                    progress={processing.progress}
                  />
                )}
              </div>

              {/* Right Panel - History & Tips */}
              <div className="lg:col-span-1 space-y-6">
                
                {/* Recent History */}
                {history.length > 0 && (
                  <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-4">
                    <h3 className="font-semibold text-[var(--text)] mb-3">Recent Results</h3>
                    <div className="space-y-3">
                      {history.slice(0, 3).map((item) => (
                        <div key={item.id} className="flex items-center gap-3">
                          <img 
                            src={item.processed} 
                            alt="Recent result"
                            className="w-12 h-12 object-cover rounded border"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-[var(--text)] truncate">
                              {item.timestamp.toLocaleTimeString()}
                            </p>
                            <p className="text-xs text-[var(--text-secondary)]">
                              Removed objects
                            </p>
                          </div>
                          <button
                            onClick={() => {
                              const link = document.createElement('a');
                              link.download = `result-${item.id}.png`;
                              link.href = item.processed;
                              link.click();
                            }}
                            className="text-[var(--text-secondary)] hover:text-[var(--primary)] transition-colors"
                          >
                            <span className="material-symbols-outlined text-sm">download</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tips */}
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">💡 Pro Tips</h3>
                  <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                    <li>• Use high-resolution images for best results</li>
                    <li>• Click precisely on object boundaries</li>
                    <li>• Adjust mask dilation for cleaner edges</li>
                    <li>• Complex backgrounds may take longer</li>
                  </ul>
                </div>

                {/* Model Info */}
                <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-4">
                  <h3 className="font-semibold text-[var(--text)] mb-2">🤖 AI Model</h3>
                  <div className="text-sm text-[var(--text-secondary)] space-y-1">
                    <p><strong>Segmentation:</strong> MobileSAM</p>
                    <p><strong>Inpainting:</strong> LaMa</p>
                    <p><strong>Quality:</strong> Professional Grade</p>
                    <p><strong>Processing:</strong> Local (Private)</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
        
        <Footer />
      </div>
    </div>
  );
};

export default ObjectRemovalPage;