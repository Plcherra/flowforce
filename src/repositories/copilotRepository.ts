import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';

const jsonSchema: z.ZodType<unknown> = z.lazy(() =>
  z.union([z.string(), z.number(), z.boolean(), z.null(), z.record(jsonSchema), z.array(jsonSchema)]),
);

const coverageTemplateSchema = z
  .object({
    id: z.string(),
    company_id: z.string(),
    name: z.string(),
    role: z.string(),
    location: z.string(),
    day_of_week: z.number(),
    start_time: z.string(),
    end_time: z.string(),
    required_count: z.number(),
    metadata: jsonSchema.nullable(),
  })
  .passthrough();

const employeeSchema = z
  .object({
    id: z.string(),
    company_id: z.string(),
    profile_id: z.string(),
    display_name: z.string().nullable(),
    role: z.string(),
    secondary_roles: z.array(z.string()).nullable(),
    home_store: z.string().nullable(),
    weekly_max_hours: z.number().nullable(),
    availability: jsonSchema.nullable(),
    metadata: jsonSchema.nullable(),
  })
  .passthrough();

export type CoverageTemplateRecord = z.infer<typeof coverageTemplateSchema>;
export type EmployeeRecord = z.infer<typeof employeeSchema>;

export async function listCoverageTemplates(companyId: string, locationId?: string): Promise<CoverageTemplateRecord[]> {
  let query = supabase.from('coverage_templates').select('*').eq('company_id', companyId);
  if (locationId) {
    query = query.eq('location', locationId);
  }
  const { data, error } = await query;
  if (error) throw error;
  return z.array(coverageTemplateSchema).parse(data ?? []);
}

export async function listCompanyEmployees(companyId: string): Promise<EmployeeRecord[]> {
  const { data, error } = await supabase.from('employees').select('*').eq('company_id', companyId);
  if (error) throw error;
  return z.array(employeeSchema).parse(data ?? []);
}

export async function listCoverageLocations(companyId: string): Promise<
  Array<{
    id: string;
    timezone?: string;
    templateCount: number;
  }>
> {
  const templates = await listCoverageTemplates(companyId);
  const locationMap = new Map<string, { count: number; timezone?: string }>();
  templates.forEach((template) => {
    const metadata = (template.metadata as { timezone?: string } | null) ?? null;
    const timezone =
      typeof metadata?.timezone === 'string' && metadata.timezone.trim().length > 0 ? metadata.timezone : undefined;
    const current = locationMap.get(template.location) ?? { count: 0, timezone };
    locationMap.set(template.location, {
      count: current.count + 1,
      timezone: current.timezone ?? timezone,
    });
  });

  return Array.from(locationMap.entries()).map(([id, info]) => ({
    id,
    timezone: info.timezone,
    templateCount: info.count,
  }));
}
