import { ReactNode } from 'react';

const CardGlass = ({ children, className = '' }: { children: ReactNode; className?: string }) => (
  <div className={`backdrop-blur-md bg-surface/70 border border-white/10 rounded-xl shadow-card hover:bg-surface/90 transition ${className}`}>
    {children}
  </div>
);

export default CardGlass; 