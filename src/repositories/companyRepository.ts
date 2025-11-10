import { z } from 'zod';

import { supabase } from '@/integrations/supabase/client';

const companyLookupSchema = z.object({
  company_id: z.string().nullable(),
});

export async function fetchCompanyIdForUser(userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('id', userId)
    .single();

  if (error) {
    throw error;
  }

  const parsed = companyLookupSchema.parse(data);
  return parsed.company_id;
}
