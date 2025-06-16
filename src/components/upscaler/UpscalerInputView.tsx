import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';

interface UpscalerInputViewProps {
  onImageUploaded: (file: File, scaleFactor: number) => void;
  isProcessing: boolean; // To disable inputs/button during processing
}

const UpscalerInputView: React.FC<UpscalerInputViewProps> = ({ onImageUploaded, isProcessing }) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [scaleFactor, setScaleFactor] = useState<number>(4); // Default to 4x

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles && acceptedFiles[0]) {
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
    accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'] },
    multiple: false,
    disabled: isProcessing,
  });

  const handleManualUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onload = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpscaleClick = () => {
    if (selectedFile) {
      onImageUploaded(selectedFile, scaleFactor);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="text-center mb-10">
        <h2 className="text-3xl md:text-4xl font-bold mb-3 tracking-tight text-[var(--text-primary)]">AI Image Upscaler</h2>
        <p className="text-md md:text-lg text-[var(--text-secondary)] max-w-xl mx-auto">
          Enhance your images with Real-ESRGAN. Upload a photo and select an upscale factor to begin.
        </p>
      </div>

      <div className="w-full bg-[var(--secondary-color)] p-6 md:p-8 rounded-xl shadow-xl space-y-6">
        {/* Image Upload Section */}
        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2" htmlFor="image-upload-input-field">
            Upload Image
          </label>
          <div
            {...getRootProps()}
            className={`mt-1 flex justify-center px-6 pt-10 pb-12 border-2 border-[var(--input-border-color)] border-dashed rounded-md cursor-pointer hover:border-[var(--primary-color)] transition-colors duration-150 ${
              isDragActive ? 'border-[var(--primary-color)] bg-[var(--primary-color)] bg-opacity-10' : ''
            } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <input {...getInputProps()} id="image-upload-input-field" disabled={isProcessing} />
            <div className="space-y-1 text-center">
              <span className="material-symbols-outlined text-5xl text-[var(--text-secondary)]">cloud_upload</span>
              <div className="flex text-sm text-[var(--text-secondary)]">
                <label
                  htmlFor="image-upload-input-field" // Should match the input id for click to work
                  className="relative cursor-pointer bg-[var(--secondary-color)] rounded-md font-medium text-[var(--primary-color)] hover:text-[var(--primary-color-hover)] focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-offset-[var(--secondary-color)] focus-within:ring-[var(--primary-color)]"
                >
                  <span>Upload a file</span>
                </label>
                <p className="pl-1">or drag and drop</p>
              </div>
              <p className="text-xs text-[var(--text-secondary)] opacity-75">PNG, JPG, GIF, WEBP up to 10MB</p>
            </div>
          </div>
          {previewUrl && (
            <div className="mt-4 border border-[var(--input-border-color)] rounded-lg overflow-hidden">
              <img src={previewUrl} alt="Preview" className="w-full h-auto object-contain max-h-96" />
            </div>
          )}
        </div>

        {/* Scale Factor Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2" htmlFor="scale-factor-select">
            Select Scale Factor
          </label>
          <div className="relative">
            <select
              id="scale-factor-select"
              name="scale-factor-select"
              value={scaleFactor}
              onChange={(e) => setScaleFactor(Number(e.target.value))}
              disabled={isProcessing}
              className="block w-full pl-3 pr-10 py-2.5 text-[var(--text-primary)] border border-[var(--input-border-color)] bg-[var(--input-background)] focus:outline-none focus:ring-[var(--primary-color)] focus:border-[var(--primary-color)] sm:text-sm rounded-md appearance-none"
            >
              <option value={2}>2x</option>
              <option value={4}>4x (Recommended)</option>
              {/* <option value={8}>8x (Experimental)</option> */}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-[var(--text-secondary)]">
              <span className="material-symbols-outlined">arrow_drop_down</span>
            </div>
          </div>
        </div>

        {/* Upscale Button */}
        <button
          onClick={handleUpscaleClick}
          disabled={isProcessing || !selectedFile}
          className="w-full flex items-center justify-center gap-2 rounded-lg h-12 px-6 bg-[var(--primary-color)] text-white text-base font-bold tracking-wide hover:bg-[var(--primary-color-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          type="button"
        >
          <span className="material-symbols-outlined">auto_awesome</span>
          <span>Upscale Image</span>
        </button>
      </div>
    </div>
  );
};

export default UpscalerInputView;
