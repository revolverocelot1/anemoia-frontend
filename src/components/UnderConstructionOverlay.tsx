import React from 'react';
import { motion } from 'framer-motion';

const UnderConstructionOverlay: React.FC = () => {
  return (
    <div className="absolute inset-0 bg-black/90 backdrop-blur-sm rounded-xl flex items-center justify-center overflow-hidden z-50" style={{ zIndex: 50 }}>
      {/* Pixel Art Construction Animation */}
      <div className="relative z-10">
        {/* Main Container */}
        <div className="flex flex-col items-center gap-3">
          {/* Animated Construction Worker */}
          <div className="relative w-24 h-24">
            <motion.div
              className="absolute inset-0"
              animate={{
                y: [0, -8, 0],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              {/* Pixel Art Worker */}
              <div className="grid grid-cols-8 grid-rows-8 w-full h-full gap-0">
                {/* Hard Hat */}
                <div className="col-start-3 col-span-4 row-start-1 bg-yellow-400 rounded-sm"></div>
                <div className="col-start-2 col-span-6 row-start-2 bg-yellow-500 rounded-sm"></div>
                
                {/* Face */}
                <div className="col-start-3 col-span-4 row-start-3 bg-orange-200 rounded-sm"></div>
                <div className="col-start-3 col-span-4 row-start-4 bg-orange-200 rounded-sm">
                  {/* Eyes */}
                  <div className="grid grid-cols-4 h-full gap-0">
                    <div className="col-start-1 bg-black rounded-full"></div>
                    <div className="col-start-3 bg-black rounded-full"></div>
                  </div>
                </div>
                
                {/* Body */}
                <div className="col-start-2 col-span-6 row-start-5 bg-orange-500 rounded-sm"></div>
                <div className="col-start-2 col-span-6 row-start-6 bg-orange-500 rounded-sm"></div>
                
                {/* Arms */}
                <div className="col-start-1 row-start-5 bg-orange-200 rounded-sm"></div>
                <div className="col-start-8 row-start-5 bg-orange-200 rounded-sm"></div>
                
                {/* Legs */}
                <div className="col-start-3 col-span-2 row-start-7 bg-blue-600 rounded-sm"></div>
                <div className="col-start-5 col-span-2 row-start-7 bg-blue-600 rounded-sm"></div>
                <div className="col-start-3 col-span-2 row-start-8 bg-gray-800 rounded-sm"></div>
                <div className="col-start-5 col-span-2 row-start-8 bg-gray-800 rounded-sm"></div>
              </div>
            </motion.div>
            
            {/* Animated Hammer */}
            <motion.div
              className="absolute top-6 -right-6 w-6 h-12"
              animate={{
                rotate: [-30, -60, -30],
                x: [0, -3, 0],
              }}
              transition={{
                duration: 1,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              <div className="grid grid-cols-2 grid-rows-6 w-full h-full gap-0">
                {/* Hammer Head */}
                <div className="col-span-2 row-span-2 bg-gray-600 rounded-sm"></div>
                {/* Handle */}
                <div className="col-start-1 row-start-3 row-span-4 bg-yellow-800 rounded-sm"></div>
              </div>
            </motion.div>
          </div>
          
          {/* Pixel Text "UNDER CONSTRUCTION" */}
          <div className="flex flex-col items-center gap-1">
            <motion.div
              className="flex gap-1"
              animate={{
                opacity: [1, 0.5, 1],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              <span className="text-yellow-400 font-mono text-xs font-bold tracking-wider">UNDER</span>
            </motion.div>
            <motion.div
              className="flex gap-1"
              animate={{
                opacity: [1, 0.5, 1],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 0.2
              }}
            >
              <span className="text-orange-400 font-mono text-xs font-bold tracking-wider">CONSTRUCTION</span>
            </motion.div>
          </div>
          
          {/* Animated Progress Bar */}
          <div className="w-full max-w-[150px] h-3 bg-gray-800 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-yellow-400 to-orange-500"
              animate={{
                width: ["0%", "100%", "0%"],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
          </div>
          
          {/* Pixel Bricks Animation */}
          <div className="absolute -bottom-2 left-0 right-0 flex justify-center gap-1">
            {[0, 1, 2, 3].map((index) => (
              <motion.div
                key={index}
                className="w-3 h-3 bg-red-600 border border-red-800 rounded-sm"
                animate={{
                  y: [0, -15, 0],
                  opacity: [0, 1, 0],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  delay: index * 0.2,
                  ease: "easeInOut"
                }}
              />
            ))}
          </div>
          
          {/* Flashing Warning Lights */}
          <motion.div
            className="absolute -top-2 -left-2 w-2 h-2 bg-red-500 rounded-full"
            animate={{
              opacity: [0, 1, 0],
            }}
            transition={{
              duration: 0.5,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          <motion.div
            className="absolute -top-2 -right-2 w-2 h-2 bg-red-500 rounded-full"
            animate={{
              opacity: [0, 1, 0],
            }}
            transition={{
              duration: 0.5,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 0.25
            }}
          />
          
          {/* Sparks Effect */}
          <div className="absolute inset-0 pointer-events-none">
            {[...Array(3)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-1 h-1 bg-yellow-300 rounded-full"
                style={{
                  top: '40%',
                  left: '60%',
                }}
                animate={{
                  x: [0, (i - 1) * 20],
                  y: [0, -30 + i * 10],
                  opacity: [0, 1, 0],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  delay: i * 0.3,
                  ease: "easeOut"
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UnderConstructionOverlay; 