import React from 'react';

const IconFaceSwap: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="face1Gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#FBBF24" />
        </linearGradient>
        <linearGradient id="face2Gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#8B5CF6" />
          <stop offset="100%" stopColor="#A78BFA" />
        </linearGradient>
        <linearGradient id="swapGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#F59E0B" />
          <stop offset="50%" stopColor="#EC4899" />
          <stop offset="100%" stopColor="#8B5CF6" />
        </linearGradient>
      </defs>
      
      {/* Left face */}
      <circle cx="7" cy="10" r="5" fill="url(#face1Gradient)" opacity="0.2" />
      <circle cx="7" cy="10" r="5" fill="none" stroke="url(#face1Gradient)" strokeWidth="1.5" />
      
      {/* Left face features */}
      <circle cx="5.5" cy="9" r="0.7" fill="url(#face1Gradient)" />
      <circle cx="8.5" cy="9" r="0.7" fill="url(#face1Gradient)" />
      <path d="M5 12C5 12 6 13 7 13C8 13 9 12 9 12" stroke="url(#face1Gradient)" strokeWidth="0.8" strokeLinecap="round" />
      
      {/* Right face */}
      <circle cx="17" cy="10" r="5" fill="url(#face2Gradient)" opacity="0.2" />
      <circle cx="17" cy="10" r="5" fill="none" stroke="url(#face2Gradient)" strokeWidth="1.5" />
      
      {/* Right face features */}
      <circle cx="15.5" cy="9" r="0.7" fill="url(#face2Gradient)" />
      <circle cx="18.5" cy="9" r="0.7" fill="url(#face2Gradient)" />
      <path d="M15 12C15 12 16 13 17 13C18 13 19 12 19 12" stroke="url(#face2Gradient)" strokeWidth="0.8" strokeLinecap="round" />
      
      {/* Swap arrows */}
      <g opacity="0.8">
        <path d="M10 7L14 7M14 7L13 6M14 7L13 8" stroke="url(#swapGradient)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M14 13L10 13M10 13L11 14M10 13L11 12" stroke="url(#swapGradient)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      </g>
      
      {/* AI neural network dots */}
      <g opacity="0.4">
        <circle cx="12" cy="5" r="0.5" fill="url(#swapGradient)" />
        <circle cx="12" cy="10" r="0.5" fill="url(#swapGradient)" />
        <circle cx="12" cy="15" r="0.5" fill="url(#swapGradient)" />
        <path d="M12 5L12 15" stroke="url(#swapGradient)" strokeWidth="0.3" strokeDasharray="1 2" />
      </g>
      
      {/* Tech particles */}
      <g opacity="0.6">
        <circle cx="3" cy="6" r="0.3" fill="currentColor" />
        <circle cx="21" cy="14" r="0.3" fill="currentColor" />
        <circle cx="4" cy="16" r="0.3" fill="currentColor" />
        <circle cx="20" cy="4" r="0.3" fill="currentColor" />
      </g>
    </svg>
  );
};

export default IconFaceSwap; 