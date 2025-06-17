import { motion, type Transition } from 'framer-motion';
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

const pageTransition: Transition = {
  type: 'tween', // No longer need 'as const' here if pageTransition is typed
  ease: [0.42, 0, 0.58, 1], // Standard easeInOut cubic-bezier
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
