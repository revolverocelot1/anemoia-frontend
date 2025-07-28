import React from 'react';

const IconDepthMap: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Background gradient for depth effect */}
      <defs>
        <linearGradient id="depthGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#60A5FA" stopOpacity="0.8" />
          <stop offset="50%" stopColor="#3B82F6" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#1E40AF" stopOpacity="0.4" />
        </linearGradient>
        <linearGradient id="mountainGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#93C5FD" />
          <stop offset="100%" stopColor="#2563EB" />
        </linearGradient>
      </defs>
      
      {/* Back mountain layer */}
      <path
        d="M2 16L6 10L10 14L14 8L18 12L22 16V22H2V16Z"
        fill="url(#depthGradient)"
        opacity="0.3"
      />
      
      {/* Middle mountain layer */}
      <path
        d="M2 18L7 12L11 16L16 10L22 18V22H2V18Z"
        fill="url(#depthGradient)"
        opacity="0.5"
      />
      
      {/* Front mountain layer */}
      <path
        d="M2 20L8 14L12 18L18 12L22 20V22H2V20Z"
        fill="url(#mountainGradient)"
      />
      
      {/* Depth lines showing Z-axis */}
      <path
        d="M12 2V8M12 8L10 6M12 8L14 6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      
      {/* Grid lines for perspective */}
      <path
        d="M4 4L2 22M8 4L6 22M16 4L18 22M20 4L22 22"
        stroke="currentColor"
        strokeWidth="0.5"
        strokeOpacity="0.3"
      />
    </svg>
  );
};

export default IconDepthMap; 