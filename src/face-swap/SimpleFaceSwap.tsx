import React, { useState, useCallback, useRef } from 'react';
import { RealFaceSwap } from './lib/RealFaceSwap';
import PixelArtFaceSwap from './components/PixelArtFaceSwap';
import './SimpleFaceSwap.css';

const SimpleFaceSwap: React.FC = () => {
  const [sourceImage, setSourceImage] = useState<string | null>(null);
  const [targetImage, setTargetImage] = useState<string | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useRealModel, setUseRealModel] = useState(false);

  const sourceInputRef = useRef<HTMLInputElement>(null);
  const targetInputRef = useRef<HTMLInputElement>(null);
  const faceSwapperRef = useRef<RealFaceSwap | null>(null);

  const handleImageUpload = useCallback((
    event: React.ChangeEvent<HTMLInputElement>,
    type: 'source' | 'target'
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      if (type === 'source') {
        setSourceImage(dataUrl);
      } else {
        setTargetImage(dataUrl);
      }
      setError(null);
      setResultImage(null);
    };
    reader.readAsDataURL(file);
  }, []);

  const performFaceSwap = useCallback(async () => {
    if (!sourceImage || !targetImage) {
      setError('Please upload both source and target images');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const sourceImg = new Image();
      const targetImg = new Image();
      
      await new Promise<void>((resolve) => {
        let loaded = 0;
        const checkLoaded = () => {
          loaded++;
          if (loaded === 2) resolve();
        };
        
        sourceImg.onload = checkLoaded;
        targetImg.onload = checkLoaded;
        sourceImg.src = sourceImage;
        targetImg.src = targetImage;
      });

      // Create canvases for processing
      const sourceCanvas = document.createElement('canvas');
      const targetCanvas = document.createElement('canvas');
      
      sourceCanvas.width = sourceImg.width;
      sourceCanvas.height = sourceImg.height;
      targetCanvas.width = targetImg.width;
      targetCanvas.height = targetImg.height;
      
      const sourceCtx = sourceCanvas.getContext('2d')!;
      const targetCtx = targetCanvas.getContext('2d')!;
      
      sourceCtx.drawImage(sourceImg, 0, 0);
      targetCtx.drawImage(targetImg, 0, 0);

      let resultCanvas: HTMLCanvasElement;

      if (useRealModel) {
        // Try to use the real face swap model
        try {
          if (!faceSwapperRef.current) {
            faceSwapperRef.current = new RealFaceSwap();
            await faceSwapperRef.current.initialize();
          }
          resultCanvas = await faceSwapperRef.current.swapFaces(sourceCanvas, targetCanvas);
        } catch (modelError) {
          console.error('Model failed, falling back to demo mode:', modelError);
          // Fallback to demo mode
          resultCanvas = await performDemoSwap(sourceCanvas, targetCanvas);
        }
      } else {
        // Use improved demo swap
        resultCanvas = await performDemoSwap(sourceCanvas, targetCanvas);
      }
      
      setResultImage(resultCanvas.toDataURL('image/jpeg', 0.9));
    } catch (err) {
      console.error('Face swap error:', err);
      setError('Face swap failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  }, [sourceImage, targetImage, useRealModel]);

  const performDemoSwap = async (
    sourceCanvas: HTMLCanvasElement,
    targetCanvas: HTMLCanvasElement
  ): Promise<HTMLCanvasElement> => {
    const resultCanvas = document.createElement('canvas');
    const ctx = resultCanvas.getContext('2d')!;
    
    resultCanvas.width = targetCanvas.width;
    resultCanvas.height = targetCanvas.height;
    
    // Draw target image as base
    ctx.drawImage(targetCanvas, 0, 0);
    
    // Calculate face regions
    const targetFaceX = targetCanvas.width * 0.25;
    const targetFaceY = targetCanvas.height * 0.15;
    const targetFaceWidth = targetCanvas.width * 0.5;
    const targetFaceHeight = targetCanvas.height * 0.6;
    
    // Create elliptical mask for better blending
    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = targetCanvas.width;
    maskCanvas.height = targetCanvas.height;
    const maskCtx = maskCanvas.getContext('2d')!;
    
    const centerX = targetFaceX + targetFaceWidth / 2;
    const centerY = targetFaceY + targetFaceHeight / 2;
    
    const gradient = maskCtx.createRadialGradient(
      centerX, centerY, 0,
      centerX, centerY, Math.max(targetFaceWidth, targetFaceHeight) * 0.5
    );
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.6, 'rgba(255,255,255,0.9)');
    gradient.addColorStop(0.8, 'rgba(255,255,255,0.5)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    
    maskCtx.fillStyle = gradient;
    maskCtx.beginPath();
    maskCtx.ellipse(
      centerX, centerY,
      targetFaceWidth * 0.48, targetFaceHeight * 0.5,
      0, 0, 2 * Math.PI
    );
    maskCtx.fill();
    
    // Extract source face with similar proportions
    const sourceFaceX = sourceCanvas.width * 0.25;
    const sourceFaceY = sourceCanvas.height * 0.15;
    const sourceFaceWidth = sourceCanvas.width * 0.5;
    const sourceFaceHeight = sourceCanvas.height * 0.6;
    
    // Apply face swap with smooth blending
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 0.9;
    
    // Create temporary canvas for masked face
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = targetCanvas.width;
    tempCanvas.height = targetCanvas.height;
    const tempCtx = tempCanvas.getContext('2d')!;
    
    // Draw scaled source face
    tempCtx.drawImage(
      sourceCanvas,
      sourceFaceX, sourceFaceY, sourceFaceWidth, sourceFaceHeight,
      targetFaceX, targetFaceY, targetFaceWidth, targetFaceHeight
    );
    
    // Apply mask
    tempCtx.globalCompositeOperation = 'destination-in';
    tempCtx.drawImage(maskCanvas, 0, 0);
    
    // Draw masked face onto result
    ctx.drawImage(tempCanvas, 0, 0);
    ctx.restore();
    
    return resultCanvas;
  };

  const downloadResult = useCallback(() => {
    if (!resultImage) return;
    
    const link = document.createElement('a');
    link.href = resultImage;
    link.download = `face-swap-${Date.now()}.jpg`;
    link.click();
  }, [resultImage]);

  const reset = useCallback(() => {
    setSourceImage(null);
    setTargetImage(null);
    setResultImage(null);
    setError(null);
    if (sourceInputRef.current) sourceInputRef.current.value = '';
    if (targetInputRef.current) targetInputRef.current.value = '';
  }, []);

  return (
    <div className="simple-face-swap">
      <div className="face-swap-content">
        <div className="face-swap-header">
          <PixelArtFaceSwap />
          <h1 className="face-swap-title">AI Face Swap</h1>
          <p className="face-swap-subtitle">
            Swap faces between images with advanced AI technology
          </p>
        </div>

        {error && (
          <div className="error-message">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <div className="model-toggle">
          <label className="toggle-label">
            <input
              type="checkbox"
              checked={useRealModel}
              onChange={(e) => setUseRealModel(e.target.checked)}
              className="toggle-input"
            />
            <span className="toggle-slider"></span>
            <span className="toggle-text">
              {useRealModel ? 'AI Model (Beta)' : 'Demo Mode'}
            </span>
          </label>
        </div>

        <div className="upload-section">
          <div className="upload-card">
            <h3>Source Face</h3>
            <input
              ref={sourceInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => handleImageUpload(e, 'source')}
              id="source-upload"
              className="hidden-input"
            />
            <label htmlFor="source-upload" className="upload-area">
              {sourceImage ? (
                <img src={sourceImage} alt="Source" className="preview-image" />
              ) : (
                <div className="upload-placeholder">
                  <span className="upload-icon">📸</span>
                  <span>Upload source image</span>
                  <span className="upload-hint">Click or drag & drop</span>
                </div>
              )}
            </label>
          </div>

          <div className="swap-arrow">
            <span>→</span>
          </div>

          <div className="upload-card">
            <h3>Target Image</h3>
            <input
              ref={targetInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => handleImageUpload(e, 'target')}
              id="target-upload"
              className="hidden-input"
            />
            <label htmlFor="target-upload" className="upload-area">
              {targetImage ? (
                <img src={targetImage} alt="Target" className="preview-image" />
              ) : (
                <div className="upload-placeholder">
                  <span className="upload-icon">🎯</span>
                  <span>Upload target image</span>
                  <span className="upload-hint">Click or drag & drop</span>
                </div>
              )}
            </label>
          </div>
        </div>

        <div className="action-buttons">
          <button
            className="swap-button primary"
            onClick={performFaceSwap}
            disabled={!sourceImage || !targetImage || isProcessing}
          >
            {isProcessing ? (
              <>
                <span className="spinner"></span>
                Processing...
              </>
            ) : (
              <>
                <span>✨</span>
                Swap Faces
              </>
            )}
          </button>

          {(sourceImage || targetImage || resultImage) && (
            <button
              className="swap-button secondary"
              onClick={reset}
            >
              <span>🔄</span>
              Reset
            </button>
          )}
        </div>

        {resultImage && (
          <div className="result-section">
            <h2>Result</h2>
            <div className="result-container">
              <img src={resultImage} alt="Result" className="result-image" />
              <button
                className="download-button"
                onClick={downloadResult}
              >
                <span>💾</span>
                Download Result
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SimpleFaceSwap; 