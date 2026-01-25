import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import type { Json, Tables } from '@/integrations/supabase/public-types';
import { logger } from '@/utils/logger';

const jsonSchema: z.ZodType<Json> = z.lazy(() =>
  z.union([z.string(), z.number(), z.boolean(), z.null(), z.record(jsonSchema), z.array(jsonSchema)]),
);

type DepartmentRow = Tables<'departments'> & { color?: string | null };

const departmentRowSchema: z.ZodType<DepartmentRow> = z
  .object({
    company_id: z.string().nullable(),
    created_at: z.string(),
    description: z.string().nullable(),
    id: z.string(),
    manager_id: z.string().nullable(),
    name: z.string(),
    color: z.string().nullable().optional(),
    type: z.string(),
    updated_at: z.string(),
  })
  .passthrough();

const positionRowSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    role: z.string().nullable(),
  })
  .passthrough();

const employeeProfileRowSchema: z.ZodType<Tables<'profiles'>> = z
  .object({
    id: z.string(),
    first_name: z.string().nullable(),
    last_name: z.string().nullable(),
    email: z.string(),
    avatar_url: z.string().nullable(),
    role: z.string().nullable(),
    employment_status: z.string().nullable(),
    department_id: z.string().nullable(),
    hire_date: z.string().nullable(),
    employee_id: z.string().nullable(),
    company_id: z.string().nullable(),
    phone: z.string().nullable().optional(),
    birth_date: z.string().nullable().optional(),
    address: jsonSchema.nullable().optional(),
    emergency_contact: jsonSchema.nullable().optional(),
    created_at: z.string().nullable().optional(),
    updated_at: z.string().nullable().optional(),
  })
  .passthrough();

const employeeProfileWithRelationsSchema = employeeProfileRowSchema.extend({
  department: departmentRowSchema.nullable().optional(),
  position: positionRowSchema.nullable().optional(),
});

const rosterCacheRowSchema = z
  .object({
    company_id: z.string(),
    snapshot: jsonSchema.nullable(),
    synced_at: z.string().nullable(),
  })
  .partial({ snapshot: true, synced_at: true })
  .passthrough();

const profileCompanyContextSchema = z
  .object({
    company_id: z.string().nullable(),
  })
  .passthrough();

const skillMatrixRowSchema: z.ZodType<Tables<'skill_matrix'>> = z
  .object({
    created_at: z.string(),
    employee_id: z.string(),
    id: z.string(),
    last_review: z.string().nullable(),
    level: z.number(),
    role: z.string(),
    updated_at: z.string(),
    xp: z.number(),
  })
  .passthrough();

const employeeBadgeRowSchema: z.ZodType<Tables<'employee_badge'>> = z
  .object({
    awarded_at: z.string(),
    awarded_by: z.string().nullable(),
    badge_code: z.string(),
    created_at: z.string(),
    employee_id: z.string(),
    id: z.string(),
    reason: z.string().nullable(),
  })
  .passthrough();

const employeeReportRowSchema: z.ZodType<Tables<'employee_report'>> = z
  .object({
    category: z.string(),
    created_at: z.string(),
    created_by: z.string(),
    date: z.string(),
    employee_id: z.string(),
    id: z.string(),
    notes: z.string().nullable(),
    severity: z.number(),
    updated_at: z.string(),
  })
  .passthrough();

const staffPerformanceRowSchema: z.ZodType<Tables<'staff_performance'>> = z
  .object({
    attendance_status: z.string().nullable(),
    break_compliance: z.boolean().nullable(),
    created_at: z.string().nullable(),
    date: z.string(),
    hours_worked: z.number().nullable(),
    id: z.string(),
    notes: z.string().nullable(),
    overtime_hours: z.number().nullable(),
    performance_score: z.number().nullable(),
    role: z.string(),
    user_id: z.string().nullable(),
  })
  .passthrough();

export type EmployeeProfileRow = z.infer<typeof employeeProfileWithRelationsSchema>;

