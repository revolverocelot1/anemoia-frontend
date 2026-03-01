import React from 'react';

const IconSplatViewer: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <radialGradient id="splatGradient1" cx="50%" cy="50%">
          <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="splatGradient2" cx="50%" cy="50%">
          <stop offset="0%" stopColor="#EF4444" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#EF4444" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="splatGradient3" cx="50%" cy="50%">
          <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="splatGradient4" cx="50%" cy="50%">
          <stop offset="0%" stopColor="#06B6D4" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#06B6D4" stopOpacity="0" />
        </radialGradient>
      </defs>
      
      {/* 3D axis frame */}
      <g opacity="0.3">
        <path d="M12 20L4 16V8L12 4L20 8V16L12 20Z" stroke="currentColor" strokeWidth="0.5" />
        <path d="M12 20V12M12 12L4 8M12 12L20 8" stroke="currentColor" strokeWidth="0.5" />
      </g>
      
      {/* Gaussian splats at different depths */}
      <circle cx="8" cy="10" r="3" fill="url(#splatGradient1)" />
      <circle cx="16" cy="9" r="2.5" fill="url(#splatGradient2)" />
      <circle cx="12" cy="14" r="3.5" fill="url(#splatGradient3)" />
      <circle cx="14" cy="7" r="2" fill="url(#splatGradient4)" />
      
      {/* Smaller splats for depth */}
      <circle cx="10" cy="8" r="1.5" fill="url(#splatGradient2)" opacity="0.6" />
      <circle cx="15" cy="13" r="1.8" fill="url(#splatGradient1)" opacity="0.6" />
      <circle cx="9" cy="15" r="1.2" fill="url(#splatGradient4)" opacity="0.5" />
      <circle cx="17" cy="11" r="1" fill="url(#splatGradient3)" opacity="0.5" />
      
      {/* Connection lines suggesting 3D structure */}
      <g opacity="0.2">
        <path d="M8 10L12 14M16 9L12 14M14 7L12 14" stroke="currentColor" strokeWidth="0.5" />
      </g>
      
      {/* Rotation arrows */}
      <g opacity="0.4">
        <path d="M3 12C3 7 7 3 12 3" stroke="currentColor" strokeWidth="0.5" strokeLinecap="round" />
        <path d="M12 3L11 4M12 3L13 4" stroke="currentColor" strokeWidth="0.5" strokeLinecap="round" />
        <path d="M21 12C21 17 17 21 12 21" stroke="currentColor" strokeWidth="0.5" strokeLinecap="round" />
        <path d="M12 21L13 20M12 21L11 20" stroke="currentColor" strokeWidth="0.5" strokeLinecap="round" />
      </g>
    </svg>
  );
};

export default IconSplatViewer; 