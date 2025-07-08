import React from 'react';

const IconPoseEstimation = (props: React.SVGProps<SVGSVGElement>) => (
    <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        {...props}
    >
        <circle cx="12" cy="5" r="2" fill="var(--primary-color, #3B82F6)" stroke="none" />
        <path d="M12 7v5" stroke="var(--primary-color, #3B82F6)" />
        <path d="M12 12l-4 4" stroke="var(--primary-color, #3B82F6)" />
        <path d="M12 12l4 4" stroke="var(--primary-color, #3B82F6)" />
        <path d="M9 12l-4 -4" stroke="var(--primary-color, #3B82F6)" />
        <path d="M15 12l4 -4" stroke="var(--primary-color, #3B82F6)" />
        <path d="M5 8v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2 -2V8" opacity="0.3" stroke="var(--primary-color-light, #60a5fa)" />
    </svg>
);

export default IconPoseEstimation; 