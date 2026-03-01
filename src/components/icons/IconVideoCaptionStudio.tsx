import React from 'react';

const IconVideoCaptionStudio: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="captionGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#14B8A6" />
          <stop offset="100%" stopColor="#06B6D4" />
        </linearGradient>
        <linearGradient id="videoGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#1F2937" />
          <stop offset="100%" stopColor="#374151" />
        </linearGradient>
      </defs>
      
      {/* Video screen */}
      <rect x="3" y="4" width="18" height="12" rx="2" fill="url(#videoGradient)" stroke="currentColor" strokeWidth="1" />
      
      {/* Play button */}
      <path d="M10 8.5L10 11.5L13 10L10 8.5Z" fill="currentColor" opacity="0.3" />
      
      {/* Subtitle bars */}
      <rect x="5" y="17" width="14" height="2" rx="1" fill="url(#captionGradient)" />
      <rect x="6" y="20" width="12" height="2" rx="1" fill="url(#captionGradient)" opacity="0.7" />
      
      {/* Text lines on screen */}
      <g opacity="0.8">
        <rect x="6" y="12" width="4" height="0.5" fill="white" />
        <rect x="11" y="12" width="3" height="0.5" fill="white" />
        <rect x="15" y="12" width="3" height="0.5" fill="white" />
        
        <rect x="7" y="13.5" width="3" height="0.5" fill="white" opacity="0.6" />
        <rect x="11" y="13.5" width="2" height="0.5" fill="white" opacity="0.6" />
        <rect x="14" y="13.5" width="3" height="0.5" fill="white" opacity="0.6" />
      </g>
      
      {/* AI sparkle */}
      <g opacity="0.7">
        <path d="M20 2L20 1.5M20 2L19.5 2M20 2L20.5 2M20 2L20 2.5" stroke="url(#captionGradient)" strokeWidth="0.5" />
        <path d="M2 19L2 18.5M2 19L1.5 19M2 19L2.5 19M2 19L2 19.5" stroke="url(#captionGradient)" strokeWidth="0.5" />
      </g>
      
      {/* Sound waves */}
      <g opacity="0.4">
        <path d="M1 10C1 10 1.5 9 1.5 10C1.5 11 1 10 1 10Z" stroke="currentColor" strokeWidth="0.5" />
        <path d="M23 10C23 10 22.5 9 22.5 10C22.5 11 23 10 23 10Z" stroke="currentColor" strokeWidth="0.5" />
      </g>
    </svg>
  );
};

export default IconVideoCaptionStudio; 