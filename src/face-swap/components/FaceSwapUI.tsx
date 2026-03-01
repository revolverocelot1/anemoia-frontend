import React, { useState, useCallback, useRef, useEffect } from 'react';
import { FaceSwapEngine, FaceSwapConfig, SwapResult } from '../lib/FaceSwapEngine';
import { ModelLoader } from './ModelLoader';
import { ImageUploader } from './ImageUploader';
import { SettingsPanel } from './SettingsPanel';
import { FaceSelector } from './FaceSelector';
import { PreviewCanvas } from './PreviewCanvas';
import { ReactiveButton } from './ReactiveButton';
import { useSoundEffects } from './SoundEffects';
import './FaceSwapUI.css';

interface FaceSwapUIProps {
  className?: string;
}

interface FaceInfo {
  id: number;
  selected: boolean;
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export const FaceSwapUI: React.FC<FaceSwapUIProps> = ({ className }) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [loadingStatus, setLoadingStatus] = useState('');
  
  const [sourceImage, setSourceImage] = useState<ImageData | null>(null);
  const [targetImage, setTargetImage] = useState<ImageData | null>(null);
  const [resultImage, setResultImage] = useState<ImageData | null>(null);
  
  const [sourceFaces, setSourceFaces] = useState<FaceInfo[]>([]);
  const [targetFaces, setTargetFaces] = useState<FaceInfo[]>([]);
  const [selectedSourceFace, setSelectedSourceFace] = useState(0);
  const [selectedTargetFaces, setSelectedTargetFaces] = useState<number[]>([]);
  
  const [config, setConfig] = useState<FaceSwapConfig>({
    modelQuality: 'medium',
    enableEnhancement: false,
    blendingMode: 'poisson',
    preserveExpression: true,
    useWebGL: true,
  });
  
  const [showSettings, setShowSettings] = useState(false);
  const [processingTime, setProcessingTime] = useState<number | null>(null);
  
