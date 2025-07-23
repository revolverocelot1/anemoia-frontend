import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Diverse messages for the coffee popup
const COFFEE_MESSAGES = [
  "Coffee time? ☕",
  "Support me with coffee! ☕",
  "Buy me a coffee? 🥺",
  "Fuel my coding! ⚡",
  "Keep me caffeinated! ☕",
  "Coffee = More features! 🚀",
  "Help me stay awake! 😴",
  "Espresso yourself! ☕",
  "Coffee break? ☕",
  "Coding fuel needed! ⚡",
  "Support = ❤️ + ☕",
  "Coffee powers AI! 🤖",
  "Buy me a latte? ☕",
  "Keep the code flowing! 💻",
  "Coffee fund? 🙏",
];

// Possible positions on the sidelines
type SidePosition = {
  side: 'left' | 'right' | 'top';
  position: string;
  initial: any;
  animate: any;
  exit: any;
  className: string;
  style: React.CSSProperties;
};

const CoffeeDonation = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [showCount, setShowCount] = useState(0);
  const [currentMessage, setCurrentMessage] = useState(COFFEE_MESSAGES[0]);
  const [currentPosition, setCurrentPosition] = useState<SidePosition | null>(null);

  // Function to get random sideline position
  const getRandomSidePosition = (): SidePosition => {
    const sides = ['left', 'right', 'top'] as const;
    const side = sides[Math.floor(Math.random() * sides.length)];
    
    // Random vertical position for left/right sides (20% to 80% of viewport height)
    const verticalPos = 20 + Math.random() * 60;
    
    // Random horizontal position for top side (20% to 80% of viewport width)
    const horizontalPos = 20 + Math.random() * 60;
    
    switch (side) {
      case 'left':
        return {
          side: 'left',
          position: `${verticalPos}%`,
          initial: { x: -100, opacity: 0, scale: 0 },
          animate: { x: 0, opacity: 1, scale: 1 },
          exit: { x: -100, opacity: 0, scale: 0 },
          className: `fixed left-4 z-[9999]`,
          style: { top: `${verticalPos}%` }
        };
      case 'right':
        return {
          side: 'right',
          position: `${verticalPos}%`,
          initial: { x: 100, opacity: 0, scale: 0 },
          animate: { x: 0, opacity: 1, scale: 1 },
          exit: { x: 100, opacity: 0, scale: 0 },
          className: `fixed right-4 z-[9999]`,
          style: { top: `${verticalPos}%` }
        };
      case 'top':
        return {
          side: 'top',
          position: `${horizontalPos}%`,
          initial: { y: -100, opacity: 0, scale: 0 },
          animate: { y: 0, opacity: 1, scale: 1 },
          exit: { y: -100, opacity: 0, scale: 0 },
          className: `fixed top-4 z-[9999]`,
          style: { left: `${horizontalPos}%` }
        };
    }
  };

  // Show the button periodically with cartoon pop effect
  useEffect(() => {
    const showButton = () => {
      // Select random message
      const randomMessage = COFFEE_MESSAGES[Math.floor(Math.random() * COFFEE_MESSAGES.length)];
      setCurrentMessage(randomMessage);
      
      // Select random position
      const position = getRandomSidePosition();
      setCurrentPosition(position);
      
      setIsVisible(true);
      setShowCount(prev => prev + 1);
      
      // Auto-hide after 5 seconds
      setTimeout(() => {
        setIsVisible(false);
      }, 5000);
    };

    // Initial delay of 30 seconds
    const initialTimer = setTimeout(showButton, 30000);

    // Show every 2-3 minutes (random interval)
    const setupInterval = () => {
      const randomInterval = 120000 + Math.random() * 60000; // 2-3 minutes
      return setTimeout(() => {
        showButton();
        setupInterval(); // Set up next interval
      }, randomInterval);
    };

    const intervalTimer = setupInterval();

    return () => {
      clearTimeout(initialTimer);
      clearTimeout(intervalTimer);
    };
  }, []);

  const handleClick = () => {
    window.open('https://www.buymeacoffee.com/ocelot', '_blank');
    setIsVisible(false);
  };

  return (
    <AnimatePresence>
      {isVisible && currentPosition && (
        <motion.div
          key={showCount} // Force re-animation on each show
          initial={currentPosition.initial}
          animate={{
            ...currentPosition.animate,
            transition: {
              type: "spring",
              duration: 0.6,
              bounce: 0.6,
              damping: 10,
              stiffness: 100
            }
          }}
          exit={{
            ...currentPosition.exit,
            transition: {
              duration: 0.3,
              ease: "easeIn"
            }
          }}
          className={currentPosition.className}
          style={{ ...currentPosition.style, pointerEvents: 'auto' }}
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
              className="absolute -top-14 left-1/2 transform -translate-x-1/2"
            >
              <div className="relative bg-white rounded-2xl px-3 py-2 shadow-lg border-2 border-gray-200 max-w-[150px]">
                <div className="text-xs font-bold text-gray-800 text-center">{currentMessage}</div>
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
 