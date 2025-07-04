import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const CoffeeDonation = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [showCount, setShowCount] = useState(0);

  // Show the button periodically with cartoon pop effect
  useEffect(() => {
    const showButton = () => {
      setIsVisible(true);
      setShowCount(prev => prev + 1);
      
      // Auto-hide after 1.5 seconds
      setTimeout(() => {
        setIsVisible(false);
      }, 1500);
    };

    // Initial show after 30 seconds
    const initialTimer = setTimeout(showButton, 30000);
    
    // Show every 5 minutes
    const interval = setInterval(showButton, 300000);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, []);

  const handleClick = () => {
    window.open('https://www.buymeacoffee.com/yourusername', '_blank');
    setIsVisible(false);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          key={showCount} // Force re-animation on each show
          initial={{ scale: 0, opacity: 0, y: 100 }}
          animate={{ 
            scale: [0, 1.2, 0.9, 1],
            opacity: 1,
            y: 0,
            transition: {
              type: "spring",
              duration: 0.6,
              bounce: 0.6
            }
          }}
          exit={{ 
            scale: 0,
            opacity: 0,
            y: -50,
            transition: { 
              duration: 0.3,
              ease: "easeIn"
            }
          }}
          className="fixed bottom-6 right-6 z-50"
          style={{ pointerEvents: 'auto' }}
        >
          <motion.button
            onClick={handleClick}
            className="relative group"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {/* Cartoon bubble background */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-br from-amber-400 via-amber-500 to-orange-500 rounded-full"
              animate={{
                boxShadow: [
                  "0 0 20px rgba(251, 191, 36, 0.5)",
                  "0 0 40px rgba(251, 191, 36, 0.7)",
                  "0 0 20px rgba(251, 191, 36, 0.5)"
                ]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
            
            {/* Cartoon coffee cup */}
            <div className="relative p-3 rounded-full">
              <div className="relative w-10 h-10">
                {/* Cup body */}
                <div className="absolute inset-0 bg-white rounded-lg transform rotate-3" />
                
                {/* Coffee inside */}
                <div className="absolute inset-x-1 top-2 bottom-1 bg-gradient-to-b from-amber-700 to-amber-900 rounded-lg" />
                
                {/* Cup handle */}
                <div className="absolute -right-2 top-3 w-3 h-4 border-2 border-white border-l-0 rounded-r-full" />
                
                {/* Cute face */}
                <div className="absolute inset-x-0 top-4 flex justify-center gap-2">
                  <div className="w-1 h-1 bg-gray-800 rounded-full" />
                  <div className="w-1 h-1 bg-gray-800 rounded-full" />
                </div>
                <div className="absolute inset-x-0 top-6 flex justify-center">
                  <motion.div
                    className="w-3 h-1 bg-gray-800 rounded-full"
                    animate={{ scaleX: [1, 0.6, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                </div>
                
                {/* Steam animation */}
                <motion.div
                  className="absolute -top-3 left-1/2 transform -translate-x-1/2"
                  animate={{
                    y: [-2, -8],
                    opacity: [0, 1, 0],
                    scale: [0.8, 1.2],
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: "easeOut"
                  }}
                >
                  <div className="text-white text-lg font-bold"></div>
                </motion.div>
              </div>
              
              {/* Bouncing hearts */}
              <motion.div
                className="absolute -top-2 -right-2"
                animate={{
                  y: [0, -5, 0],
                  rotate: [-10, 10, -10],
                }}
                transition={{
                  duration: 1,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              >
                <span className="text-red-500 text-sm"></span>
              </motion.div>
            </div>
            
            {/* Speech bubble */}
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="absolute -top-12 left-1/2 transform -translate-x-1/2 whitespace-nowrap"
            >
              <div className="relative bg-white rounded-2xl px-3 py-1.5 shadow-lg border-2 border-gray-200">
                <div className="text-xs font-bold text-gray-800">Coffee time? </div>
                {/* Bubble tail */}
                <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-full">
                  <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-white" />
                </div>
              </div>
            </motion.div>
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CoffeeDonation;
