import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ProcessingOverlayProps {
  statusMessage: string;
  progress: number;
  imagePreviewUrl?: string | null;
  modelName?: string;
  imageDimensions?: { width: number; height: number } | null;
  scaleFactor?: number;
}

// Neural network node animation — represents actual processing happening
const NeuralGrid: React.FC<{ progress: number }> = ({ progress }) => {
  const nodeCount = 24;
  const activeNodes = Math.floor((progress / 100) * nodeCount);

  return (
    <div className="upscaler-neural-grid">
      {Array.from({ length: nodeCount }).map((_, i) => {
        const row = Math.floor(i / 6);
        const col = i % 6;
        const isActive = i < activeNodes;
        const delay = (row * 0.08) + (col * 0.05);

        return (
          <motion.div
            key={i}
            className={`upscaler-neural-node ${isActive ? 'active' : ''}`}
            initial={{ scale: 0, opacity: 0 }}
            animate={{
              scale: isActive ? [1, 1.3, 1] : [0.3, 0.5, 0.3],
              opacity: isActive ? 1 : 0.15,
            }}
            transition={{
              duration: isActive ? 1.2 : 2.5,
              repeat: Infinity,
              delay,
              ease: 'easeInOut',
            }}
          />
        );
      })}
      {/* Connection lines between active nodes */}
      <svg className="upscaler-neural-lines" viewBox="0 0 180 120" fill="none">
        {Array.from({ length: activeNodes - 1 }).map((_, i) => {
          const fromRow = Math.floor(i / 6);
          const fromCol = i % 6;
          const toRow = Math.floor((i + 1) / 6);
          const toCol = (i + 1) % 6;
          return (
            <motion.line
              key={i}
              x1={fromCol * 30 + 15}
              y1={fromRow * 30 + 15}
              x2={toCol * 30 + 15}
              y2={toRow * 30 + 15}
              stroke="rgba(99, 179, 237, 0.3)"
              strokeWidth="1"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
            />
          );
        })}
      </svg>
    </div>
  );
};

// Tile grid visualization — shows tiles being processed
const TileGridViz: React.FC<{ progress: number; scaleFactor: number }> = ({ progress, scaleFactor }) => {
  const gridSize = scaleFactor >= 4 ? 6 : 4;
  const totalTiles = gridSize * gridSize;
  const processedTiles = Math.floor((progress / 100) * totalTiles);

  return (
    <div className="upscaler-tile-grid" style={{ gridTemplateColumns: `repeat(${gridSize}, 1fr)` }}>
      {Array.from({ length: totalTiles }).map((_, i) => {
        const isProcessed = i < processedTiles;
        const isCurrent = i === processedTiles;

        return (
          <motion.div
            key={i}
            className={`upscaler-tile ${isProcessed ? 'processed' : ''} ${isCurrent ? 'current' : ''}`}
            initial={{ opacity: 0.1 }}
            animate={{
              opacity: isProcessed ? 1 : isCurrent ? 0.7 : 0.15,
              scale: isCurrent ? [1, 1.05, 1] : 1,
            }}
            transition={{
              duration: isCurrent ? 0.8 : 0.3,
              repeat: isCurrent ? Infinity : 0,
            }}
          />
        );
      })}
    </div>
  );
};

// Stage indicator with real descriptive text
const stageInfo = (progress: number, statusMessage: string) => {
  if (progress === 0 || statusMessage.includes('Preparing')) {
    return { stage: 'prepare', label: 'Preparing', detail: 'Decoding image and allocating memory', icon: '📐' };
  }
  if (statusMessage.includes('Downloading') || statusMessage.includes('Loading') || statusMessage.includes('model')) {
    return { stage: 'model', label: 'Loading Model', detail: 'Fetching neural network weights', icon: '🧠' };
  }
  if (statusMessage.includes('Pass 1')) {
    return { stage: 'pass1', label: 'First Pass', detail: 'Running inference on image tiles', icon: '⚡' };
  }
  if (statusMessage.includes('Pass 2')) {
    return { stage: 'pass2', label: 'Second Pass', detail: 'Double-upscaling for 8x output', icon: '🔄' };
  }
  if (progress >= 95) {
    return { stage: 'finalize', label: 'Finalizing', detail: 'Assembling tiles and encoding output', icon: '✨' };
  }
  return { stage: 'process', label: 'Processing', detail: 'Enhancing detail with AI super-resolution', icon: '⚡' };
};

