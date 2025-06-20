import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { motion } from 'framer-motion';

const ImageComparisonPage: React.FC = () => {
  const navigate = useNavigate();
  const [image1, setImage1] = useState<File | null>(null);
  const [image2, setImage2] = useState<File | null>(null);
  const [image1Preview, setImage1Preview] = useState<string | null>(null);
  const [image2Preview, setImage2Preview] = useState<string | null>(null);
  const [enableAnnotations, setEnableAnnotations] = useState(true);
  const [enableOcr, setEnableOcr] = useState(true);
  const [enableClassification, setEnableClassification] = useState(true);
  const [normalizeRatio, setNormalizeRatio] = useState(true);
  const [isDragging, setIsDragging] = useState<number | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, imageNumber: number) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const previewUrl = URL.createObjectURL(file);
      if (imageNumber === 1) {
        setImage1(file);
        setImage1Preview(previewUrl);
      } else {
        setImage2(file);
        setImage2Preview(previewUrl);
      }
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLLabelElement>, imageNumber: number) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(null);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
       const previewUrl = URL.createObjectURL(file);
      if (imageNumber === 1) {
        setImage1(file);
        setImage1Preview(previewUrl);
      } else {
        setImage2(file);
        setImage2Preview(previewUrl);
      }
    }
  };
  
  const handleDragEvents = (e: React.DragEvent<HTMLLabelElement>, isEntering: boolean, imageNumber: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (isEntering) {
      setIsDragging(imageNumber);
    } else {
      setIsDragging(null);
    }
  };

  const handleCompare = () => {
    if (image1 && image2) {
      // Pass the blob URLs directly to avoid creating new ones on the results page
      navigate('/compare/results', {
        state: {
          image1: image1Preview,
          image2: image2Preview,
          settings: {
          enableAnnotations,
          enableOcr,
          enableClassification,
            normalizeAspectRatio: normalizeRatio,
          }
        },
      });
    } else {
      alert('Please upload both images.');
    }
  };

  return (
    <div className="bg-[#121212] text-white min-h-screen">
      <Header />
      <main className="px-4 sm:px-8 md:px-16 lg:px-24 xl:px-40 flex flex-1 justify-center py-8 sm:py-12">
        <motion.div
          className="w-full max-w-4xl"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="text-center mb-10">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">Image Comparison Tool</h2>
            <p className="mt-4 text-lg text-gray-400 max-w-2xl mx-auto">
              Upload two images to perform a deep, scientific analysis of their differences.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
            <FileInput 
                id={1} 
                label="Original Image"
                preview={image1Preview} 
                onChange={handleFileChange} 
                onDrop={handleDrop}
                onDragEnter={(e) => handleDragEvents(e, true, 1)}
                onDragLeave={(e) => handleDragEvents(e, false, 1)}
                isDragging={isDragging === 1}
            />
            <FileInput 
                id={2} 
                label="Edited Image"
                preview={image2Preview}
                onChange={handleFileChange} 
                onDrop={handleDrop}
                onDragEnter={(e) => handleDragEvents(e, true, 2)}
                onDragLeave={(e) => handleDragEvents(e, false, 2)}
                isDragging={isDragging === 2}
            />
          </div>
          
          <div className="bg-[#1E1E1E] p-6 rounded-lg shadow-2xl mb-10">
            <h3 className="text-xl font-bold mb-4 text-center">Analysis Options</h3>
            <div className="space-y-4 max-w-sm mx-auto">
              <Toggle label="Find & Annotate Differences" enabled={enableAnnotations} setEnabled={setEnableAnnotations} />
              <Toggle label="Extract Text (OCR)" enabled={enableOcr} setEnabled={setEnableOcr} description="Enhanced OCR with preprocessing for better text recognition in documents and images." />
              <Toggle label="Normalize Aspect Ratio" enabled={normalizeRatio} setEnabled={setNormalizeRatio} description="Prevents image distortion by padding the smaller image to match the other's aspect ratio." />
              <Toggle label="Enable AI Classification" enabled={enableClassification} setEnabled={setEnableClassification} description="COCO-SSD object detection for people, vehicles, animals, etc. with fallback feature analysis." />
            </div>
          </div>

          <div className="flex justify-center">
            <button
              onClick={handleCompare}
              disabled={!image1 || !image2}
              className="flex items-center justify-center w-full max-w-xs h-14 px-8 rounded-full bg-indigo-600 text-white text-lg font-bold shadow-lg hover:bg-indigo-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-all transform hover:scale-105 disabled:scale-100"
            >
              <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17l-5-5 5-5m6 10l5-5-5-5"></path></svg>
              Analyze & Compare
            </button>
          </div>
        </motion.div>
      </main>
      <Footer />
    </div>
  );
};

// --- Helper Components ---

interface FileInputProps {
    id: number;
    label: string;
    preview: string | null;
    onChange: (e: React.ChangeEvent<HTMLInputElement>, id: number) => void;
    onDrop: (e: React.DragEvent<HTMLLabelElement>, id: number) => void;
    onDragEnter: (e: React.DragEvent<HTMLLabelElement>) => void;
    onDragLeave: (e: React.DragEvent<HTMLLabelElement>) => void;
    isDragging: boolean;
}

const FileInput: React.FC<FileInputProps> = ({ id, label, preview, onChange, onDrop, onDragEnter, onDragLeave, isDragging }) => (
    <div className="flex flex-col">
      <h3 className="text-xl font-semibold mb-4 text-center">{label}</h3>
      <label 
        htmlFor={`file-input-${id}`}
        onDrop={(e) => onDrop(e, id)}
        onDragOver={(e) => e.preventDefault()}
        onDragEnter={onDragEnter}
        onDragLeave={onDragLeave}
        className={`relative flex flex-col items-center justify-center w-full aspect-video rounded-xl border-2 border-dashed transition-all duration-300 cursor-pointer
        ${isDragging ? 'border-blue-500 bg-blue-900/20' : 'border-gray-600 hover:border-gray-400'}
        ${preview ? 'border-solid' : ''}`}
      >
        {preview ? (
          <img src={preview} alt={`Preview ${id}`} className="w-full h-full object-contain rounded-lg" />
        ) : (
          <div className="text-center text-gray-400">
            <svg className="mx-auto h-12 w-12" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true"><path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            <p className="mt-2">Drag & drop or click to upload</p>
          </div>
        )}
        <input id={`file-input-${id}`} type="file" className="sr-only" accept="image/*" onChange={(e) => onChange(e, id)} />
      </label>
    </div>
);

interface ToggleProps {
  label: string;
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
  description?: string;
}

const Toggle: React.FC<ToggleProps> = ({ label, enabled, setEnabled, description }) => (
     <label className="flex items-center justify-between cursor-pointer group">
      <div>
      <span className="text-lg font-medium">{label}</span>
        {description && <p className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors">{description}</p>}
      </div>
      <div className="relative">
          <input type="checkbox" className="sr-only" checked={enabled} onChange={() => setEnabled(!enabled)} />
          <div className={`w-14 h-8 rounded-full shadow-inner transition-colors duration-300 ease-in-out ${enabled ? 'bg-green-500' : 'bg-gray-600'}`}></div>
          <div className={`absolute w-6 h-6 bg-white rounded-full shadow top-1 left-1 transition-transform duration-300 ease-in-out ${enabled ? 'transform translate-x-full' : ''}`}></div>
      </div>
    </label>
);

export default ImageComparisonPage; 