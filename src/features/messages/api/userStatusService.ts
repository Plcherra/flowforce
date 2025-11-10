import { supabase } from '@/integrations/supabase/client';

export async function getAvailabilityMetadata() {
  const { data } = await supabase.auth.getUser();
  return (data.user?.user_metadata ?? {}) as Record<string, unknown>;
}

export async function updateAvailabilityFlag(value: boolean) {
  await supabase.auth.updateUser({ data: { availability: value } });
}
