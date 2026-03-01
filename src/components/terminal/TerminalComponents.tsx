import React, { useEffect, useState, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Terminal Window Component
interface TerminalWindowProps {
  title?: string;
  children: ReactNode;
  className?: string;
}

export const TerminalWindow: React.FC<TerminalWindowProps> = ({ 
  title = 'SYSTEM TERMINAL', 
  children, 
  className = '' 
}) => {
  return (
    <div className={`relative bg-black border-2 border-cyan-500/50 rounded-lg overflow-hidden shadow-2xl shadow-cyan-500/20 flex flex-col ${className}`}>
      {/* Terminal Header */}
      <div className="bg-gradient-to-r from-cyan-900/80 to-blue-900/80 px-4 py-2 border-b border-cyan-500/50 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center space-x-2">
          <div className="flex space-x-1">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          </div>
          <span className="text-cyan-300 font-mono text-sm tracking-wider">
            {title}
          </span>
        </div>
        <div className="text-cyan-400 font-mono text-xs">
          [SECURE CONNECTION]
        </div>
      </div>
      
      {/* Terminal Content */}
      <div className="relative flex-1 min-h-0 flex flex-col">
        {/* Scan line effect */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-500/10 to-transparent pointer-events-none z-10"
          animate={{ y: ['-100%', '100%'] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
          style={{ height: '20%' }}
        />
        
        {children}
      </div>
    </div>
  );
};

// Terminal Button Component
interface TerminalButtonProps {
  children: ReactNode;
  onClick?: (event?: React.MouseEvent<HTMLButtonElement>) => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'success';
  disabled?: boolean;
  className?: string;
  glitch?: boolean;
}

export const TerminalButton: React.FC<TerminalButtonProps> = ({ 
  children, 
  onClick, 
  variant = 'primary',
  disabled = false,
  className = '',
  glitch = false
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const variants = {
    primary: 'border-cyan-500 text-cyan-400 hover:bg-cyan-500/20 hover:shadow-cyan-500/50',
    secondary: 'border-purple-500 text-purple-400 hover:bg-purple-500/20 hover:shadow-purple-500/50',
    danger: 'border-red-500 text-red-400 hover:bg-red-500/20 hover:shadow-red-500/50',
    success: 'border-green-500 text-green-400 hover:bg-green-500/20 hover:shadow-green-500/50'
  };

  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      className={`
        relative px-6 py-3 bg-black/80 border-2 font-mono tracking-wider
        transition-all duration-300 uppercase shadow-lg
        ${variants[variant]}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${className}
      `}
      whileHover={{ scale: disabled ? 1 : 1.05 }}
      whileTap={{ scale: disabled ? 1 : 0.95 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
    >
      {/* Corner accents */}
      <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-current"></div>
      <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-current"></div>
      <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-current"></div>
      <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-current"></div>
      
      {/* Glitch effect */}
      {glitch && isHovered && (
        <>
          <span className="absolute inset-0 flex items-center justify-center text-red-500 animate-glitch-1">
            {children}
          </span>
          <span className="absolute inset-0 flex items-center justify-center text-blue-500 animate-glitch-2">
            {children}
          </span>
        </>
      )}
      
      <span className="relative z-10">{children}</span>
    </motion.button>
  );
};

// Terminal Input Component
interface TerminalInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  prefix?: string;
  onSubmit?: () => void;
  className?: string;
}

export const TerminalInput: React.FC<TerminalInputProps> = ({
  value,
  onChange,
  placeholder = '',
  prefix = '>',
  onSubmit,
  className = ''
}) => {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <div className={`relative ${className}`}>
      <div className="flex items-center bg-black/90 border-2 border-cyan-500/50 rounded px-3 py-2 font-mono">
        <span className="text-cyan-400 mr-2">{prefix}</span>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && onSubmit?.()}
          placeholder={placeholder}
          className="flex-1 bg-transparent text-cyan-300 outline-none placeholder-cyan-800"
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
        />
        {isFocused && (
          <motion.div
            className="w-2 h-5 bg-cyan-400"
            animate={{ opacity: [1, 0] }}
            transition={{ duration: 0.5, repeat: Infinity }}
          />
        )}
      </div>
    </div>
  );
};

// Terminal Loader Component
interface TerminalLoaderProps {
  text?: string;
  progress?: number;
}

export const TerminalLoader: React.FC<TerminalLoaderProps> = ({ 
  text = 'LOADING...', 
  progress 
}) => {
  const [dots, setDots] = useState('');

  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.');
    }, 500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-3">
      <div className="text-cyan-400 font-mono text-lg text-center">
        {text}{dots}
      </div>
      
      {progress !== undefined && (
        <div className="w-full h-2 bg-black border border-cyan-500/50 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-cyan-500 to-blue-500"
            initial={{ width: '0%' }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      )}
      
      <div className="flex justify-center space-x-1">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-2 h-2 bg-cyan-400 rounded-full"
            animate={{ 
              y: [0, -10, 0],
              opacity: [0.3, 1, 0.3]
            }}
            transition={{ 
              duration: 1,
              delay: i * 0.2,
              repeat: Infinity
            }}
          />
        ))}
      </div>
    </div>
  );
};

