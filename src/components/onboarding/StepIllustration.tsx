
import { lazy, Suspense, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, Settings, Users, CheckCircle, Loader2 } from 'lucide-react';

interface StepIllustrationProps {
  step: number;
  className?: string;
}

// Animation Skeleton Component
const AnimationSkeleton = () => (
  <div className="w-full h-64 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 rounded-2xl flex items-center justify-center">
    <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
  </div>
);

// Template Animation Component
const TemplateAnimation = () => (
  <motion.div
    className="w-full h-64 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 rounded-2xl flex flex-col items-center justify-center relative overflow-hidden"
    initial={{ opacity: 0, scale: 0.8 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.6 }}
  >
    <motion.div
      animate={{ 
        rotate: 360,
        scale: [1, 1.1, 1]
      }}
      transition={{ 
        rotate: { duration: 4, repeat: Infinity, ease: 'linear' },
        scale: { duration: 2, repeat: Infinity, ease: 'easeInOut' }
      }}
      className="relative"
    >
      <Building2 className="h-16 w-16 text-blue-500" />
      <motion.div
        className="absolute -top-2 -right-2 w-6 h-6 bg-purple-500 rounded-full"
        animate={{ scale: [0, 1, 0] }}
        transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
      />
    </motion.div>
    <motion.p
      className="mt-4 text-blue-600 dark:text-blue-400 font-medium"
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.3 }}
    >
      Choose Your Template
    </motion.p>
    {/* Floating elements */}
    {[...Array(3)].map((_, i) => (
      <motion.div
        key={i}
        className="absolute w-2 h-2 bg-blue-300 rounded-full"
        animate={{
          x: [0, 30, -30, 0],
          y: [0, -20, 20, 0],
          opacity: [0.3, 1, 0.3]
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          delay: i * 0.5
        }}
        style={{
          left: `${20 + i * 20}%`,
          top: `${30 + i * 10}%`
        }}
      />
    ))}
  </motion.div>
);

// Section Animation Component
const SectionAnimation = () => (
  <motion.div
    className="w-full h-64 bg-gradient-to-br from-green-50 to-teal-50 dark:from-green-950 dark:to-teal-950 rounded-2xl flex flex-col items-center justify-center relative"
    initial={{ opacity: 0, x: 20 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ duration: 0.6 }}
  >
    <motion.div
      animate={{ y: [-5, 5, -5] }}
      transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
    >
      <Settings className="h-16 w-16 text-green-500" />
    </motion.div>
    <motion.p
      className="mt-4 text-green-600 dark:text-green-400 font-medium"
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.3 }}
    >
      Customize Sections
    </motion.p>
    {/* Animated checkboxes */}
    <div className="absolute top-8 right-8 space-y-2">
      {[...Array(3)].map((_, i) => (
        <motion.div
          key={i}
          className="flex items-center space-x-2"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 + i * 0.2 }}
        >
          <motion.div
            className="w-3 h-3 bg-green-500 rounded-sm"
            animate={{ scale: [0.8, 1, 0.8] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.3 }}
          />
          <div className="w-8 h-1 bg-green-200 rounded" />
        </motion.div>
      ))}
    </div>
  </motion.div>
);

// Role Animation Component
const RoleAnimation = () => (
  <motion.div
    className="w-full h-64 bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-950 dark:to-red-950 rounded-2xl flex flex-col items-center justify-center relative"
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.6 }}
  >
    <motion.div
      animate={{ rotate: [0, 10, -10, 0] }}
      transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
    >
      <Users className="h-16 w-16 text-orange-500" />
    </motion.div>
    <motion.p
      className="mt-4 text-orange-600 dark:text-orange-400 font-medium"
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.3 }}
    >
      Setup Roles & Positions
    </motion.p>
    {/* Animated user avatars */}
    <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex space-x-2">
      {[...Array(4)].map((_, i) => (
        <motion.div
          key={i}
          className="w-6 h-6 bg-orange-300 rounded-full"
          animate={{ 
            y: [0, -8, 0],
            scale: [1, 1.1, 1]
          }}
          transition={{ 
            duration: 1.5, 
            repeat: Infinity, 
            delay: i * 0.2 
          }}
        />
      ))}
    </div>
  </motion.div>
);

// Review Animation Component
const ReviewAnimation = () => (
  <motion.div
    className="w-full h-64 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950 rounded-2xl flex flex-col items-center justify-center relative"
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.6 }}
  >
    <motion.div
      animate={{ 
        scale: [1, 1.2, 1],
        rotate: [0, 360]
      }}
      transition={{ 
        scale: { duration: 2, repeat: Infinity, ease: 'easeInOut' },
        rotate: { duration: 4, repeat: Infinity, ease: 'linear' }
      }}
    >
      <CheckCircle className="h-16 w-16 text-purple-500" />
    </motion.div>
    <motion.p
      className="mt-4 text-purple-600 dark:text-purple-400 font-medium"
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.3 }}
    >
      Review & Complete
    </motion.p>
    {/* Success particles */}
    {[...Array(8)].map((_, i) => (
      <motion.div
        key={i}
        className="absolute w-1 h-1 bg-purple-400 rounded-full"
        animate={{
          x: [0, Math.cos(i * 45 * Math.PI / 180) * 40],
          y: [0, Math.sin(i * 45 * Math.PI / 180) * 40],
          opacity: [0, 1, 0],
          scale: [0, 1, 0]
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          delay: i * 0.1
        }}
        style={{ left: '50%', top: '50%' }}
      />
    ))}
  </motion.div>
);

export default function StepIllustration({ step, className = "" }: StepIllustrationProps) {
  const renderAnimation = () => {
    switch (step) {
      case 1:
        return <TemplateAnimation />;
      case 2:
        return <SectionAnimation />;
      case 3:
        return <RoleAnimation />;
      case 4:
        return <ReviewAnimation />;
      default:
        return <TemplateAnimation />;
    }
  };

  return (
    <div className={`w-full max-w-md mx-auto ${className}`}>
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.4 }}
        >
          <Suspense fallback={<AnimationSkeleton />}>
            {renderAnimation()}
          </Suspense>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
