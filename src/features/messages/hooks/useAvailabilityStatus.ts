import { useCallback, useEffect, useRef, useState } from 'react';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

interface AvailabilityStatus {
  available: boolean;
  loading: boolean;
  updateAvailability: (value: boolean) => Promise<void>;
}

const AvailabilityMetadataSchema = z.object({
  availability: z.boolean().optional(),
});

export function useAvailabilityStatus(): AvailabilityStatus {
  const [available, setAvailable] = useState(false);
  const [loading, setLoading] = useState(true);
  const previousValueRef = useRef(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    (async () => {
      try {
        const { data } = await supabase.auth.getUser();
        const metadataResult = AvailabilityMetadataSchema.safeParse(data.user?.user_metadata ?? {});
        const availabilityFlag = metadataResult.success ? metadataResult.data.availability : undefined;
        if (typeof availabilityFlag === 'boolean' && isMountedRef.current) {
          setAvailable(availabilityFlag);
          previousValueRef.current = availabilityFlag;
        }
      } catch (error) {
        logger.error?.('Failed to load availability flag', error);
      } finally {
        if (isMountedRef.current) {
          setLoading(false);
        }
      }
    })();

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const updateAvailability = useCallback(async (value: boolean): Promise<void> => {
    previousValueRef.current = available;
    setAvailable(value);
    try {
      await supabase.auth.updateUser({ data: { availability: value } });
    } catch (error) {
      logger.error?.('Failed to update availability status', error);
      if (isMountedRef.current) {
        setAvailable(previousValueRef.current);
      }
      throw error;
    }
  }, [available]);

  return {
    available,
    loading,
    updateAvailability,
  };
}
