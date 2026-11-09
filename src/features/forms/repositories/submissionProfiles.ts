import { supabase as db } from "@/integrations/supabase/client"; // pragma: allowlist secret

export function submissionRowForParse(row: Record<string, unknown>) {
  return {
    id: String(row.id ?? ""),
    company_id: typeof row.company_id === "string" ? row.company_id : null,
    form_id: typeof row.form_id === "string" ? row.form_id : null,
    submission_data: row.submission_data ?? null,
    submitted_at: typeof row.submitted_at === "string" ? row.submitted_at : null,
    submitted_by: typeof row.submitted_by === "string" ? row.submitted_by : null,
    ip_address: row.ip_address == null ? null : String(row.ip_address),
    user_agent: typeof row.user_agent === "string" ? row.user_agent : null,
  };
}

type SubmitterName = {
  first_name?: string | null;
  last_name?: string | null;
};

export async function attachSubmissionProfiles<T extends { submitted_by?: string | null }>(
  rows: T[],
): Promise<Array<T & { submittedprofile: SubmitterName | null }>> {
  const ids = [
    ...new Set(rows.map((row) => row.submitted_by).filter((id): id is string => Boolean(id))),
  ];
  const blank = rows.map((row) => ({ ...row, submittedprofile: null }));
  if (ids.length === 0) return blank;

  const { data, error } = await db
    .from("profiles")
    .select("id, first_name, last_name")
    .in("id", ids);
  if (error || !data) return blank;

  const byId = new Map(data.map((person) => [person.id, person]));
  return rows.map((row) => ({
    ...row,
    submittedprofile: row.submitted_by ? (byId.get(row.submitted_by) ?? null) : null,
  }));
}
