import React from 'react';

const IconImageComparison = (props: React.SVGProps<SVGSVGElement>) => (
    <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        {...props}
    >
        <path d="M3 21V3h9" stroke="var(--primary-color-light, #60a5fa)" opacity="0.7"/>
        <path d="M21 21V3h-9" stroke="var(--primary-color, #3B82F6)"/>
        <path d="M12 3v18" stroke="currentColor" strokeWidth="2.5" />
        <path d="M12 8l-2 -2l2 -2" fill="none" stroke="currentColor" strokeWidth="2.5"/>
        <path d="M12 18l2 2l-2 2" fill="none" stroke="currentColor" strokeWidth="2.5" />
    </svg>
);

export default IconImageComparison; 