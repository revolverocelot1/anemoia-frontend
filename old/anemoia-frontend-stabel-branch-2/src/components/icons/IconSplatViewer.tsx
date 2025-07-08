import React from 'react';

const IconSplatViewer = (props: React.SVGProps<SVGSVGElement>) => (
    <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        {...props}
    >
        <path d="M10 10.5a1.5 1.5 0 103 0 1.5 1.5 0 10-3 0" fill="var(--primary-color, #3B82F6)" stroke="none"/>
        <path d="M4.5 8a1.5 1.5 0 103 0 1.5 1.5 0 10-3 0" fill="var(--primary-color-light, #60a5fa)" stroke="none" opacity="0.7"/>
        <path d="M15.5 6a1.5 1.5 0 103 0 1.5 1.5 0 10-3 0" fill="var(--primary-color-light, #60a5fa)" stroke="none" opacity="0.7"/>
        <path d="M8 16.5a1.5 1.5 0 103 0 1.5 1.5 0 10-3 0" fill="var(--primary-color-light, #60a5fa)" stroke="none" opacity="0.7"/>
        <path d="M17.5 17a1.5 1.5 0 103 0 1.5 1.5 0 10-3 0" fill="var(--primary-color-light, #60a5fa)" stroke="none" opacity="0.7"/>
        <path d="M12 21L7.5 16.5" stroke="var(--primary-color, #3B82F6)" strokeDasharray="2 2" />
        <path d="M12 21L16.5 16.5" stroke="var(--primary-color, #3B82F6)" strokeDasharray="2 2" />
        <path d="M12 21v-8" stroke="var(--primary-color, #3B82F6)" strokeDasharray="2 2" />
        <path d="M12 3L7.5 7.5" stroke="var(--primary-color-light, #60a5fa)" strokeDasharray="2 2" opacity="0.5"/>
        <path d="M12 3l4.5 4.5" stroke="var(--primary-color-light, #60a5fa)" strokeDasharray="2 2" opacity="0.5"/>
    </svg>
);

export default IconSplatViewer; 