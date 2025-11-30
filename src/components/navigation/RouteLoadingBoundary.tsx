import { Suspense, ReactNode } from 'react';
import { useNavigation } from 'react-router-dom';
import { LoadingSpinner } from '@/components/ui/loading-states';
import { motion, AnimatePresence } from 'framer-motion';
import ErrorBoundary from '@/components/ui/error-boundary';
import { appEnv } from '@/lib/env';

interface RouteLoadingBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export function RouteLoadingBoundary({ children, fallback }: RouteLoadingBoundaryProps) {
  let navigationState: ReturnType<typeof useNavigation>['state'] = 'idle';
  try {
    navigationState = useNavigation().state;
  } catch {
    navigationState = 'idle';
  }

  const isLoading = navigationState === 'loading';
  const defaultFallback = (
    <div className="flex flex-col h-screen overflow-hidden">
      <div className="flex-1 overflow-y-auto min-h-0 flex items-center justify-center p-6">
        <LoadingSpinner text="Loading page..." />
      </div>
    </div>
  );
  const safeFallback = fallback || defaultFallback;

  const inlineErrorFallback = (
    <div className="p-6">
      <div className="rounded-xl border border-dashed border-primary/30 bg-primary/5 p-4 text-center text-sm text-muted-foreground">
        <p className="font-medium text-foreground">This view is temporarily unavailable.</p>
        <p className="mt-1 text-xs text-muted-foreground">Please refresh or try a different section.</p>
      </div>
    </div>
  );

  const content = children ?? inlineErrorFallback;
  const renderContent = (
    <ErrorBoundary fallback={inlineErrorFallback} showDetails={appEnv.DEV}>
      <Suspense fallback={safeFallback}>{content}</Suspense>
    </ErrorBoundary>
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
          {safeFallback}
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
        {renderContent}
      </motion.div>
    </AnimatePresence>
  );
}
