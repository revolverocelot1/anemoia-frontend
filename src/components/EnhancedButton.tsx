import React from 'react';
import { motion } from 'framer-motion';

interface EnhancedButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  disabled?: boolean;
  fullWidth?: boolean;
  className?: string;
}

const EnhancedButton: React.FC<EnhancedButtonProps> = ({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  icon,
  disabled = false,
  fullWidth = false,
  className = '',
}) => {
  const baseClasses = 'relative inline-flex items-center justify-center font-medium transition-all duration-200 rounded-xl backdrop-blur-sm overflow-hidden group';
  
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs gap-1.5',
    md: 'px-4 py-2 text-sm gap-2',
    lg: 'px-6 py-3 text-base gap-3',
  };
  
  const variantClasses = {
    primary: 'bg-gradient-to-r from-blue-600/90 to-blue-700/90 hover:from-blue-500 hover:to-blue-600 text-white shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 border border-blue-400/20',
    secondary: 'bg-gradient-to-r from-gray-700/90 to-gray-800/90 hover:from-gray-600 hover:to-gray-700 text-gray-100 shadow-lg shadow-gray-900/20 hover:shadow-gray-900/30 border border-gray-600/20',
    danger: 'bg-gradient-to-r from-red-600/90 to-red-700/90 hover:from-red-500 hover:to-red-600 text-white shadow-lg shadow-red-500/20 hover:shadow-red-500/30 border border-red-400/20',
    success: 'bg-gradient-to-r from-green-600/90 to-green-700/90 hover:from-green-500 hover:to-green-600 text-white shadow-lg shadow-green-500/20 hover:shadow-green-500/30 border border-green-400/20',
    ghost: 'bg-transparent hover:bg-white/5 text-gray-300 hover:text-white border border-gray-700/50 hover:border-gray-600/50',
  };
  
  const disabledClasses = 'opacity-50 cursor-not-allowed pointer-events-none';
  
  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      className={`
        ${baseClasses}
        ${sizeClasses[size]}
        ${variantClasses[variant]}
        ${disabled ? disabledClasses : ''}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
      whileHover={{ scale: disabled ? 1 : 1.02 }}
      whileTap={{ scale: disabled ? 1 : 0.98 }}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      {/* Hover glow effect */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent" />
      </div>
      
      {/* Button content */}
      <span className="relative z-10 flex items-center justify-center gap-2">
        {icon && <span className="flex-shrink-0">{icon}</span>}
        {children}
      </span>
      
      {/* Ripple effect on click */}
      <motion.div
        className="absolute inset-0 bg-white/20 rounded-xl"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 2, opacity: 0 }}
        transition={{ duration: 0.5 }}
      />
    </motion.button>
  );
};

export default EnhancedButton; 