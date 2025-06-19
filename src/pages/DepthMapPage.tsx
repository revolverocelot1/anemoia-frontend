// src/pages/DepthMapPage.tsx -> THE FINAL, CORRECT VERSION
import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import Header from '../components/Header';
import Footer from '../components/Footer';
import AnimatedPage from '../components/AnimatedPage';

// Progress Bar component
const ProgressBar = ({ message }: { message: string }) => (
    <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
        <div 
            className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-300 ease-out animate-pulse"
            style={{ width: '100%' }}
        />
        <span className="text-sm text-gray-400 mt-3 block">{message}</span>
    </div>
);



// Input View component
const InputView = ({ onFileChange, onGenerate, imagePreview, isDisabled }: {
    onFileChange: (e: React.ChangeEvent<HTMLInputElement> | File) => void;
    onGenerate: () => void;
    imagePreview: string | null;
    isDisabled: boolean;
}) => {
    const [dragActive, setDragActive] = React.useState(false);
    const inputRef = React.useRef<HTMLInputElement>(null);

    const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            onFileChange(e.dataTransfer.files[0]);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onFileChange(e);
    };

    const handleUploadAreaClick = () => {
        if (!isDisabled && inputRef.current) {
            inputRef.current.click();
        }
    };

    return (
        <main className="px-4 sm:px-6 lg:px-8 flex flex-1 justify-center py-12">
            <div className="flex flex-col items-center max-w-4xl flex-1 w-full">
                <motion.div 
                    className="text-center mb-12"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                >
                    <h2 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                        Depth Map Generation
                    </h2>
                    <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto">
                        Transform your images into stunning depth maps using advanced AI. Upload an image to get started.
                    </p>
                </motion.div>

                <motion.div 
                    className="w-full bg-gray-900/50 backdrop-blur-sm rounded-2xl shadow-2xl border border-gray-800 p-8 space-y-8"
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                >
                    <div>
                        <label className="block text-sm font-semibold text-gray-300 mb-4" htmlFor="file-upload">
                            Upload Image
                        </label>
                        <div
                            className={`relative group flex justify-center px-6 pt-8 pb-10 border-2 border-dashed rounded-xl transition-all duration-300 cursor-pointer ${
                                dragActive 
                                    ? 'border-blue-400 bg-blue-400/5 scale-[1.02]' 
                                    : 'border-gray-600 hover:border-blue-400 hover:bg-gray-800/50'
                            } ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
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
                            <div className="space-y-4 text-center">
                                <motion.div
                                    className="mx-auto w-16 h-16 rounded-full bg-gradient-to-r from-blue-500/20 to-purple-500/20 flex items-center justify-center"
                                    whileHover={{ scale: 1.1, rotate: 5 }}
                                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                                >
                                    <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                    </svg>
                                </motion.div>
                                <div className="text-sm text-gray-400">
                                    <label
                                        className="relative cursor-pointer rounded-md font-semibold text-blue-400 hover:text-blue-300 focus-within:outline-none focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-2 focus-within:ring-offset-gray-900 transition-colors"
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
                                    <span className="pl-1">or drag and drop</span>
                                </div>
                                <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
                            </div>
                        </div>
                        
                        {imagePreview && (
                            <motion.div 
                                className="mt-6 rounded-xl overflow-hidden bg-gray-800 p-4"
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.3 }}
                            >
                                <h3 className="text-lg font-semibold text-white mb-3">Preview</h3>
                                <div className="aspect-square bg-gray-700 rounded-lg overflow-hidden">
                                    <img
                                        src={imagePreview}
                                        alt="Preview"
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                            </motion.div>
                        )}
                    </div>

                    <motion.button
                        onClick={onGenerate}
                        disabled={isDisabled || !imagePreview}
                        className="w-full flex items-center justify-center space-x-3 px-6 py-4 rounded-xl text-base font-semibold text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:from-blue-600 disabled:hover:to-purple-600 shadow-lg hover:shadow-xl"
                        whileHover={{ scale: isDisabled ? 1 : 1.02 }}
                        whileTap={{ scale: isDisabled ? 1 : 0.98 }}
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                        </svg>
                        <span>Generate Depth Map</span>
                    </motion.button>
                </motion.div>
            </div>
        </main>
    );
};

// Output View component
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
    <main className="px-4 sm:px-6 lg:px-8 flex flex-1 justify-center py-12">
        <div className="flex flex-col items-center max-w-6xl flex-1 w-full">
            <motion.div 
                className="text-center mb-12"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
            >
                <h2 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                    Depth Map Generated
                </h2>
                <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto">
                    Your depth map has been successfully generated! Compare the results and download your output.
                </p>
            </motion.div>

            <motion.div 
                className="w-full bg-gray-900/50 backdrop-blur-sm rounded-2xl shadow-2xl border border-gray-800 p-8 space-y-8"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
            >
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <motion.div 
                        className="space-y-4"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.6, delay: 0.3 }}
                    >
                        <h3 className="text-xl font-semibold text-white flex items-center space-x-2">
                            <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span>Original Image</span>
                        </h3>
                        <div className="aspect-square bg-gray-800 rounded-xl overflow-hidden ring-1 ring-gray-700">
                            <img alt="Original uploaded image" className="w-full h-full object-cover" src={imagePreview || ''} />
                        </div>
                    </motion.div>

                    <motion.div 
                        className="space-y-4"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.6, delay: 0.4 }}
                    >
                        <h3 className="text-xl font-semibold text-white flex items-center space-x-2">
                            <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                            </svg>
                            <span>Generated Depth Map</span>
                        </h3>
                        <div className="aspect-square bg-gray-800 rounded-xl overflow-hidden ring-1 ring-gray-700">
                            {outputUrl && <img alt="Generated depth map" className="w-full h-full object-cover" src={outputUrl} />}
                        </div>
                    </motion.div>
                </div>

                <motion.div 
                    className="border-t border-gray-700 pt-8"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.5 }}
                >
                    <div className="bg-gray-800/50 rounded-xl p-6 mb-8">
                        <h4 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
                            <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>Processing Details</span>
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                            <div className="flex items-center space-x-3 p-3 bg-gray-900/50 rounded-lg">
                                <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                                <div>
                                    <p className="text-gray-400">Model Used</p>
                                    <p className="text-white font-medium">Depth-Anything-V2-Small</p>
                                </div>
                            </div>
                            <div className="flex items-center space-x-3 p-3 bg-gray-900/50 rounded-lg">
                                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                                <div>
                                    <p className="text-gray-400">Processing Time</p>
                                    <p className="text-white font-medium">{processingTime?.toFixed(1)}s</p>
                                </div>
                            </div>
                            <div className="flex items-center space-x-3 p-3 bg-gray-900/50 rounded-lg">
                                <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                                <div>
                                    <p className="text-gray-400">Resolution</p>
                                    <p className="text-white font-medium">{outputResolution}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4">
                        <motion.button 
                            onClick={onSave} 
                            className="flex-1 flex items-center justify-center space-x-2 px-6 py-3 rounded-xl text-base font-semibold text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900 transition-all duration-300 shadow-lg hover:shadow-xl"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <span>Download Depth Map</span>
                        </motion.button>
                        
                        <motion.button 
                            onClick={onEdit} 
                            className="flex-1 flex items-center justify-center space-x-2 px-6 py-3 rounded-xl text-base font-semibold text-gray-400 bg-gray-800 hover:text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:ring-offset-gray-900 transition-all duration-300 border border-gray-600 hover:border-gray-500"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            <span>Edit Further</span>
                        </motion.button>
                    </div>

                    <motion.button 
                        onClick={onReset} 
                        className="w-full mt-4 flex items-center justify-center space-x-2 px-6 py-3 rounded-xl text-base font-medium text-blue-400 hover:text-blue-300 hover:bg-blue-400/10 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900 transition-all duration-300 border border-blue-400/30 hover:border-blue-400/50"
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        <span>Generate New Depth Map</span>
                    </motion.button>
                </motion.div>
            </motion.div>
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
        <AnimatedPage>
            <div className="relative flex min-h-screen flex-col bg-gray-950 text-white">
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

                {/* Status Section */}
                {(uiState === 'loading_model' || uiState === 'processing' || uiState === 'error') && (
                    <motion.div 
                        className="fixed bottom-8 left-1/2 transform -translate-x-1/2 bg-gray-900/90 backdrop-blur-sm border border-gray-700 rounded-xl p-6 shadow-2xl z-50 min-w-[300px]"
                        initial={{ opacity: 0, y: 100 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 100 }}
                    >
                        {uiState === 'error' ? (
                            <div className="flex items-center space-x-3 text-red-400">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span className="font-medium">{errorMessage}</span>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <div className="flex items-center space-x-3">
                                    <svg className="w-5 h-5 text-blue-400 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                    </svg>
                                    <span className="font-medium text-white">
                                        {uiState === 'loading_model' ? 'Preparing AI Engine...' : 'Processing Image...'}
                                    </span>
                                </div>
                                <ProgressBar message={uiState === 'loading_model' ? 'Loading model...' : 'Processing...'} />
                            </div>
                        )}
                    </motion.div>
                )}

                <Footer />
            </div>
        </AnimatedPage>
    );
};

export default DepthMapPage;