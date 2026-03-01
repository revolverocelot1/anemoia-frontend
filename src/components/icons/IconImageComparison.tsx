import React from 'react';

const IconImageComparison: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="compareGradient1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#EC4899" />
          <stop offset="100%" stopColor="#F472B6" />
        </linearGradient>
        <linearGradient id="compareGradient2" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3B82F6" />
          <stop offset="100%" stopColor="#60A5FA" />
        </linearGradient>
        <pattern id="leftPattern" x="0" y="0" width="3" height="3" patternUnits="userSpaceOnUse">
          <circle cx="1.5" cy="1.5" r="0.5" fill="#EC4899" opacity="0.3" />
        </pattern>
        <pattern id="rightPattern" x="0" y="0" width="3" height="3" patternUnits="userSpaceOnUse">
          <rect x="0" y="0" width="1.5" height="1.5" fill="#3B82F6" opacity="0.3" />
          <rect x="1.5" y="1.5" width="1.5" height="1.5" fill="#3B82F6" opacity="0.3" />
        </pattern>
      </defs>
      
      {/* Frame */}
      <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none" />
      
      {/* Left side - original */}
      <rect x="3" y="5" width="9" height="14" fill="url(#leftPattern)" clipPath="url(#leftClip)" />
      <path d="M3 7L3 17C3 18.1 3.9 19 5 19L12 19L12 5L5 5C3.9 5 3 5.9 3 7Z" fill="url(#compareGradient1)" opacity="0.2" />
      
      {/* Left image elements */}
      <circle cx="7" cy="9" r="1" fill="url(#compareGradient1)" opacity="0.8" />
      <path d="M5 15L7 12L9 14L11 11" stroke="url(#compareGradient1)" strokeWidth="1" opacity="0.8" />
      
      {/* Right side - modified */}
      <rect x="12" y="5" width="9" height="14" fill="url(#rightPattern)" />
      <path d="M12 5L19 5C20.1 5 21 5.9 21 7L21 17C21 18.1 20.1 19 19 19L12 19L12 5Z" fill="url(#compareGradient2)" opacity="0.2" />
      
      {/* Right image elements */}
      <rect x="15" y="8" width="3" height="3" rx="0.5" fill="url(#compareGradient2)" opacity="0.8" />
      <path d="M13 15L15 13L17 15L19 12" stroke="url(#compareGradient2)" strokeWidth="1" opacity="0.8" />
      
      {/* Divider with handle */}
      <line x1="12" y1="5" x2="12" y2="19" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="12" r="2" fill="currentColor" />
      <path d="M10 12L9 11M10 12L9 13M14 12L15 11M14 12L15 13" stroke="currentColor" strokeWidth="0.5" opacity="0.6" />
      
      {/* Comparison arrows */}
      <g opacity="0.4">
        <path d="M1 12L2 11M1 12L2 13" stroke="currentColor" strokeWidth="0.5" />
        <path d="M22 12L23 11M22 12L23 13" stroke="currentColor" strokeWidth="0.5" />
      </g>
      
      <defs>
        <clipPath id="leftClip">
          <rect x="3" y="5" width="9" height="14" />
        </clipPath>
      </defs>
    </svg>
  );
};

export default IconImageComparison; 