import React from 'react';

interface IconProps {
  className?: string;
  style?: React.CSSProperties;
}

const IconGeminiWatermarkRemover: React.FC<IconProps> = ({ className, style }) => {
  return (
    <svg
      className={className}
      style={style}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {/* Gemini primary gradient */}
        <linearGradient id="geminiWatermarkGrad" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#38BDF8" />
          <stop offset="45%" stopColor="#3B82F6" />
          <stop offset="100%" stopColor="#818CF8" />
        </linearGradient>

        {/* Laser / Eraser beam gradient */}
        <linearGradient id="eraserBeamGrad" x1="4" y1="20" x2="20" y2="4" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#06B6D4" />
          <stop offset="50%" stopColor="#10B981" />
          <stop offset="100%" stopColor="#34D399" />
        </linearGradient>

        {/* Glow filter */}
        <filter id="geminiGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="0.8" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* Background pristine corner grid / pixel grid (subtle) */}
      <g opacity="0.25">
        <rect x="2" y="2" width="20" height="20" rx="3" stroke="currentColor" strokeWidth="1" strokeDasharray="2 2" />
      </g>

      {/* Primary Gemini 4-point Star Watermark (left/center) with subtle dissolve */}
      <path
        d="M10.5 3C10.5 7.2 7.2 10.5 3 10.5C7.2 10.5 10.5 13.8 10.5 18C10.5 13.8 13.8 10.5 18 10.5C13.8 10.5 10.5 7.2 10.5 3Z"
        fill="url(#geminiWatermarkGrad)"
        fillOpacity="0.35"
        stroke="url(#geminiWatermarkGrad)"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />

      {/* Secondary Veo micro-star (upper right) */}
      <path
        d="M18.5 4.5C18.5 6.2 17.2 7.5 15.5 7.5C17.2 7.5 18.5 8.8 18.5 10.5C18.5 8.8 19.8 7.5 21.5 7.5C19.8 7.5 18.5 6.2 18.5 4.5Z"
        fill="url(#geminiWatermarkGrad)"
        fillOpacity="0.4"
        stroke="url(#geminiWatermarkGrad)"
        strokeWidth="1"
        strokeLinejoin="round"
      />

      {/* Dynamic Eraser / Clean sweep cutting beam diagonally */}
      <line
        x1="3"
        y1="21"
        x2="21"
        y2="3"
        stroke="url(#eraserBeamGrad)"
        strokeWidth="1.8"
        strokeLinecap="round"
        filter="url(#geminiGlow)"
      />

      {/* Eraser wand tip / lens focal point */}
      <circle cx="12" cy="12" r="1.5" fill="#FFFFFF" filter="url(#geminiGlow)" />

      {/* Sparkles indicating zero-loss reconstructed clean pixels */}
      <g opacity="0.9">
        {/* Top spark */}
        <path d="M13 7.5L14 8.5L13 9.5L12 8.5Z" fill="#34D399" />
        {/* Right spark */}
        <path d="M19 14.5L20 15.5L19 16.5L18 15.5Z" fill="#38BDF8" />
        {/* Bottom spark */}
        <path d="M7 16.5L8 17.5L7 18.5L6 17.5Z" fill="#06B6D4" />
      </g>

      {/* Subtraction / inverse indicator ring */}
      <path
        d="M5 19L9 15"
        stroke="url(#eraserBeamGrad)"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeDasharray="1 1.5"
        opacity="0.8"
      />
    </svg>
  );
};

export default IconGeminiWatermarkRemover;