async function fetchProfileCompanyContext(userId: string): Promise<string | null> {
  const { data, error } = await supabase.from('profiles').select('company_id').eq('id', userId).single();
  if (error) {
    throw error;
  }

  const parsed = profileCompanyContextSchema.parse(data);
  return parsed.company_id ?? null;
}

async function fetchDepartmentsByCompany(companyId: string): Promise<DepartmentRow[]> {
  const { data, error } = await supabase
    .from('departments')
    .select('*')
    .eq('company_id', companyId)
    .order('name', { ascending: true });

  if (error) {
    throw error;
  }

  return z.array(departmentRowSchema).parse(data ?? []);
}

async function fetchRosterSnapshot(companyId: string): Promise<EmployeeProfileRow[] | null> {
  const { data, error } = await supabase
    .from('hr_roster_cache')
    .select('snapshot')
    .eq('company_id', companyId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data?.snapshot || !Array.isArray(data.snapshot)) {
    return null;
  }

  const snapshot = rosterCacheRowSchema.parse({ company_id: companyId, snapshot: data.snapshot });
  const parsed = z.array(employeeProfileWithRelationsSchema).safeParse(snapshot.snapshot);
  if (!parsed.success) {
    logger.warn('[employeesRepository] Invalid roster cache snapshot', { error: parsed.error, tags: ['warning'] });
    return null;
  }
  return parsed.data;
}

async function fetchCompanyEmployees(params: {
  companyId: string;
  includeInactive?: boolean;
}): Promise<EmployeeProfileRow[]> {
  const { companyId, includeInactive = false } = params;
  let query = supabase
    .from('profiles')
    .select(
      `
        *,
        department:departments(id, name, color, company_id, created_at, updated_at, description, manager_id, type),
        position:positions(id, name, role)
      `,
    )
    .eq('company_id', companyId)
    .order('first_name', { ascending: true });

  if (!includeInactive) {
    query = query.eq('employment_status', 'active');
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return z.array(employeeProfileWithRelationsSchema).parse(data ?? []);
}

async function fetchSkillMatrixForEmployees(employeeIds: string[]): Promise<Tables<'skill_matrix'>[]> {
  if (!employeeIds.length) return [];

  const { data, error } = await supabase
    .from('skill_matrix')
    .select('*')
    .in('employee_id', employeeIds);

  if (error) {
    throw error;
  }

  return z.array(skillMatrixRowSchema).parse(data ?? []);
}

async function fetchEmployeeBadges(employeeIds: string[]): Promise<Tables<'employee_badge'>[]> {
  if (!employeeIds.length) return [];

  const { data, error } = await supabase
    .from('employee_badge')
    .select('*')
    .in('employee_id', employeeIds);

  if (error) {
    throw error;
  }

  return z.array(employeeBadgeRowSchema).parse(data ?? []);
}

async function fetchEmployeeReports(params: { employeeIds: string[]; since: string }): Promise<
  Tables<'employee_report'>[]
> {
  const { employeeIds, since } = params;
  if (!employeeIds.length) return [];

  const { data, error } = await supabase
    .from('employee_report')
    .select('*')
    .in('employee_id', employeeIds)
    .gte('date', since);

  if (error) {
    throw error;
  }

  return z.array(employeeReportRowSchema).parse(data ?? []);
}

async function fetchStaffPerformance(params: { employeeIds: string[]; since: string }): Promise<
  Tables<'staff_performance'>[]
> {
  const { employeeIds, since } = params;
  if (!employeeIds.length) return [];

  const { data, error } = await supabase
    .from('staff_performance')
    .select('*')
    .in('user_id', employeeIds)
    .gte('date', since);

  if (error) {
    throw error;
  }

  return z.array(staffPerformanceRowSchema).parse(data ?? []);
}

export const employeesRepository = {
  fetchProfileCompanyContext,
  fetchDepartmentsByCompany,
  fetchRosterSnapshot,
  fetchCompanyEmployees,
  fetchSkillMatrixForEmployees,
  fetchEmployeeBadges,
  fetchEmployeeReports,
  fetchStaffPerformance,
};
