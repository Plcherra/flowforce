import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';

const profileSchema = z.object({
  id: z.string(),
  first_name: z.string().nullable(),
  last_name: z.string().nullable(),
  avatar_url: z.string().nullable(),
  company_id: z.string().nullable(),
});

export type ProfileRecord = z.infer<typeof profileSchema>;

export async function fetchProfilesByIds(
  companyId: string,
  profileIds: string[],
): Promise<ProfileRecord[]> {
  if (!profileIds.length) {
    return [];
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, avatar_url, company_id')
    .in('id', profileIds)
    .eq('company_id', companyId);

  if (error) {
    throw error;
  }

  return profileSchema.array().parse(data ?? []);
}
