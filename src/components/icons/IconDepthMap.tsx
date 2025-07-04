import React from 'react';

const IconDepthMap = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M2.5 11.5L12 16.5L21.5 11.5" stroke="var(--primary-color, #3B82F6)" />
    <path d="M2.5 15.5L12 20.5L21.5 15.5" stroke="var(--primary-color-light, #60a5fa)" opacity="0.6" />
    <path d="M12 3.5L2.5 8.5L12 13.5L21.5 8.5L12 3.5Z" fill="var(--primary-color, #3B82F6)" strokeWidth="0" />
  </svg>
);

export default IconDepthMap; 