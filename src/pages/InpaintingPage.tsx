import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDropzone } from 'react-dropzone';
import Header from '../components/Header';
import Footer from '../components/Footer';
import InpaintingOutput from '../components/inpainting/InpaintingOutput';
// Keep ProcessingOverlay commented out until needed
// import ProcessingOverlay from '../components/inpainting/ProcessingOverlay';

// --- Helper Components & Icons ---

const UploadIcon = () => (
  <svg className="w-16 h-16 mx-auto text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
    <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// --- Main Page Component ---

const InpaintingPage: React.FC = () => {
  const [stage, setStage] = useState<'upload' | 'mask' | 'result'>('upload');
  const [originalImageFile, setOriginalImageFile] = useState<File | null>(null);
  const [resultImageUrl, setResultImageUrl] = useState<string>('');
  const [stats, setStats] = useState<any>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles && acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      setOriginalImageFile(file);
      setStage('mask');
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpeg', '.png', '.jpg'] },
    multiple: false,
  });
  
  const handleReset = () => {
    setStage('upload');
    setOriginalImageFile(null);
    setResultImageUrl('');
    setStats(null);
  }

  const renderContent = () => {
    switch (stage) {
      case 'upload':
        return (
          <div {...getRootProps()} className={`w-full h-full flex items-center justify-center border-4 border-dashed rounded-2xl cursor-pointer transition-colors ${isDragActive ? 'border-blue-500 bg-blue-500/10' : 'border-gray-600 hover:border-gray-500'}`}>
            <input {...getInputProps()} />
            <div className="text-center">
              <UploadIcon />
              <p className="mt-4 text-xl font-semibold text-gray-300">
                {isDragActive ? 'Drop the image here...' : 'Drag & drop an image, or click to select'}
              </p>
              <p className="text-sm text-gray-500">PNG, JPG up to 10MB</p>
            </div>
          </div>
        );
      case 'mask':
        return <div>Masking UI will go here</div>; // Placeholder
      case 'result':
        if (!originalImageFile) return null; // Guard clause
        return (
            <InpaintingOutput
              originalImageFile={originalImageFile}
              resultImageUrl={resultImageUrl}
              stats={stats}
              onReset={handleReset}
            />
        );
      default:
        return null;
    }
  }

  return (
    <div className="relative flex min-h-screen flex-col bg-gray-950 text-white">
      <Header />
      
      <main className="flex-1 flex flex-col items-center py-8 px-4">
        <div className="bg-gray-800 rounded-2xl shadow-2xl p-6 min-h-[60vh] flex flex-col">
          <AnimatePresence mode="wait">
            <motion.div
              key={stage}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
              className="w-full h-full"
            >
              {renderContent()}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default InpaintingPage; 