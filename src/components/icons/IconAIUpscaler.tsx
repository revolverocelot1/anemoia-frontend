import React from 'react';

const IconAIUpscaler: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="upscaleGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#10B981" />
          <stop offset="100%" stopColor="#34D399" />
        </linearGradient>
        <pattern id="pixelPattern" x="0" y="0" width="4" height="4" patternUnits="userSpaceOnUse">
          <rect x="0" y="0" width="2" height="2" fill="#10B981" opacity="0.3" />
          <rect x="2" y="2" width="2" height="2" fill="#10B981" opacity="0.3" />
        </pattern>
      </defs>
      
      {/* Low res pixelated image */}
      <g opacity="0.4">
        <rect x="3" y="3" width="4" height="4" fill="#6B7280" />
        <rect x="7" y="3" width="4" height="4" fill="#9CA3AF" />
        <rect x="3" y="7" width="4" height="4" fill="#9CA3AF" />
        <rect x="7" y="7" width="4" height="4" fill="#6B7280" />
      </g>
      
      {/* Neural network transformation lines */}
      <g opacity="0.6">
        <path d="M11 9L13 9M13 9L13 11M13 11L15 11" stroke="url(#upscaleGradient)" strokeWidth="1" />
        <circle cx="12" cy="10" r="0.5" fill="url(#upscaleGradient)" />
        <circle cx="14" cy="10" r="0.5" fill="url(#upscaleGradient)" />
        <circle cx="13" cy="12" r="0.5" fill="url(#upscaleGradient)" />
      </g>
      
      {/* High res enhanced image */}
      <rect x="13" y="13" width="8" height="8" fill="url(#pixelPattern)" stroke="url(#upscaleGradient)" strokeWidth="1.5" rx="1" />
      
      {/* Detail enhancement lines */}
      <g>
        <path d="M14 14L20 20" stroke="url(#upscaleGradient)" strokeWidth="0.5" opacity="0.6" />
        <path d="M20 14L14 20" stroke="url(#upscaleGradient)" strokeWidth="0.5" opacity="0.6" />
        <circle cx="17" cy="17" r="1" fill="none" stroke="url(#upscaleGradient)" strokeWidth="0.5" opacity="0.8" />
      </g>
      
      {/* AI sparkles */}
      <g>
        <path d="M18 12L18 11M18 11L17 11M18 11L19 11M18 11L18 10" stroke="currentColor" strokeWidth="0.5" opacity="0.6" />
        <path d="M22 17L22 16.5M22 17L21.5 17M22 17L22.5 17M22 17L22 17.5" stroke="currentColor" strokeWidth="0.5" opacity="0.6" />
        <path d="M12 19L12 18.5M12 19L11.5 19M12 19L12.5 19M12 19L12 19.5" stroke="currentColor" strokeWidth="0.5" opacity="0.6" />
      </g>
      
      {/* Magnifying effect */}
      <path
        d="M15 15L13 13M21 21L19 19"
        stroke="currentColor"
        strokeWidth="1"
        opacity="0.3"
        strokeLinecap="round"
      />
    </svg>
  );
};

export default IconAIUpscaler; 