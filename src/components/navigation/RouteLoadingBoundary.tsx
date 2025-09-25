import { Suspense, ReactNode } from 'react';
import { useNavigation } from 'react-router-dom';
import { LoadingSpinner } from '@/components/ui/loading-states';
import { motion, AnimatePresence } from 'framer-motion';

interface RouteLoadingBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export function RouteLoadingBoundary({ children, fallback }: RouteLoadingBoundaryProps) {
  const navigation = useNavigation();
  
  const isLoading = navigation.state === 'loading';
  
  const defaultFallback = (
    <motion.div 
      className="min-h-screen flex items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <LoadingSpinner text="Loading page..." />
    </motion.div>
  );

  // Show loading state with smooth transition
  if (isLoading) {
    return (
      <AnimatePresence mode="wait">
        <motion.div
          key="loading"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
        >
          {fallback || defaultFallback}
        </motion.div>
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="content"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
      >
        <Suspense fallback={fallback || defaultFallback}>
          {children}
        </Suspense>
      </motion.div>
    </AnimatePresence>
  );
}