  const engineRef = useRef<FaceSwapEngine | null>(null);
  const { playSound } = useSoundEffects();

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (engineRef.current) {
        engineRef.current.dispose();
      }
    };
  }, []);

  // Initialize engine with selected config
  const handleInitialize = useCallback(async (quality: 'low' | 'medium' | 'high') => {
    try {
      setError(null);
      setProgress(0);
      setLoadingStatus('Initializing Face Swap Engine...');
      
      const newConfig = { ...config, modelQuality: quality };
      setConfig(newConfig);
      
      // Create new engine instance
      engineRef.current = new FaceSwapEngine(newConfig);
      
      // Initialize with progress updates
      await engineRef.current.initialize();
      
      setIsInitialized(true);
      setLoadingStatus('');
      
      // Add smooth transition
      setTimeout(() => {
        const mainContent = document.querySelector('.face-swap-main-content');
        if (mainContent) {
          mainContent.classList.add('visible');
        }
      }, 100);
    } catch (err) {
      console.error('Initialization failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to initialize Face Swap Engine');
      setLoadingStatus('');
    }
  }, [config]);

  // Handle source image upload
  const handleSourceUpload = useCallback(async (imageData: ImageData) => {
    setSourceImage(imageData);
    setResultImage(null);
    setProcessingTime(null);
    
    if (engineRef.current) {
      try {
        setLoadingStatus('Detecting faces in source image...');
        const facesDetected = await engineRef.current.detectFaces(imageData);
        const faces: FaceInfo[] = facesDetected.map((face, index) => ({
          id: index,
          selected: index === 0,
          boundingBox: face.boundingBox
        }));
        setSourceFaces(faces);
        setSelectedSourceFace(0);
        setLoadingStatus('');
      } catch (err) {
        console.error('Face detection failed:', err);
        setError('Failed to detect faces in source image');
        setLoadingStatus('');
      }
    }
  }, []);

  // Handle target image upload
  const handleTargetUpload = useCallback(async (imageData: ImageData) => {
    setTargetImage(imageData);
    setResultImage(null);
    setProcessingTime(null);
    
    if (engineRef.current) {
      try {
        setLoadingStatus('Detecting faces in target image...');
        const facesDetected = await engineRef.current.detectFaces(imageData);
        const faces: FaceInfo[] = facesDetected.map((face, index) => ({
          id: index,
          selected: true,
          boundingBox: face.boundingBox
        }));
        setTargetFaces(faces);
        setSelectedTargetFaces(faces.map((_, index) => index));
        setLoadingStatus('');
      } catch (err) {
        console.error('Face detection failed:', err);
        setError('Failed to detect faces in target image');
        setLoadingStatus('');
      }
    }
  }, []);

  // Handle face selection
  const handleSourceFaceSelect = useCallback((faceId: number) => {
    setSelectedSourceFace(faceId);
    setSourceFaces(faces => faces.map(face => ({
      ...face,
      selected: face.id === faceId
    })));
  }, []);

  const handleTargetFaceToggle = useCallback((faceId: number) => {
    setTargetFaces(faces => faces.map(face => 
      face.id === faceId ? { ...face, selected: !face.selected } : face
    ));
    
    setSelectedTargetFaces(prev => {
      if (prev.includes(faceId)) {
        return prev.filter(id => id !== faceId);
      } else {
        return [...prev, faceId].sort((a, b) => a - b);
      }
    });
  }, []);

  // Perform face swap
  const handleSwap = useCallback(async () => {
    if (!engineRef.current || !sourceImage || !targetImage) {
      setError('Please upload both source and target images');
      return;
    }

    if (selectedTargetFaces.length === 0) {
      setError('Please select at least one target face to swap');
      return;
    }

    try {
      setIsProcessing(true);
      setError(null);
      setProgress(0);
      
      // Animate progress
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const result = await engineRef.current.swapFaces(
        sourceImage,
        targetImage,
        selectedSourceFace,
        selectedTargetFaces
      );

      clearInterval(progressInterval);
      setProgress(100);
      
      setResultImage(result.image);
      setProcessingTime(result.processingTime);
      
      // Play success sound
      playSound('success');
      
      // Smooth transition
      setTimeout(() => {
        const resultSection = document.querySelector('.result-section');
        if (resultSection) {
          resultSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 300);
    } catch (err) {
      console.error('Face swap failed:', err);
      setError(err instanceof Error ? err.message : 'Face swap failed');
      playSound('error');
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  }, [sourceImage, targetImage, selectedSourceFace, selectedTargetFaces]);

  // Handle settings update
  const handleConfigUpdate = useCallback((newConfig: Partial<FaceSwapConfig>) => {
    setConfig(prev => ({ ...prev, ...newConfig }));
    
    // If model quality changed, reinitialize
    if (newConfig.modelQuality && engineRef.current) {
      setIsInitialized(false);
      engineRef.current.dispose();
      handleInitialize(newConfig.modelQuality);
    } else if (engineRef.current) {
      // Update existing engine config
      Object.assign(engineRef.current, { config: { ...config, ...newConfig } });
    }
  }, [config, handleInitialize]);

  // Handle download result
  const handleDownload = useCallback(() => {
    if (!resultImage) return;
    
    const canvas = document.createElement('canvas');
    canvas.width = resultImage.width;
    canvas.height = resultImage.height;
    const ctx = canvas.getContext('2d')!;
    ctx.putImageData(resultImage, 0, 0);
    
    canvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `face-swap-${Date.now()}.png`;
        a.click();
        URL.revokeObjectURL(url);
      }
    });
  }, [resultImage]);

  // Reset everything
  const handleReset = useCallback(() => {
    setSourceImage(null);
    setTargetImage(null);
    setResultImage(null);
    setSourceFaces([]);
    setTargetFaces([]);
    setSelectedSourceFace(0);
    setSelectedTargetFaces([]);
    setProcessingTime(null);
    setError(null);
  }, []);

  return (
    <div className={`face-swap-ui ${className || ''}`}>
      {!isInitialized ? (
        <ModelLoader
          onInitialize={handleInitialize}
          error={error}
          progress={progress}
          status={loadingStatus}
        />
      ) : (
        <div className="face-swap-main-content">
          <div className="face-swap-header">
            <h1 className="face-swap-title">AI Face Swap</h1>
            <p className="face-swap-subtitle">
              Swap faces between images with advanced AI technology
            </p>
            <button
              className="settings-button"
              onClick={() => setShowSettings(!showSettings)}
              aria-label="Toggle settings"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <circle cx="12" cy="12" r="3" />
                <path d="M12 1v6m0 6v6m-9-9h6m6 0h6" />
              </svg>
            </button>
          </div>

          {showSettings && (
            <div className="settings-wrapper animate-slide-down">
              <SettingsPanel
                config={config}
                onConfigUpdate={handleConfigUpdate}
              />
            </div>
          )}

          {error && (
            <div className="error-message animate-shake">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" />
              </svg>
              {error}
            </div>
          )}

          <div className="upload-section">
            <div className="upload-container source-upload">
              <h3>Source Face</h3>
              <ImageUploader
                onImageUpload={handleSourceUpload}
                label="Upload source image"
                accept="image/*"
                className="source-uploader"
              />
              {sourceImage && sourceFaces.length > 0 && (
                <FaceSelector
                  image={sourceImage}
                  faces={sourceFaces}
                  selectedFaces={[selectedSourceFace]}
                  onFaceSelect={handleSourceFaceSelect}
                  singleSelect
                  className="animate-fade-in"
                />
              )}
            </div>

            <div className="swap-arrow">
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                <path d="M25 10L35 20L25 30" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M5 20H35" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>

            <div className="upload-container target-upload">
              <h3>Target Image</h3>
              <ImageUploader
                onImageUpload={handleTargetUpload}
                label="Upload target image"
                accept="image/*"
                className="target-uploader"
              />
              {targetImage && targetFaces.length > 0 && (
                <FaceSelector
                  image={targetImage}
                  faces={targetFaces}
                  selectedFaces={selectedTargetFaces}
                  onFaceSelect={handleTargetFaceToggle}
                  className="animate-fade-in"
                />
              )}
            </div>
          </div>

          {sourceImage && targetImage && (
            <div className="action-section animate-fade-in">
              <ReactiveButton
                variant="primary"
                size="large"
                onClick={handleSwap}
                disabled={isProcessing || selectedTargetFaces.length === 0}
                loading={isProcessing}
                className="swap-button"
              >
                <span>Swap Faces</span>
              </ReactiveButton>
              
              {isProcessing && (
                <div className="progress-bar">
                  <div 
                    className="progress-fill"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              )}
            </div>
          )}

          {resultImage && (
            <div className="result-section animate-fade-in">
              <h3>Result</h3>
              <PreviewCanvas
                image={resultImage}
                className="result-preview"
              />
              
              {processingTime && (
                <p className="processing-time">
                  Processed in {(processingTime / 1000).toFixed(2)}s
                </p>
              )}
              
              <div className="result-actions">
                <ReactiveButton 
                  variant="secondary" 
                  onClick={handleDownload}
                  className="download-button"
                >
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" />
                  </svg>
                  Download Result
                </ReactiveButton>
                <ReactiveButton 
                  variant="danger" 
                  onClick={handleReset}
                  className="reset-button"
                >
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" />
                  </svg>
                  Reset All
                </ReactiveButton>
              </div>
            </div>
          )}

          {loadingStatus && (
            <div className="loading-overlay animate-fade-in">
              <div className="loading-content">
                <span className="spinner large"></span>
                <p>{loadingStatus}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FaceSwapUI; 