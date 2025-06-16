// src/pages/DepthMapPage.tsx -> THE FINAL, CORRECT VERSION
import React, { useState, useRef, useEffect } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';

// Progress Bar component
const ProgressBar = ({ message }: { message: string }) => (
    <div className="w-full bg-white bg-opacity-20 rounded-full h-1.5">
        <div 
            className="bg-[var(--primary-color)] h-1.5 rounded-full transition-all duration-300 ease-out animate-pulse"
            style={{ width: '100%' }}
        />
        <span className="text-sm text-[var(--text-secondary)] mt-2 block">{message}</span>
    </div>
);

// Status Section component
const StatusSection = ({ uiState, errorMessage }: {
    uiState: 'idle' | 'loading_model' | 'processing' | 'output' | 'error';
    errorMessage: string;
}) => {
    if (uiState === 'output') return null;
    
    return (
        <div className="mt-4 p-4 bg-[var(--input-background)] rounded-lg">
            <div className="flex items-center justify-between mb-2">
                {uiState === 'error' ? (
                    <span className="text-red-500">{errorMessage}</span>
                ) : (
                    <span className="text-[var(--text-secondary)]">
                        {uiState === 'loading_model' ? 'Preparing AI Engine...' :
                         uiState === 'processing' ? 'Processing Image...' :
                         uiState === 'idle' ? 'Ready' : ''}
                    </span>
                )}
            </div>
            {(uiState === 'loading_model' || uiState === 'processing') && (
                <ProgressBar message={uiState === 'loading_model' ? 'Loading model...' : 'Processing...'} />
            )}
        </div>
    );
};