// ASCII Art Title Component
interface ASCIITitleProps {
  text: string;
  className?: string;
}

export const ASCIITitle: React.FC<ASCIITitleProps> = ({ text, className = '' }) => {
  return (
    <pre className={`text-cyan-400 font-mono text-xs sm:text-sm leading-none select-none ${className}`}>
{`
 █████╗ ███╗   ██╗██╗███╗   ███╗███████╗
██╔══██╗████╗  ██║██║████╗ ████║██╔════╝
███████║██╔██╗ ██║██║██╔████╔██║█████╗  
██╔══██║██║╚██╗██║██║██║╚██╔╝██║██╔══╝  
██║  ██║██║ ╚████║██║██║ ╚═╝ ██║███████╗
╚═╝  ╚═╝╚═╝  ╚═══╝╚═╝╚═╝     ╚═╝╚══════╝
                                         
 ██████╗  █████╗ ██╗     ██╗     ███████╗██████╗ ██╗   ██╗
██╔════╝ ██╔══██╗██║     ██║     ██╔════╝██╔══██╗╚██╗ ██╔╝
██║  ███╗███████║██║     ██║     █████╗  ██████╔╝ ╚████╔╝ 
██║   ██║██╔══██║██║     ██║     ██╔══╝  ██╔══██╗  ╚██╔╝  
╚██████╔╝██║  ██║███████╗███████╗███████╗██║  ██║   ██║   
 ╚═════╝ ╚═╝  ╚═╝╚══════╝╚══════╝╚══════╝╚═╝  ╚═╝   ╚═╝   
`}
    </pre>
  );
};

// Holographic Display Component
interface HolographicDisplayProps {
  children: ReactNode;
  active?: boolean;
  className?: string;
}

export const HolographicDisplay: React.FC<HolographicDisplayProps> = ({
  children,
  active = true,
  className = ''
}) => {
  return (
    <div className={`relative ${className}`}>
      {/* Holographic effect layers */}
      <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 via-transparent to-purple-500/10 animate-pulse pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-500/5 to-transparent pointer-events-none" />
      
      {/* Content with holographic styling */}
      <div className={`relative ${active ? 'animate-hologram' : ''}`}>
        {children}
      </div>
      
      {/* Grid overlay */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-10"
        style={{
          backgroundImage: `
            linear-gradient(0deg, transparent 24%, rgba(0, 255, 255, 0.2) 25%, rgba(0, 255, 255, 0.2) 26%, transparent 27%, transparent 74%, rgba(0, 255, 255, 0.2) 75%, rgba(0, 255, 255, 0.2) 76%, transparent 77%, transparent),
            linear-gradient(90deg, transparent 24%, rgba(0, 255, 255, 0.2) 25%, rgba(0, 255, 255, 0.2) 26%, transparent 27%, transparent 74%, rgba(0, 255, 255, 0.2) 75%, rgba(0, 255, 255, 0.2) 76%, transparent 77%, transparent)
          `,
          backgroundSize: '20px 20px'
        }}
      />
    </div>
  );
}; 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 