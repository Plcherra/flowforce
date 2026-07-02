import type { SupabaseClient } from '@supabase/supabase-js';

export const SCHEDULING_PW_TENANT = {
  companyId: 'c1000000-0000-4000-8000-000000000001',
  managerRoleId: 'c1000000-0000-4000-8000-000000000011',
  staffRoleId: 'c1000000-0000-4000-8000-000000000012',
  managerId: 'c1000000-0000-4000-8000-000000000101',
  staffId: 'c1000000-0000-4000-8000-000000000102',
  managerEmail:
    process.env.PLAYWRIGHT_MANAGER_EMAIL ?? 'scheduling-pw-manager@example.test',
  staffEmail: process.env.PLAYWRIGHT_STAFF_EMAIL ?? 'scheduling-pw-staff@example.test',
  password:
    process.env.PLAYWRIGHT_MANAGER_PASSWORD ??
    process.env.PLAYWRIGHT_STAFF_PASSWORD ??
    process.env.E2E_PASSWORD ??
    'Password123!',
};

async function upsertAuthUser(
  admin: SupabaseClient,
  params: {
    id: string;
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    companyId: string;
    role: string;
  },
) {
  const metadata = {
    first_name: params.firstName,
    last_name: params.lastName,
    company_id: params.companyId,
    active_company_id: params.companyId,
    role: params.role,
  };

  const { error: createError } = await admin.auth.admin.createUser({
    id: params.id,
    email: params.email,
    password: params.password,
    email_confirm: true,
    user_metadata: metadata,
    app_metadata: {
      company_id: params.companyId,
      active_company_id: params.companyId,
    },
  });

  if (createError) {
    const alreadyExists =
      createError.message.toLowerCase().includes('already') ||
      createError.message.toLowerCase().includes('registered');
    if (!alreadyExists) throw createError;

    const { error: updateError } = await admin.auth.admin.updateUserById(
      params.id,
      {
        email: params.email,
        password: params.password,
        email_confirm: true,
        user_metadata: metadata,
      },
    );
    if (updateError) throw updateError;
  }
}

export async function ensureSchedulingPlaywrightTenant(admin: SupabaseClient) {
  const now = new Date().toISOString();
  const tenant = SCHEDULING_PW_TENANT;

  await upsertAuthUser(admin, {
    id: tenant.managerId,
    email: tenant.managerEmail,
    password: tenant.password,
    firstName: 'Scheduling',
    lastName: 'Manager',
    companyId: tenant.companyId,
    role: 'manager',
  });

  await upsertAuthUser(admin, {
    id: tenant.staffId,
    email: tenant.staffEmail,
    password: tenant.password,
    firstName: 'Scheduling',
    lastName: 'Staff',
    companyId: tenant.companyId,
    role: 'staff',
  });

  const { error: companyError } = await admin.from('companies').upsert({
    id: tenant.companyId,
    name: 'Playwright Scheduling Tenant',
    slug: 'playwright-scheduling-tenant',
    created_by: tenant.managerId,
    owner_id: tenant.managerId,
    registration_complete: true,
    enabled_sections: ['dashboard', 'scheduling', 'employees', 'settings'],
    timezone: 'America/New_York',
    updated_at: now,
  });
  if (companyError) throw companyError;

  const { error: rolesError } = await admin.from('company_roles').upsert([
    {
      id: tenant.managerRoleId,
      company_id: tenant.companyId,
      name: 'Manager',
      description: 'Playwright scheduling manager',
      hierarchy_level: 2,
      permissions: { editSchedules: true, approveTimeOff: true },
      is_system_role: true,
      is_active: true,
      created_by: tenant.managerId,
    },
    {
      id: tenant.staffRoleId,
      company_id: tenant.companyId,
      name: 'Staff',
      description: 'Playwright scheduling staff',
      hierarchy_level: 5,
      permissions: {},
      is_system_role: true,
      is_active: true,
      created_by: tenant.managerId,
    },
  ]);
  if (rolesError) throw rolesError;

  const { error: profilesError } = await admin.from('profiles').upsert([
    {
      id: tenant.managerId,
      company_id: tenant.companyId,
      first_name: 'Scheduling',
      last_name: 'Manager',
      email: tenant.managerEmail,
      role: 'manager',
      role_id: tenant.managerRoleId,
      is_company_admin: true,
      employment_status: 'active',
      updated_at: now,
    },
    {
      id: tenant.staffId,
      company_id: tenant.companyId,
      first_name: 'Scheduling',
      last_name: 'Staff',
      email: tenant.staffEmail,
      role: 'staff',
      role_id: tenant.staffRoleId,
      is_company_admin: false,
      employment_status: 'active',
      updated_at: now,
    },
  ]);
  if (profilesError) throw profilesError;

  const { error: membersError } = await admin.from('company_members').upsert([
    {
      company_id: tenant.companyId,
      user_id: tenant.managerId,
      role: 'manager',
      added_at: now,
    },
    {
      company_id: tenant.companyId,
      user_id: tenant.staffId,
      role: 'staff',
      added_at: now,
    },
  ]);
  if (membersError) throw membersError;

  const { error: settingsError } = await admin.from('system_settings').upsert({
    company_id: tenant.companyId,
  });
  if (settingsError) throw settingsError;
}

export async function cleanupSchedulingPlaywrightTenant(admin: SupabaseClient) {
  const tenant = SCHEDULING_PW_TENANT;
  await admin.from('schedule_assignments').delete().eq('company_id', tenant.companyId);
  await admin.from('vendor_event').delete().eq('company_id', tenant.companyId);
  await admin.from('time_off_requests').delete().eq('company_id', tenant.companyId);
  await admin.from('schedules').delete().eq('company_id', tenant.companyId);
}
