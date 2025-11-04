import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from '@/hooks/useProfile';
import type { Tables, TablesInsert } from '@/integrations/supabase/public-types';

type EventShiftLinkRow = Tables<'event_shift_links'>;
type EventShiftLinkWithShift = EventShiftLinkRow & {
  shift?: Tables<'schedules'> | null;
};

export interface LinkShiftInput {
  shiftId: string;
  storeId?: string | null;
  metadata?: TablesInsert<'event_shift_links'>['metadata'];
}

export interface UseEventLinksResult {
  links: EventShiftLinkWithShift[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  linkShifts: (entries: LinkShiftInput[]) => Promise<void>;
  unlinkShift: (shiftId: string) => Promise<void>;
}

const normaliseEntries = (entries: LinkShiftInput[]) =>
  entries.filter((entry) => typeof entry.shiftId === 'string' && entry.shiftId.length > 0);

export function useEventLinks(eventId?: string | null): UseEventLinksResult {
  const { profile } = useProfile();
  const companyId = profile?.companyId ?? profile?.company_id ?? null;

  const [links, setLinks] = useState<EventShiftLinkWithShift[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!eventId || !companyId) {
      setLinks([]);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await supabase
        .from('event_shift_links')
        .select('*, shift:schedules(*)')
        .eq('event_id', eventId)
        .eq('company_id', companyId);

      if (response.error) {
        throw response.error;
      }

      setLinks((response.data as EventShiftLinkWithShift[]) ?? []);
    } catch (err) {
      console.error('Failed to load event shift links', err);
      setLinks([]);
      setError(err instanceof Error ? err.message : 'Unable to load linked shifts');
    } finally {
      setLoading(false);
    }
  }, [companyId, eventId]);

  const linkShifts = useCallback(
    async (entries: LinkShiftInput[]) => {
      if (!eventId || !companyId) return;
      const serialised = normaliseEntries(entries);
      if (serialised.length === 0) return;

      const existingIds = new Set(links.map((link) => link.shift_id));
      const payload: TablesInsert<'event_shift_links'>[] = serialised
        .filter((entry) => !existingIds.has(entry.shiftId))
        .map((entry) => ({
          event_id: eventId,
          shift_id: entry.shiftId,
          company_id: companyId,
          store_id: entry.storeId ?? null,
          metadata: entry.metadata ?? {},
        }));

      if (payload.length === 0) return;

      setLoading(true);
      setError(null);

      try {
        const response = await supabase.from('event_shift_links').insert(payload).select('*, shift:schedules(*)');
        if (response.error) throw response.error;

        setLinks((prev) => [...prev, ...((response.data ?? []) as EventShiftLinkWithShift[])]);
      } catch (err) {
        console.error('Failed to link shifts to event', err);
        setError(err instanceof Error ? err.message : 'Unable to link shifts');
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [companyId, eventId, links],
  );

  const unlinkShift = useCallback(
    async (shiftId: string) => {
      if (!eventId || !companyId || !shiftId) return;

      setLoading(true);
      setError(null);

      try {
        const response = await supabase
          .from('event_shift_links')
          .delete()
          .eq('event_id', eventId)
          .eq('company_id', companyId)
          .eq('shift_id', shiftId);

        if (response.error) {
          throw response.error;
        }

        setLinks((prev) => prev.filter((link) => link.shift_id !== shiftId));
      } catch (err) {
        console.error('Failed to unlink shift from event', err);
        setError(err instanceof Error ? err.message : 'Unable to unlink shift');
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [companyId, eventId],
  );

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    links,
    loading,
    error,
    refresh,
    linkShifts,
    unlinkShift,
  };
}
