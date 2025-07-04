import React from 'react';

const IconAIUpscaler = (props: React.SVGProps<SVGSVGElement>) => (
    <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        {...props}
    >
        <path d="M15 12l-2 2" stroke="var(--primary-color, #3B82F6)" />
        <path d="M12 15l-1.5 1.5" stroke="var(--primary-color, #3B82F6)" />
        <path d="M9 12l-2 -2" stroke="var(--primary-color-light, #60a5fa)" opacity="0.7"/>
        <rect x="3" y="3" width="18" height="18" rx="2" stroke="var(--primary-color, #3B82F6)"/>
        <path d="M10 21h4" stroke="var(--primary-color-light, #60a5fa)" opacity="0.7"/>
        <path d="M12 18v3" stroke="var(--primary-color-light, #60a5fa)" opacity="0.7"/>
        <path d="M21 15v-4.5" stroke="var(--primary-color-light, #60a5fa)" opacity="0.7"/>
        <path d="M18 12h3" stroke="var(--primary-color-light, #60a5fa)" opacity="0.7"/>
        <path d="M17 17l2 2" stroke="var(--primary-color, #3B82F6)"/>
        <path d="M3 3l5 5" stroke="var(--primary-color, #3B82F6)" strokeDasharray="2 2" />
    </svg>
);

export default IconAIUpscaler; 