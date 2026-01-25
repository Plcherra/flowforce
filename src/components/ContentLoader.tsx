import { useState, useEffect } from 'react';
import { useNavigation } from 'react-router-dom';
import { LoadingSpinner } from '@/components/ui/loading-states';

export function ContentLoader({ children }: { children: React.ReactNode }) {
  const navigation = useNavigation();
  const [showLoader, setShowLoader] = useState(false);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    if ((navigation.state as string) === 'loading') {
      // Show loader after 100ms to avoid flash for fast transitions
      timeoutId = setTimeout(() => setShowLoader(true), 100);
    } else {
      setShowLoader(false);
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [navigation.state]);

  if (showLoader) {
    return (
      <div className="p-6">
        <LoadingSpinner text="Loading..." />
      </div>
    );
  }

  return <>{children}</>;
}