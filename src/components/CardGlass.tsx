import React from 'react';

interface CardGlassProps {
  children: React.ReactNode;
  className?: string;
}

const CardGlass: React.FC<CardGlassProps> = ({ children, className = '' }) => {
  return (
    <div className={`bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl ${className}`}>
      {children}
    </div>
  );
};

export default CardGlass;