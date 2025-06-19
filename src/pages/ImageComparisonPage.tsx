import React, { useState, useCallback } from 'react';
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
  const [enableAnnotations, setEnableAnnotations] = useState(false);
  const [enableOcr, setEnableOcr] = useState(true);
  const [enableClassification, setEnableClassification] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, setImage: React.Dispatch<React.SetStateAction<File | null>>, setPreview: React.Dispatch<React.SetStateAction<string | null>>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImage(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, setImage: React.Dispatch<React.SetStateAction<File | null>>, setPreview: React.Dispatch<React.SetStateAction<string | null>>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setImage(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleCompare = () => {
    if (image1 && image2) {
      navigate('/compare/results', {
        state: {
          image1: URL.createObjectURL(image1),
          image2: URL.createObjectURL(image2),
          enableAnnotations,
          enableOcr,
          enableClassification,
        },
      });
    } else {
      alert('Please upload both images.');
    }
  };

  const FileInput: React.FC<{
    id: string;
    image: File | null;
    preview: string | null;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  }> = ({ id, preview, onChange, onDrop }) => (
    <div className="flex flex-col">
      <h3 className="text-[var(--text-primary)] text-xl font-semibold leading-tight tracking-[-0.015em] px-4 pb-3 pt-2">{id}</h3>
      <div
        className="flex flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed border-[var(--border-color)] p-6 sm:p-8 md:p-10 aspect-[4/3] hover:border-[var(--text-primary)] transition-colors cursor-pointer group"
        onDrop={onDrop}
        onDragOver={handleDragOver}
        onClick={() => document.getElementById(`file-input-${id.toLowerCase().replace(' ', '-')}`)?.click()}
      >
        {preview ? (
          <img src={preview} alt="Preview" className="max-h-full max-w-full object-contain rounded-lg" />
        ) : (
          <>
            <svg className="w-12 h-12 text-[var(--border-color)] group-hover:text-[var(--text-primary)] transition-colors" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 16.5V9.75m0 0 3 3m-3-3-3 3M6.75 19.5a4.5 4.5 0 0 1-1.41-8.775 5.25 5.25 0 0 1 10.338 2.169M15 19.5a4.5 4.5 0 0 1-1.41-8.775 5.25 5.25 0 0 1 10.338 2.169" strokeLinecap="round" strokeLinejoin="round"></path>
            </svg>
            <div className="flex flex-col items-center gap-1 text-center">
              <p className="text-[var(--text-primary)] text-base sm:text-lg font-medium leading-tight">Upload {id}</p>
              <p className="text-[var(--text-secondary)] text-xs sm:text-sm font-normal leading-normal">Drag & drop or click to browse</p>
            </div>
          </>
        )}
        <input id={`file-input-${id.toLowerCase().replace(' ', '-')}`} aria-label={`Upload ${id}`} className="sr-only" type="file" accept="image/*" onChange={onChange} />
      </div>
    </div>
  );

  const Toggle: React.FC<{
    label: string;
    enabled: boolean;
    setEnabled: (enabled: boolean) => void;
  }> = ({ label, enabled, setEnabled }) => (
     <div className="flex items-center justify-between">
      <span className="text-[var(--text-primary)] text-sm font-medium">{label}</span>
      <div className="relative">
        <input className="sr-only toggle-checkbox" id={`toggle-${label.toLowerCase().replace(/\s/g, '-')}`} type="checkbox" checked={enabled} onChange={() => setEnabled(!enabled)} />
        <label className="toggle-label" htmlFor={`toggle-${label.toLowerCase().replace(/\s/g, '-')}`}></label>
      </div>
    </div>
  );

  return (
    <div className="bg-[var(--secondary-color)] text-[var(--text-primary)]">
      <style>{`
        :root {
          --primary-color: #000000;
          --secondary-color: #1a1a1a;
          --accent-color: #363636;
          --text-primary: #ffffff;
          --text-secondary: #adadad;
          --border-color: #4d4d4d;
        }
        body {
          font-family: "Space Grotesk", "Noto Sans", sans-serif;
        }
        .toggle-checkbox:checked+.toggle-label {
          background-color: var(--primary-color);
        }
        .toggle-checkbox:checked+.toggle-label::after {
          transform: translateX(100%);
          border-color: var(--primary-color);
        }
        .toggle-label {
          width: 40px;
          height: 20px;
          background-color: var(--accent-color);
          border-radius: 9999px;
          position: relative;
          transition: background-color 0.2s ease;
          cursor: pointer;
        }
        .toggle-label::after {
          content: '';
          position: absolute;
          top: 2px;
          left: 2px;
          width: 16px;
          height: 16px;
          background-color: white;
          border-radius: 9999px;
          transition: transform 0.2s ease;
        }
      `}</style>
      <div className="relative flex size-full min-h-screen flex-col dark group/design-root overflow-x-hidden">
        <div className="layout-container flex h-full grow flex-col">
          <Header />
          <main className="px-4 sm:px-8 md:px-16 lg:px-24 xl:px-40 flex flex-1 justify-center py-8 sm:py-12">
            <motion.div 
              className="layout-content-container flex flex-col w-full max-w-3xl py-5"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="flex flex-col items-center text-center gap-3 p-4 mb-8">
                <h2 className="text-[var(--text-primary)] text-3xl sm:text-4xl font-bold leading-tight tracking-tight">Compare Images</h2>
                <p className="text-[var(--text-secondary)] text-base sm:text-lg font-normal leading-normal max-w-md">
                  Upload two images to compare their quality and details. Our AI will help you spot the differences.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
                <FileInput id="Image 1" image={image1} preview={image1Preview} onChange={(e) => handleFileChange(e, setImage1, setImage1Preview)} onDrop={(e) => handleDrop(e, setImage1, setImage1Preview)} />
                <FileInput id="Image 2" image={image2} preview={image2Preview} onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleFileChange(e, setImage2, setImage2Preview)} onDrop={(e: React.DragEvent<HTMLDivElement>) => handleDrop(e, setImage2, setImage2Preview)} />
              </div>
              <div className="mt-8 px-4 space-y-4">
                <Toggle label="Enable Annotations" enabled={enableAnnotations} setEnabled={setEnableAnnotations} />
                <Toggle label="Enable OCR" enabled={enableOcr} setEnabled={setEnableOcr} />
                <Toggle label="Enable Image Classification" enabled={enableClassification} setEnabled={setEnableClassification} />
              </div>
              <div className="flex px-4 py-8 justify-center">
                <motion.button 
                  className="flex min-w-[180px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-full h-12 px-8 bg-[var(--primary-color)] text-[var(--text-primary)] text-base font-bold leading-normal tracking-[0.015em] hover:opacity-90 transition-opacity shadow-lg"
                  onClick={handleCompare}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M3 7.5 7.5 3m0 0L12 7.5M7.5 3v13.5m13.5 0L16.5 21m0 0L12 16.5m4.5 4.5V7.5" strokeLinecap="round" strokeLinejoin="round"></path>
                  </svg>
                  <span className="truncate">Compare Images</span>
                </motion.button>
              </div>
            </motion.div>
          </main>
          <Footer />
        </div>
      </div>
    </div>
  );
};

export default ImageComparisonPage; 