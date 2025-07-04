import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const CoffeeDonation = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Show the button periodically
  useEffect(() => {
    const showButton = () => {
      setIsVisible(true);
      setTimeout(() => {
        if (!isHovered) {
          setIsVisible(false);
        }
      }, 3000); // Hide after 3 seconds if not hovered
    };

    // Initial show after 10 seconds
    const initialTimer = setTimeout(showButton, 10000);
    
    // Show every 2 minutes
    const interval = setInterval(showButton, 120000);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, [isHovered]);

  const handleClick = () => {
    window.open('https://www.buymeacoffee.com/yourusername', '_blank');
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ scale: 0, opacity: 0, rotate: -180 }}
          animate={{ 
            scale: 1, 
            opacity: 1, 
            rotate: 0,
            transition: {
              type: "spring",
              stiffness: 260,
              damping: 20
            }
          }}
          exit={{ 
            scale: 0, 
            opacity: 0, 
            rotate: 180,
            transition: { duration: 0.3 }
          }}
          whileHover={{ 
            scale: 1.1,
            rotate: [0, -10, 10, -10, 0],
            transition: { 
              rotate: {
                duration: 0.5,
                repeat: Infinity,
                repeatDelay: 2
              }
            }
          }}
          className="fixed bottom-8 right-8 z-50"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => {
            setIsHovered(false);
            setTimeout(() => {
              if (!isHovered) {
                setIsVisible(false);
              }
            }, 1000);
          }}
        >
          <button
            onClick={handleClick}
            className="relative group"
          >
            {/* Glow effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-amber-400 to-orange-500 rounded-full blur-xl opacity-50 group-hover:opacity-75 transition-opacity" />
            
            {/* Button content */}
            <div className="relative bg-gradient-to-br from-amber-500 to-orange-600 rounded-full p-4 shadow-2xl border-2 border-amber-300/50 backdrop-blur-sm">
              {/* Coffee cup icon */}
              <svg
                className="w-8 h-8 text-white"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M2 21h18v-2H2M20 8h-2V5h2m0-2H4v10a4 4 0 0 0 4 4h6a4 4 0 0 0 4-4v-3h2a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2z" />
              </svg>
              
              {/* Steam animation */}
              <motion.div
                className="absolute -top-2 left-1/2 transform -translate-x-1/2"
                animate={{
                  y: [-5, -15],
                  opacity: [0.8, 0],
                  scale: [1, 1.5],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeOut"
                }}
              >
                <div className="text-white text-xs">~</div>
              </motion.div>
              
              <motion.div
                className="absolute -top-1 left-1/2 transform -translate-x-1/2 translate-x-1"
                animate={{
                  y: [-5, -15],
                  opacity: [0.8, 0],
                  scale: [1, 1.5],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeOut",
                  delay: 0.5
                }}
              >
                <div className="text-white text-xs">~</div>
              </motion.div>
            </div>
            
            {/* Tooltip */}
            <AnimatePresence>
              {isHovered && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 whitespace-nowrap"
                >
                  <div className="bg-gray-900 text-white text-sm px-3 py-2 rounded-lg shadow-lg">
                    <div className="font-semibold">Buy me a coffee! ☕</div>
                    <div className="text-xs text-gray-300">Support the development</div>
                    <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 rotate-45 w-2 h-2 bg-gray-900" />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CoffeeDonation; 