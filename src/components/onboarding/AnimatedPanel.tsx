
import { ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface AnimatedPanelProps {
  children: ReactNode;
  step: number;
  direction?: 'left' | 'right';
  className?: string;
}

export default function AnimatedPanel({ 
  children, 
  step, 
  direction = 'right',
  className = "" 
}: AnimatedPanelProps) {
  const slideVariants = {
    enter: (direction: string) => ({
      x: direction === 'right' ? 50 : -50,
      opacity: 0,
      scale: 0.98
    }),
    center: {
      x: 0,
      opacity: 1,
      scale: 1
    },
    exit: (direction: string) => ({
      x: direction === 'right' ? -50 : 50,
      opacity: 0,
      scale: 0.98
    })
  };

  return (
    <AnimatePresence mode="wait" custom={direction}>
      <motion.div
        key={step}
        custom={direction}
        variants={slideVariants}
        initial="enter"
        animate="center"
        exit="exit"
        transition={{
          duration: 0.4,
          ease: [0.4, 0, 0.2, 1],
          type: "spring",
          stiffness: 300,
          damping: 30
        }}
        className={`w-full ${className}`}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
