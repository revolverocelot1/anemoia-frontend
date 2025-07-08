import React from 'react';
import { motion } from 'framer-motion';
import './ReactiveButton.css';

interface ReactiveButtonProps {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
}

export const ReactiveButton: React.FC<ReactiveButtonProps> = ({
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  onClick,
  children,
  className = ''
}) => {
  return (
    <motion.button
      className={`reactive-button ${variant} ${size} ${loading ? 'loading' : ''} ${className}`}
      onClick={onClick}
      disabled={disabled || loading}
      whileHover={!disabled && !loading ? { scale: 1.02 } : {}}
      whileTap={!disabled && !loading ? { scale: 0.98 } : {}}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
    >
      <span className="button-content">
        {loading && <span className="button-spinner" />}
        {children}
      </span>
      <span className="button-glow" />
    </motion.button>
  );
}; 