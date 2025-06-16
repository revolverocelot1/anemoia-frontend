import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion } from 'framer-motion';

interface ModelCardProps {
  title: string;
  description: string;
  scale: number;
  selected: boolean;
  onSelect: () => void;
}

const ModelCard: React.FC<ModelCardProps> = ({ title, description, scale, selected, onSelect }) => {
  return (
    <motion.div
      className={`model-card ${selected ? 'selected' : ''}`}
      onClick={onSelect}
      whileHover={{ scale: 1.03 }}
      transition={{ type: 'spring', stiffness: 300 }}
    >
      <div className="flex items-center justify-between">
        <h4 className="text-lg font-bold text-white">{title}</h4>
        <div className="text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-400/50 rounded-full px-3 py-1">
          {scale}x
        </div>
      </div>
      <p className="text-sm text-gray-400 mt-1">{description}</p>
    </motion.div>
  );
};

interface UpscalerInputProps {
  onImageUploaded: (file: File, scaleFactor: number) => void;
  isProcessing: boolean;
}

const UpscalerInput: React.FC<UpscalerInputProps> = ({ onImageUploaded, isProcessing }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedScale, setSelectedScale] = useState<number>(4);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
    setError(null);
    if (rejectedFiles && rejectedFiles.length > 0) {
      setError('Please upload a valid image file (PNG, JPG, WebP).');
      return;
    }

    if (acceptedFiles && acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onload = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.webp'] },
    multiple: false,
  });

  const handleUpscaleClick = () => {
    if (selectedFile) {
      onImageUploaded(selectedFile, selectedScale);
    } else {
      setError('Please select an image first.');
    }
  };
  
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.2 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <motion.div 
      className="w-full"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.div variants={itemVariants} className="text-center mb-10">
        <h2 className="text-4xl md:text-5xl font-bold mb-2 tracking-tighter">AI Image Upscaler</h2>
        <p className="text-lg md:text-xl text-[var(--text-secondary)]">
          Enhance your images with cutting-edge AI. Up to 4x resolution.
        </p>
      </motion.div>

      <motion.div
        {...getRootProps()}
        variants={itemVariants}
        className={`upload-area ${isDragActive ? 'drag-over' : ''}`}
      >
        <input {...getInputProps()} />
        {previewUrl ? (
          <img src={previewUrl} alt="Preview" className="max-h-48 rounded-lg mx-auto" />
        ) : (
          <div className="flex flex-col items-center justify-center text-center">
            <span className="material-symbols-outlined text-6xl text-gray-500 mb-4">upload_file</span>
            <p className="font-bold text-white">Drag & drop an image here</p>
            <p className="text-sm text-gray-400">or click to select a file</p>
            <p className="text-xs text-gray-500 mt-2">Supports: PNG, JPG, WEBP</p>
          </div>
        )}
      </motion.div>

      {error && <motion.p variants={itemVariants} className="text-red-400 text-center mt-4">{error}</motion.p>}

      <motion.div variants={itemVariants} className="my-8">
        <h3 className="text-xl font-semibold mb-4 text-center text-white">Choose Upscale Factor</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ModelCard
            title="Standard Upscale"
            description="Good for general purpose, doubles resolution."
            scale={2}
            selected={selectedScale === 2}
            onSelect={() => setSelectedScale(2)}
          />
          <ModelCard
            title="High-Quality Upscale"
            description="Best for maximum detail, quadruples resolution."
            scale={4}
            selected={selectedScale === 4}
            onSelect={() => setSelectedScale(4)}
          />
        </div>
      </motion.div>

      <motion.div variants={itemVariants}>
        <button
          onClick={handleUpscaleClick}
          disabled={isProcessing || !selectedFile}
          className="button w-full h-14 text-lg pulse"
        >
          {isProcessing ? 'Processing...' : 'Start Upscaling'}
        </button>
      </motion.div>
    </motion.div>
  );
};

export default UpscalerInput; 