const ProcessingOverlay: React.FC<ProcessingOverlayProps> = ({
  statusMessage,
  progress,
  imagePreviewUrl,
  modelName,
  imageDimensions,
  scaleFactor = 2,
}) => {
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef(Date.now());
  const [smoothProgress, setSmoothProgress] = useState(0);

  // Smooth progress interpolation
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      setSmoothProgress(prev => prev + (progress - prev) * 0.15);
    });
    return () => cancelAnimationFrame(id);
  }, [progress, smoothProgress]);

  // Elapsed timer
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const info = stageInfo(progress, statusMessage);
  const outW = imageDimensions ? imageDimensions.width * scaleFactor : null;
  const outH = imageDimensions ? imageDimensions.height * scaleFactor : null;
  const etaSeconds = progress > 5 ? Math.round(((elapsed / progress) * (100 - progress))) : null;

  return (
    <motion.div
      className="upscaler-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* Background animated scanlines */}
      <div className="upscaler-scanlines" />

      <motion.div
        className="upscaler-overlay-card"
        initial={{ scale: 0.92, y: 30 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.92, y: 30 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Top section: Image preview + neural viz */}
        <div className="upscaler-overlay-top">
          {/* Image preview with scan effect */}
          <div className="upscaler-preview-container">
            {imagePreviewUrl ? (
              <div className="upscaler-preview-img-wrap">
                <img src={imagePreviewUrl} alt="Processing" className="upscaler-preview-img" />
                {/* Scanning line overlay */}
                <motion.div
                  className="upscaler-scan-line"
                  animate={{ top: ['0%', '100%', '0%'] }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                />
                {/* Tile grid overlay */}
                <div className="upscaler-tile-overlay">
                  <TileGridViz progress={smoothProgress} scaleFactor={scaleFactor} />
                </div>
              </div>
            ) : (
              <div className="upscaler-preview-placeholder">
                <NeuralGrid progress={smoothProgress} />
              </div>
            )}
          </div>

          {/* Status badge */}
          <div className="upscaler-stage-badge">
            <span className="upscaler-stage-icon">{info.icon}</span>
            <span className="upscaler-stage-label">{info.label}</span>
          </div>
        </div>

        {/* Middle section: Progress */}
        <div className="upscaler-overlay-mid">
          {/* Main status */}
          <AnimatePresence mode="wait">
            <motion.div
              key={statusMessage}
              className="upscaler-status-text"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
            >
              {statusMessage}
            </motion.div>
          </AnimatePresence>
          <div className="upscaler-status-detail">{info.detail}</div>

          {/* Progress bar */}
          <div className="upscaler-progress-wrap">
            <div className="upscaler-progress-track">
              <motion.div
                className="upscaler-progress-fill"
                style={{ width: `${smoothProgress}%` }}
              >
                <div className="upscaler-progress-glow" />
              </motion.div>
            </div>
            <div className="upscaler-progress-labels">
              <span className="upscaler-progress-pct">{Math.round(smoothProgress)}%</span>
              <span className="upscaler-progress-time">
                {elapsed}s elapsed{etaSeconds !== null && etaSeconds > 0 ? ` · ~${etaSeconds}s remaining` : ''}
              </span>
            </div>
          </div>
        </div>

        {/* Bottom section: Metadata */}
        <div className="upscaler-overlay-bottom">
          {modelName && (
            <div className="upscaler-meta-row">
              <span className="upscaler-meta-label">Model</span>
              <span className="upscaler-meta-value">{modelName}</span>
            </div>
          )}
          {imageDimensions && (
            <div className="upscaler-meta-row">
              <span className="upscaler-meta-label">Resolution</span>
              <span className="upscaler-meta-value">
                {imageDimensions.width}×{imageDimensions.height}
                <span className="upscaler-meta-arrow">→</span>
                {outW}×{outH}
              </span>
            </div>
          )}
          <div className="upscaler-meta-row">
            <span className="upscaler-meta-label">Engine</span>
            <span className="upscaler-meta-value upscaler-meta-live">
              <span className="upscaler-live-dot" />
              TensorFlow.js · GPU Accelerated
            </span>
          </div>
        </div>
      </motion.div>

      <style>{`
        .upscaler-overlay {
          position: fixed;
          inset: 0;
          z-index: 60;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(3, 7, 18, 0.92);
          backdrop-filter: blur(20px) saturate(0.8);
        }

        .upscaler-scanlines {
          position: absolute;
          inset: 0;
          background: repeating-linear-gradient(
            0deg,
            transparent,
            transparent 2px,
            rgba(99, 179, 237, 0.015) 2px,
            rgba(99, 179, 237, 0.015) 4px
          );
          pointer-events: none;
          animation: upscaler-scanline-shift 8s linear infinite;
        }

        @keyframes upscaler-scanline-shift {
          0% { background-position-y: 0; }
          100% { background-position-y: 80px; }
        }

        .upscaler-overlay-card {
          position: relative;
          width: 100%;
          max-width: 480px;
          margin: 0 16px;
          background: linear-gradient(165deg, rgba(15, 23, 42, 0.95) 0%, rgba(7, 11, 20, 0.98) 100%);
          border: 1px solid rgba(99, 179, 237, 0.15);
          border-radius: 20px;
          overflow: hidden;
          box-shadow:
            0 0 0 1px rgba(99, 179, 237, 0.08),
            0 25px 60px rgba(0, 0, 0, 0.6),
            0 0 120px rgba(59, 130, 246, 0.06);
        }

        .upscaler-overlay-top {
          position: relative;
          padding: 24px 24px 16px;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .upscaler-preview-container {
          width: 100%;
          max-width: 280px;
          aspect-ratio: 1;
          border-radius: 12px;
          overflow: hidden;
          position: relative;
          border: 1px solid rgba(99, 179, 237, 0.2);
          background: rgba(15, 23, 42, 0.6);
        }

        .upscaler-preview-img-wrap {
          position: relative;
          width: 100%;
          height: 100%;
        }

        .upscaler-preview-img {
          width: 100%;
          height: 100%;
          object-fit: contain;
          filter: brightness(0.7) saturate(0.6);
          transition: filter 0.5s;
        }

        .upscaler-scan-line {
          position: absolute;
          left: 0;
          right: 0;
          height: 3px;
          background: linear-gradient(90deg,
            transparent 0%,
            rgba(59, 130, 246, 0.6) 20%,
            rgba(147, 51, 234, 0.8) 50%,
            rgba(59, 130, 246, 0.6) 80%,
            transparent 100%
          );
          box-shadow: 0 0 20px rgba(59, 130, 246, 0.4), 0 0 60px rgba(147, 51, 234, 0.2);
          z-index: 2;
        }

        .upscaler-tile-overlay {
          position: absolute;
          inset: 0;
          padding: 8px;
          z-index: 1;
        }

        .upscaler-tile-grid {
          display: grid;
          gap: 2px;
          width: 100%;
          height: 100%;
        }

        .upscaler-tile {
          border-radius: 2px;
          background: rgba(59, 130, 246, 0.05);
          border: 1px solid rgba(99, 179, 237, 0.08);
          transition: all 0.3s;
        }

        .upscaler-tile.processed {
          background: rgba(59, 130, 246, 0.15);
          border-color: rgba(59, 130, 246, 0.3);
          box-shadow: inset 0 0 8px rgba(59, 130, 246, 0.1);
        }

        .upscaler-tile.current {
          background: rgba(147, 51, 234, 0.3);
          border-color: rgba(147, 51, 234, 0.6);
          box-shadow: 0 0 12px rgba(147, 51, 234, 0.3), inset 0 0 8px rgba(147, 51, 234, 0.2);
        }

        .upscaler-preview-placeholder {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: radial-gradient(ellipse at center, rgba(59, 130, 246, 0.06) 0%, transparent 70%);
        }

        .upscaler-neural-grid {
          position: relative;
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 8px;
          padding: 20px;
          width: 180px;
          height: 120px;
        }

        .upscaler-neural-lines {
          position: absolute;
          inset: 0;
          pointer-events: none;
        }

        .upscaler-neural-node {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: rgba(99, 179, 237, 0.3);
          justify-self: center;
          align-self: center;
        }

        .upscaler-neural-node.active {
          background: radial-gradient(circle, rgba(99, 179, 237, 0.9), rgba(147, 51, 234, 0.6));
          box-shadow: 0 0 10px rgba(99, 179, 237, 0.4);
        }

        .upscaler-stage-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          margin-top: 16px;
          padding: 6px 14px;
          border-radius: 999px;
          background: rgba(59, 130, 246, 0.1);
          border: 1px solid rgba(59, 130, 246, 0.25);
          font-size: 13px;
          font-weight: 600;
          color: rgba(147, 197, 253, 0.95);
          letter-spacing: 0.02em;
        }

        .upscaler-stage-icon {
          font-size: 14px;
        }

        .upscaler-overlay-mid {
          padding: 0 24px 20px;
          text-align: center;
        }

        .upscaler-status-text {
          font-size: 18px;
          font-weight: 700;
          color: #f1f5f9;
          margin-bottom: 4px;
          letter-spacing: -0.01em;
        }

        .upscaler-status-detail {
          font-size: 13px;
          color: rgba(148, 163, 184, 0.8);
          margin-bottom: 20px;
        }

        .upscaler-progress-wrap {
          width: 100%;
        }

        .upscaler-progress-track {
          width: 100%;
          height: 6px;
          border-radius: 999px;
          background: rgba(30, 41, 59, 0.8);
          overflow: hidden;
          position: relative;
        }

        .upscaler-progress-fill {
          height: 100%;
          border-radius: 999px;
          background: linear-gradient(90deg, #3b82f6, #8b5cf6, #3b82f6);
          background-size: 200% 100%;
          animation: upscaler-shimmer 2s linear infinite;
          position: relative;
          transition: width 0.4s cubic-bezier(0.16, 1, 0.3, 1);
          min-width: 2px;
        }

        .upscaler-progress-glow {
          position: absolute;
          right: -2px;
          top: -4px;
          bottom: -4px;
          width: 14px;
          border-radius: 999px;
          background: rgba(139, 92, 246, 0.8);
          filter: blur(6px);
          animation: upscaler-glow-pulse 1.5s ease-in-out infinite;
        }

        @keyframes upscaler-shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }

        @keyframes upscaler-glow-pulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }

        .upscaler-progress-labels {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 8px;
        }

        .upscaler-progress-pct {
          font-size: 14px;
          font-weight: 700;
          color: #93c5fd;
          font-variant-numeric: tabular-nums;
        }

        .upscaler-progress-time {
          font-size: 12px;
          color: rgba(148, 163, 184, 0.6);
          font-variant-numeric: tabular-nums;
        }

        .upscaler-overlay-bottom {
          padding: 16px 24px 20px;
          border-top: 1px solid rgba(99, 179, 237, 0.08);
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .upscaler-meta-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 12px;
        }

        .upscaler-meta-label {
          color: rgba(148, 163, 184, 0.5);
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .upscaler-meta-value {
          color: rgba(203, 213, 225, 0.85);
          font-weight: 500;
          font-variant-numeric: tabular-nums;
        }

        .upscaler-meta-arrow {
          display: inline-block;
          margin: 0 6px;
          color: rgba(59, 130, 246, 0.6);
          font-weight: 700;
        }

        .upscaler-meta-live {
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }

        .upscaler-live-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #22c55e;
          animation: upscaler-live-pulse 2s ease-in-out infinite;
        }

        @keyframes upscaler-live-pulse {
          0%, 100% { opacity: 0.5; box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.4); }
          50% { opacity: 1; box-shadow: 0 0 0 4px rgba(34, 197, 94, 0); }
        }
      `}</style>
    </motion.div>
  );
};

export default ProcessingOverlay;