// Input View component
const InputView = ({ onFileChange, onGenerate, imagePreview, isDisabled }: {
    onFileChange: (e: React.ChangeEvent<HTMLInputElement> | File) => void;
    onGenerate: () => void;
    imagePreview: string | null;
    isDisabled: boolean;
}) => {
    // Drag state for styling
    const [dragActive, setDragActive] = React.useState(false);
    const inputRef = React.useRef<HTMLInputElement>(null);

    // Handle drag events
    const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    };
    // Handle drop event
    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            onFileChange(e.dataTransfer.files[0]);
        }
    };
    // Handle file input change
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onFileChange(e);
    };

    // Handle click on upload area
    const handleUploadAreaClick = () => {
        if (!isDisabled && inputRef.current) {
            inputRef.current.click();
        }
    };

    return (
        <div className="w-full bg-[var(--secondary-color)] rounded-xl shadow-lg p-8 space-y-8">
            <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2" htmlFor="file-upload">
                    Upload Image
                </label>
                <div
                    className={`mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-[var(--input-border-color)] border-dashed rounded-md transition-colors cursor-pointer ${dragActive ? 'border-[var(--primary-color)] bg-[var(--primary-color)] bg-opacity-10' : 'hover:border-[var(--primary-color)]'} ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                    onDragEnter={handleDrag}
                    onDragOver={handleDrag}
                    onDragLeave={handleDrag}
                    onDrop={handleDrop}
                    onClick={handleUploadAreaClick}
                    tabIndex={0}
                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') handleUploadAreaClick(); }}
                    role="button"
                    aria-label="Upload image by clicking or dragging"
                >
                    <div className="space-y-1 text-center">
                        <span className="material-symbols-outlined text-5xl text-[var(--text-secondary)]">cloud_upload</span>
                        <div className="flex text-sm text-[var(--text-secondary)]">
                            <label
                                className="relative cursor-pointer bg-[var(--secondary-color)] rounded-md font-medium text-[var(--primary-color)] hover:text-[var(--primary-color-hover)] focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-offset-[var(--secondary-color)] focus-within:ring-[var(--primary-color)]"
                                htmlFor="file-upload"
                                tabIndex={-1}
                            >
                                <span>Upload a file</span>
                                <input
                                    className="sr-only"
                                    id="file-upload"
                                    name="file-upload"
                                    type="file"
                                    accept="image/*"
                                    onChange={handleInputChange}
                                    disabled={isDisabled}
                                    ref={inputRef}
                                />
                            </label>
                            <p className="pl-1">or drag and drop</p>
                        </div>
                        <p className="text-xs text-[var(--text-secondary)] opacity-75">PNG, JPG, GIF up to 10MB</p>
                    </div>
                </div>
                {imagePreview && (
                    <div className="mt-4 aspect-square bg-[var(--input-background)] rounded-lg overflow-hidden">
                        <img
                            src={imagePreview}
                            alt="Preview"
                            className="w-full h-full object-cover"
                        />
                    </div>
                )}
            </div>

            <button
                onClick={onGenerate}
                disabled={isDisabled || !imagePreview}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-[var(--primary-color)] hover:bg-[var(--primary-color-hover)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[var(--secondary-color)] focus:ring-[var(--primary-color)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <span className="material-symbols-outlined">layers</span>
                Generate Depth Map
            </button>
        </div>
    );
};

// Output View component (matches provided HTML template)
const OutputView = ({ 
    imagePreview, 
    outputUrl,
    processingTime,
    outputResolution,
    onSave,
    onEdit,
    onReset
}: {
    imagePreview: string | null;
    outputUrl: string | null;
    processingTime: number | null;
    outputResolution: string | null;
    onSave: () => void;
    onEdit: () => void;
    onReset: () => void;
}) => (
    <main className="px-10 md:px-20 lg:px-40 flex flex-1 justify-center py-12">
      <div className="layout-content-container flex flex-col items-center max-w-4xl flex-1 w-full">
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold mb-4 tracking-tighter">Depth Map Output</h2>
          <p className="text-lg md:text-xl text-[var(--text-secondary)] max-w-2xl mx-auto">
            Your generated depth map is ready! Review the output and save it to your device.
          </p>
        </div>
        <div className="w-full bg-[var(--secondary-color)] rounded-xl shadow-lg p-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
            <div>
              <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-4">Original Image</h3>
              <div className="aspect-square bg-[var(--input-background)] rounded-lg overflow-hidden">
                <img alt="Original uploaded image" className="w-full h-full object-cover" src={imagePreview || ''} />
              </div>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-4">Generated Depth Map</h3>
              <div className="aspect-square bg-[var(--input-background)] rounded-lg overflow-hidden">
                {outputUrl && <img alt="Generated depth map" className="w-full h-full object-cover" src={outputUrl} />}
              </div>
            </div>
          </div>
          <div className="border-t border-[var(--input-border-color)] pt-8 space-y-6">
            <div>
              <h4 className="text-lg font-medium text-[var(--text-secondary)] mb-2">Processing Details:</h4>
              <ul className="list-disc list-inside text-[var(--text-secondary)] space-y-1 text-sm">
                <li>Model Used: <span className="text-[var(--text-primary)] font-medium">Depth-Anything-V2-Small</span></li>
                <li>Processing Time: <span className="text-[var(--text-primary)] font-medium">{processingTime?.toFixed(1)} seconds</span></li>
                <li>Output Resolution: <span className="text-[var(--text-primary)] font-medium">{outputResolution}</span></li>
              </ul>
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
              <button onClick={onSave} className="w-full flex items-center justify-center gap-2 px-6 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-[var(--primary-color)] hover:bg-[var(--primary-color-hover)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[var(--secondary-color)] focus:ring-[var(--primary-color)] transition-colors" type="button">
                <span className="material-symbols-outlined">save</span>
                Save Depth Map
              </button>
              <button onClick={onEdit} className="w-full flex items-center justify-center gap-2 px-6 py-3 border border-[var(--input-border-color)] rounded-md shadow-sm text-base font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--primary-color)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[var(--secondary-color)] focus:ring-[var(--primary-color)] transition-colors" type="button">
                <span className="material-symbols-outlined">edit</span>
                Edit Further
              </button>
            </div>
            <button onClick={onReset} className="w-full flex items-center justify-center gap-2 px-6 py-3 border border-transparent rounded-md text-base font-medium text-[var(--primary-color)] hover:text-[var(--primary-color-hover)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[var(--secondary-color)] focus:ring-[var(--primary-color)] transition-colors" type="button">
              <span className="material-symbols-outlined">restart_alt</span>
              Generate New Depth Map
            </button>
          </div>
        </div>
      </div>
    </main>
);

const DepthMapPage = () => {
    // State Management
    const [uiState, setUiState] = useState<'idle' | 'loading_model' | 'processing' | 'output' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState<string>('');
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [processedImageData, setProcessedImageData] = useState<ImageData | null>(null);
    const [processingTime, setProcessingTime] = useState<number | null>(null);
    const [outputUrl, setOutputUrl] = useState<string | null>(null);
    const [outputResolution, setOutputResolution] = useState<string | null>(null);
    
    // Refs
    const worker = useRef<Worker | null>(null);

    // Initialize worker
    useEffect(() => {
        try {
            worker.current = new Worker(new URL('../workers/depth.worker.ts', import.meta.url), { type: 'module' });
            
            worker.current.onmessage = (e: MessageEvent) => {
                const { status, message, output, error, width, height } = e.data;
                console.log('Worker message:', status, message);
                
                switch (status) {
                    case 'loading_model':
                        setUiState('loading_model');
                        setErrorMessage(message || 'Loading model...');
                        break;
                    case 'model_ready':
                        setUiState('idle');
                        setErrorMessage('');
                        break;
                    case 'processing':
                        setUiState('processing');
                        setErrorMessage(message || 'Processing image...');
                        break;
                    case 'complete':
                        if (output) {
                            const blob = new Blob([output], { type: 'image/png' });
                            const url = URL.createObjectURL(blob);
                            setOutputUrl(url);
                            setOutputResolution(width && height ? `${width}x${height} pixels` : null);
                        }
                        setUiState('output');
                        setErrorMessage('');
                        break;
                    case 'error':
                        console.error('Worker error:', error);
                        setErrorMessage(error || 'An error occurred');
                        setUiState('error');
                        break;
                }
            };

            worker.current.onerror = (error) => {
                console.error('Worker error:', error);
                setErrorMessage('Worker error: ' + error.message);
                setUiState('error');
            };

            // Set initial state to idle
            setUiState('idle');
        } catch (error) {
            console.error('Failed to initialize worker:', error);
            setErrorMessage('Failed to initialize worker');
            setUiState('error');
        }

        return () => {
            if (worker.current) {
                worker.current.terminate();
                worker.current = null;
            }
        };
    }, []);

    const handleFileChange = (input: React.ChangeEvent<HTMLInputElement> | File) => {
        let file: File | null = null;
        if (input instanceof File) {
            file = input;
        } else if (input.target.files && input.target.files[0]) {
            file = input.target.files[0];
        }
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    canvas.width = img.width;
                    canvas.height = img.height;
                    const ctx = canvas.getContext('2d');
                    if (ctx) {
                        ctx.drawImage(img, 0, 0);
                        const imageData = ctx.getImageData(0, 0, img.width, img.height);
                        setProcessedImageData(imageData);
                    }
                };
                const imageUrl = event.target?.result as string;
                img.src = imageUrl;
                setImagePreview(imageUrl);
                setUiState('idle');
            };
            reader.readAsDataURL(file);
        }
    };

    const handleGenerate = () => {
        if (!processedImageData || !worker.current) {
            setErrorMessage('No image selected or worker not initialized');
            setUiState('error');
            return;
        }

        const startTime = performance.now();
        setUiState('processing');
        
        try {
            worker.current.postMessage({
                command: 'generate',
                imageData: processedImageData,
            });

            // Listen for completion to calculate processing time
            const tempListener = (e: MessageEvent) => {
                if (e.data.status === 'complete') {
                    const endTime = performance.now();
                    setProcessingTime(parseFloat(((endTime - startTime) / 1000).toFixed(2)));
                    worker.current?.removeEventListener('message', tempListener);
                }
            };
            worker.current.addEventListener('message', tempListener);
        } catch (error) {
            console.error('Error sending message to worker:', error);
            setErrorMessage('Failed to process image');
            setUiState('error');
        }
    };

    const handleSave = () => {
        if (outputUrl) {
            const a = document.createElement('a');
            a.href = outputUrl;
            a.download = 'depth-map.png';
            a.click();
        }
    };
    const handleEdit = () => {
        // Placeholder for edit functionality
        alert('Edit functionality coming soon!');
    };
    const handleReset = () => {
        setImagePreview(null);
        setProcessedImageData(null);
        setProcessingTime(null);
        setOutputUrl(null);
        setOutputResolution(null);
        setUiState('idle');
        setErrorMessage('');
    };

    return (
        <div className="relative flex size-full min-h-screen flex-col dark group/design-root overflow-x-hidden">
            <div className="layout-container flex h-full grow flex-col">
                <Header />
                {uiState === 'output' ? (
                    <OutputView
                        imagePreview={imagePreview}
                        outputUrl={outputUrl}
                        processingTime={processingTime}
                        outputResolution={outputResolution}
                        onSave={handleSave}
                        onEdit={handleEdit}
                        onReset={handleReset}
                    />
                ) : (
                    <InputView
                        onFileChange={handleFileChange}
                        onGenerate={handleGenerate}
                        imagePreview={imagePreview}
                        isDisabled={uiState === 'loading_model' || uiState === 'processing'}
                    />
                )}
                <StatusSection uiState={uiState} errorMessage={errorMessage} />
                <Footer />
            </div>
        </div>
    );
};

export default DepthMapPage;