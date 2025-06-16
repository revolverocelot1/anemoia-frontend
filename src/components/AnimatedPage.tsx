import { motion } from 'framer-motion';
import React from 'react';

interface AnimatedPageProps {
  children: React.ReactNode;
}

const pageVariants = {
  initial: {
    opacity: 0,
    y: 20, // Start slightly below
  },
  in: {
    opacity: 1,
    y: 0, // Animate to original position
  },
  out: {
    opacity: 0,
    y: -20, // Exit slightly above
  },
};

const pageTransition = {
  type: 'tween',
  ease: 'anticipate', // Can try 'easeInOut' or others
  duration: 0.5,
};

const AnimatedPage: React.FC<AnimatedPageProps> = ({ children }) => {
  return (
    <motion.div
      initial="initial"
      animate="in"
      exit="out"
      variants={pageVariants}
      transition={pageTransition}
      style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', width: '100%' }}
    >
      {children}
    </motion.div>
  );
};

export default AnimatedPage;
