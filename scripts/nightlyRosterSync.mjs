#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const timestamp = new Date().toISOString();

try {
  const { data: companies, error: companiesError } = await supabase
    .from('companies')
    .select('id, name');

  if (companiesError) {
    throw companiesError;
  }

  if (!companies || companies.length === 0) {
    console.log(`[${timestamp}] No companies found for roster sync.`);
    process.exit(0);
  }

  let processed = 0;

  for (const company of companies) {
    if (!company?.id) continue;

    const { data: roster, error: rosterError } = await supabase
      .from('profiles')
      .select(`
        id,
        first_name,
        last_name,
        email,
        avatar_url,
        role,
        employment_status,
        department_id,
        department:departments(id, name, color),
        position:positions(id, name, role)
      `)
      .eq('company_id', company.id)
      .eq('employment_status', 'active');

    if (rosterError) {
      console.error(`[${timestamp}] Failed to fetch roster for company ${company.id}:`, rosterError.message);
      continue;
    }

    const snapshot = (roster || []).map((employee) => ({
      id: employee.id,
      first_name: employee.first_name ?? '',
      last_name: employee.last_name ?? '',
      email: employee.email ?? '',
      avatar_url: employee.avatar_url ?? null,
      role: employee.role ?? 'employee',
      employment_status: employee.employment_status ?? 'active',
      department_id: employee.department_id ?? null,
      department: employee.department ?? null,
      position: employee.position ?? null,
    }));

    const { error: upsertError } = await supabase
      .from('hr_roster_cache')
      .upsert({
        company_id: company.id,
        snapshot,
        synced_at: timestamp,
      });

    if (upsertError) {
      console.error(`[${timestamp}] Failed to update roster cache for company ${company.id}:`, upsertError.message);
      continue;
    }

    processed += 1;
  }

  console.log(`[${timestamp}] Roster sync completed for ${processed} companies.`);
  process.exit(0);
} catch (error) {
  console.error(`[${timestamp}] Roster sync failed:`, error.message ?? error);
  process.exit(1);
}
