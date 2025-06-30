import { useCallback, useState } from 'react';

interface ImageUploaderProps {
  onImageUpload: (imageData: string) => void;
}

const ImageUploader = ({ onImageUpload }: ImageUploaderProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleFileSelect = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file');
      return;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      alert('File size must be less than 10MB');
      return;
    }

    setIsLoading(true);
    
    try {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result;
        if (typeof result === 'string') {
          onImageUpload(result);
        }
        setIsLoading(false);
      };
      reader.onerror = () => {
        alert('Error reading file');
        setIsLoading(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error loading image:', error);
      alert('Error loading image');
      setIsLoading(false);
    }
  }, [onImageUpload]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  return (
    <div className="w-full h-full min-h-[500px] flex items-center justify-center">
      <div
        className={`
          relative w-full h-full border-2 border-dashed rounded-xl p-8
          flex flex-col items-center justify-center text-center
          transition-all duration-200 cursor-pointer
          ${isDragging 
            ? 'border-[var(--primary)] bg-[var(--primary)]/5' 
            : 'border-[var(--border)] hover:border-[var(--primary)] hover:bg-[var(--surface)]'
          }
        `}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => document.getElementById('file-input')?.click()}
      >
        <input
          id="file-input"
          type="file"
          accept="image/*"
          onChange={handleFileInput}
          className="hidden"
        />

        {isLoading ? (
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin"></div>
            <p className="text-[var(--text)] font-medium">Loading image...</p>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <div className="w-16 h-16 mx-auto mb-4 bg-[var(--primary)]/10 rounded-full flex items-center justify-center">
                <span className="material-symbols-outlined text-3xl text-[var(--primary)]">
                  upload
                </span>
              </div>
              <h3 className="text-xl font-semibold text-[var(--text)] mb-2">
                Upload Your Image
              </h3>
              <p className="text-[var(--text-secondary)] text-sm mb-4">
                Drag and drop an image here, or click to browse
              </p>
            </div>

            <div className="space-y-2 text-xs text-[var(--text-secondary)]">
              <p>• Supported formats: JPG, PNG, WebP</p>
              <p>• Maximum file size: 10MB</p>
              <p>• For best results, use high-resolution images</p>
            </div>

            {isDragging && (
              <div className="absolute inset-0 bg-[var(--primary)]/10 rounded-xl flex items-center justify-center">
                <div className="text-[var(--primary)] font-semibold text-lg">
                  Drop your image here
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ImageUploader;