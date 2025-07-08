import React from 'react';
import { motion } from 'framer-motion';

const PixelArtFaceSwap: React.FC = () => {
  return (
    <div className="relative w-32 h-32 mx-auto mb-6">
      {/* Main Face Container */}
      <div className="absolute inset-0 grid grid-cols-10 grid-rows-10 gap-0">
        {/* First Face (Source) */}
        <motion.div
          className="absolute inset-0 grid grid-cols-10 grid-rows-10 gap-0"
          animate={{
            x: [-30, 0, -30],
            opacity: [1, 0.5, 1],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          {/* Hair */}
          <div className="col-start-3 col-span-6 row-start-1 bg-yellow-600 rounded-t-lg"></div>
          <div className="col-start-2 col-span-8 row-start-2 bg-yellow-600"></div>
          
          {/* Face */}
          <div className="col-start-3 col-span-6 row-start-3 bg-orange-200"></div>
          <div className="col-start-2 col-span-8 row-start-4 row-span-3 bg-orange-200">
            {/* Eyes */}
            <div className="grid grid-cols-8 grid-rows-3 h-full">
              <div className="col-start-2 row-start-1 bg-blue-500 rounded-full"></div>
              <div className="col-start-6 row-start-1 bg-blue-500 rounded-full"></div>
              {/* Smile */}
              <div className="col-start-3 col-span-4 row-start-3 bg-pink-500 rounded-b-full h-2"></div>
            </div>
          </div>
          {/* Neck */}
          <div className="col-start-4 col-span-4 row-start-7 bg-orange-200"></div>
          <div className="col-start-3 col-span-6 row-start-8 row-span-2 bg-blue-600 rounded-b-lg"></div>
        </motion.div>

        {/* Second Face (Target) */}
        <motion.div
          className="absolute inset-0 grid grid-cols-10 grid-rows-10 gap-0"
          animate={{
            x: [30, 0, 30],
            opacity: [1, 0.5, 1],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1.5
          }}
        >
          {/* Hair */}
          <div className="col-start-3 col-span-6 row-start-1 bg-purple-800 rounded-t-lg"></div>
          <div className="col-start-2 col-span-8 row-start-2 bg-purple-800"></div>
          
          {/* Face */}
          <div className="col-start-3 col-span-6 row-start-3 bg-yellow-100"></div>
          <div className="col-start-2 col-span-8 row-start-4 row-span-3 bg-yellow-100">
            {/* Eyes */}
            <div className="grid grid-cols-8 grid-rows-3 h-full">
              <div className="col-start-2 row-start-1 bg-green-500 rounded-full"></div>
              <div className="col-start-6 row-start-1 bg-green-500 rounded-full"></div>
              {/* Smile */}
              <div className="col-start-3 col-span-4 row-start-3 bg-red-500 rounded-b-full h-2"></div>
            </div>
          </div>
          {/* Neck */}
          <div className="col-start-4 col-span-4 row-start-7 bg-yellow-100"></div>
          <div className="col-start-3 col-span-6 row-start-8 row-span-2 bg-red-600 rounded-b-lg"></div>
        </motion.div>

        {/* Swap Animation Arrows */}
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          animate={{
            rotate: [0, 360],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          <div className="text-3xl font-bold text-white drop-shadow-lg">⇄</div>
        </motion.div>

        {/* Sparkle Effects */}
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-yellow-300 rounded-full"
            style={{
              left: `${10 + Math.random() * 80}%`,
              top: `${10 + Math.random() * 80}%`,
            }}
            animate={{
              opacity: [0, 1, 0],
              scale: [0, 1.5, 0],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              delay: Math.random() * 3,
              ease: "easeOut"
            }}
          />
        ))}
      </div>
    </div>
  );
};

export default PixelArtFaceSwap; 