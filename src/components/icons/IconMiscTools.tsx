import React from 'react';

const IconMiscTools = (props: React.SVGProps<SVGSVGElement>) => (
    <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        {...props}
    >
        <path d="M3 8l4 -4" stroke="var(--primary-color-light, #60a5fa)" opacity="0.7" />
        <path d="M17 4l4 4" stroke="var(--primary-color-light, #60a5fa)" opacity="0.7"/>
        <path d="M7 4l10 0" stroke="var(--primary-color-light, #60a5fa)" opacity="0.7"/>
        <rect x="3" y="8" width="18" height="12" rx="2" stroke="var(--primary-color, #3B82F6)"/>
        <path d="M8 12h8" stroke="var(--primary-color, #3B82F6)" />
        <path d="M8 16h8" stroke="var(--primary-color, #3B82F6)" />
    </svg>
);

export default IconMiscTools; 