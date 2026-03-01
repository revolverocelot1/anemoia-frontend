import React from 'react';

const IconPoseEstimation: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <radialGradient id="poseGradient" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#A78BFA" />
          <stop offset="100%" stopColor="#7C3AED" />
        </radialGradient>
        <radialGradient id="jointGradient" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#F3E8FF" />
          <stop offset="100%" stopColor="#C084FC" />
        </radialGradient>
      </defs>
      
      {/* Head */}
      <circle cx="12" cy="5" r="2.5" fill="url(#poseGradient)" />
      
      {/* Body line */}
      <path
        d="M12 7.5V14"
        stroke="url(#poseGradient)"
        strokeWidth="2"
        strokeLinecap="round"
      />
      
      {/* Left arm raised */}
      <path
        d="M12 9L8 7M8 7L5 9"
        stroke="url(#poseGradient)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      
      {/* Right arm extended */}
      <path
        d="M12 9L16 11M16 11L19 10"
        stroke="url(#poseGradient)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      
      {/* Left leg */}
      <path
        d="M12 14L9 18M9 18L7 22"
        stroke="url(#poseGradient)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      
      {/* Right leg bent */}
      <path
        d="M12 14L15 17M15 17L17 21"
        stroke="url(#poseGradient)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      
      {/* Joint circles */}
      <circle cx="12" cy="9" r="1" fill="url(#jointGradient)" />
      <circle cx="8" cy="7" r="1" fill="url(#jointGradient)" />
      <circle cx="5" cy="9" r="1" fill="url(#jointGradient)" />
      <circle cx="16" cy="11" r="1" fill="url(#jointGradient)" />
      <circle cx="19" cy="10" r="1" fill="url(#jointGradient)" />
      <circle cx="12" cy="14" r="1" fill="url(#jointGradient)" />
      <circle cx="9" cy="18" r="1" fill="url(#jointGradient)" />
      <circle cx="7" cy="22" r="1" fill="url(#jointGradient)" />
      <circle cx="15" cy="17" r="1" fill="url(#jointGradient)" />
      <circle cx="17" cy="21" r="1" fill="url(#jointGradient)" />
      
      {/* Motion lines */}
      <path
        d="M2 8C2 8 3 7 4 7M22 12C22 12 21 11 20 11"
        stroke="currentColor"
        strokeWidth="0.5"
        strokeOpacity="0.4"
        strokeLinecap="round"
      />
    </svg>
  );
};

export default IconPoseEstimation; 