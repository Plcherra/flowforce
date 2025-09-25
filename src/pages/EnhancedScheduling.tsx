
import { NextGenSchedulingSystem } from '@/components/scheduling/NextGenSchedulingSystem';
import { useIsMobile } from '@/hooks/use-mobile';

import { useSearchParams } from 'react-router-dom';
import { SchedulingProvider } from '@/contexts/SchedulingContext';

export default function EnhancedScheduling() {
  const isMobile = useIsMobile();
  const [params] = useSearchParams();
  const locationFilter = params.get('location') || undefined;
  
  return (
    <div>
      <div className={isMobile ? 'p-2' : 'p-6'}>
        <SchedulingProvider>
          <NextGenSchedulingSystem locationFilter={locationFilter} />
        </SchedulingProvider>
      </div>
    </div>
  );
}
