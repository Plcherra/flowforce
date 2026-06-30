import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import type {
  Json,
  Tables,
  TablesInsert,
  TablesUpdate,
} from "@/integrations/supabase/public-types";
import { logger } from "@/utils/logger";

const jsonSchema: z.ZodType<Json> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.record(jsonSchema),
    z.array(jsonSchema),
  ]),
);

export type FormRow = Tables<"forms">;
export type FormFieldRow = Tables<"form_fields">;
export type FormSubmissionRow = Tables<"form_submissions">;

const formRowSchema = z.object({
  id: z.string(),
  company_id: z.string().nullable().optional(),
  title: z.string(),
  description: z.string().nullable(),
  status: z.string() as z.ZodType<FormRow["status"]>,
  created_at: z.string(),
  updated_at: z.string(),
  created_by: z.string(),
  departmentid: z.string().nullable(),
  is_anonymous: z.boolean().nullable(),
  max_submissions: z.number().nullable(),
  settings: jsonSchema.nullable(),
  start_date: z.string().nullable(),
  end_date: z.string().nullable(),
});

const formFieldRowSchema = z.object({
  id: z.string(),
  company_id: z.string().nullable().optional(),
  form_id: z.string(),
  field_order: z.number(),
  field_type: z.string() as z.ZodType<FormFieldRow["field_type"]>,
  label: z.string(),
  description: z.string().nullable(),
  placeholder: z.string().nullable(),
  is_required: z.boolean().nullable(),
  options: jsonSchema.nullable(),
  validation_rules: jsonSchema.nullable(),
  min_value: z.number().nullable(),
  max_value: z.number().nullable(),
  step_value: z.number().nullable(),
  formula_expression: z.string().nullable(),
  dependent_fields: jsonSchema.nullable(),
  rating_config: jsonSchema.nullable(),
  scan_config: jsonSchema.nullable(),
  media_config: jsonSchema.nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

const formSubmissionRowSchema = z.object({
  id: z.string(),
  company_id: z.string().nullable().optional(),
  form_id: z.string(),
  submissiondata: jsonSchema,
  submitted_at: z.string(),
  submitted_by: z.string().nullable(),
  ip_address: z.string().nullable(),
  user_agent: z.string().nullable(),
});

const profileSummarySchema = z
  .object({
    id: z.string(),
    first_name: z.string().nullable().optional(),
    last_name: z.string().nullable().optional(),
    company_id: z.string().nullable().optional(),
  })
  .optional()
  .nullable();

const departmentSummarySchema = z
  .object({
    name: z.string().nullable().optional(),
  })
  .optional()
  .nullable();

const submissionStatsSchema = z
  .array(
    z.object({
      count: z.number().nullable().optional(),
    }),
  )
  .optional()
  .nullable();

const latestSubmissionSchema = z
  .array(
    z.object({
      submitted_at: z.string().nullable().optional(),
    }),
  )
  .optional()
  .nullable();

const formQueryRowSchema = formRowSchema.extend({
  createdprofile: profileSummarySchema,
  department: departmentSummarySchema,
  submission_stats: submissionStatsSchema,
  latest_submission: latestSubmissionSchema,
});

export type FormQueryRow = z.infer<typeof formQueryRowSchema>;

const formSubmissionWithProfileSchema = formSubmissionRowSchema.extend({
  submittedprofile: z
    .object({
      first_name: z.string().nullable().optional(),
      last_name: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),
});

export type FormSubmissionWithProfile = z.infer<
  typeof formSubmissionWithProfileSchema
>;

async function ensureCompanyScope(companyId: string): Promise<void> {
  if (!companyId) {
    throw new Error("Company context is required for forms operations.");
  }
  const { error } = await supabase.rpc("assert_company_membership", {
    p_company_id: companyId,
  });
  if (error) {
    const lowerMessage = error.message?.toLowerCase() ?? "";
    const isMissingGuard =
      lowerMessage.includes("assert_company_membership") ||
      lowerMessage.includes("schema cache");
    if (!isMissingGuard) {
      throw error;
    }
    logger.warn(
      "[formsRepository] Skipping company guard RPC because function is unavailable.",
      { tags: ["warning"] },
    );
  }
}

export async function fetchFormsWithRelations(
  companyId: string,
): Promise<FormQueryRow[]> {
  await ensureCompanyScope(companyId);

  const { data, error } = await supabase
    .from("forms")
    .select(
      `
        *,
        createdprofile:profiles!inner(id, first_name, last_name, company_id),
        department:departments(name),
        submission_stats:form_submissions(count),
        latest_submission:form_submissions(submitted_at)
      `,
    )
    .eq("company_id", companyId)
    .eq("createdprofile.company_id", companyId)
    .order("created_at", { ascending: false })
    .order("submitted_at", {
      foreignTable: "latest_submission",
      ascending: false,
    })
    .limit(1, { foreignTable: "latest_submission" });

  if (error) {
    throw error;
  }

  return z.array(formQueryRowSchema).parse(data ?? []);
}

export async function fetchFormWithRelations(
  companyId: string,
  formId: string,
): Promise<FormQueryRow | null> {
  await ensureCompanyScope(companyId);
  const { data, error } = await supabase
    .from("forms")
    .select(
      `
        *,
        createdprofile:profiles!inner(id, first_name, last_name, company_id),
        department:departments(name),
        submission_stats:form_submissions(count),
        latest_submission:form_submissions(submitted_at)
      `,
    )
    .eq("id", formId)
    .eq("company_id", companyId)
    .eq("createdprofile.company_id", companyId)
    .order("submitted_at", {
      foreignTable: "latest_submission",
      ascending: false,
    })
    .limit(1, { foreignTable: "latest_submission" })
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? formQueryRowSchema.parse(data) : null;
}

export async function insertFormRow(
  companyId: string,
  payload: TablesInsert<"forms">,
): Promise<FormRow> {
  await ensureCompanyScope(companyId);
  const { data, error } = await supabase
    .from("forms")
    .insert({ ...payload, company_id: companyId })
    .select("*")
    .single();
  if (error) {
    throw error;
  }
  return formRowSchema.parse(data);
}

export async function updateFormRow(
  companyId: string,
  formId: string,
  updates: TablesUpdate<"forms">,
): Promise<FormRow | null> {
  await ensureCompanyScope(companyId);
  const { data, error } = await supabase
    .from("forms")
    .update(updates)
    .eq("id", formId)
    .eq("company_id", companyId)
    .select("*")
    .maybeSingle();
  if (error) {
    throw error;
  }
  return data ? formRowSchema.parse(data) : null;
}

export async function deleteFormRow(
  companyId: string,
  formId: string,
): Promise<void> {
  await ensureCompanyScope(companyId);
  const { error } = await supabase
    .from("forms")
    .delete()
    .eq("id", formId)
    .eq("company_id", companyId);
  if (error) {
    throw error;
  }
}

export async function fetchFormFields(
  companyId: string,
  formId: string,
): Promise<FormFieldRow[]> {
  await ensureCompanyScope(companyId);
  const { data, error } = await supabase
    .from("form_fields")
    .select("*")
    .eq("form_id", formId)
    .eq("company_id", companyId)
    .order("field_order", { ascending: true });

  if (error) {
    throw error;
  }

  return z.array(formFieldRowSchema).parse(data ?? []);
}

type SaveableFormField = Omit<
  FormFieldRow,
  "id" | "form_id" | "created_at" | "updated_at"
>;

export async function replaceFormFields(
  companyId: string,
  formId: string,
  fields: SaveableFormField[],
): Promise<void> {
  await ensureCompanyScope(companyId);
  const { error: deleteError } = await supabase
    .from("form_fields")
    .delete()
    .eq("form_id", formId)
    .eq("company_id", companyId);
  if (deleteError) {
    throw deleteError;
  }

  if (!fields.length) {
    return;
  }

  const fieldsToInsert = fields.map((field, index) => ({
    ...field,
    company_id: companyId,
    form_id: formId,
    field_order: index + 1,
  }));

  const { error } = await supabase.from("form_fields").insert(fieldsToInsert);
  if (error) {
    throw error;
  }
}

export async function fetchFormSubmissions(
  companyId: string,
  formId: string,
): Promise<FormSubmissionWithProfile[]> {
  await ensureCompanyScope(companyId);
  const { data, error } = await supabase
    .from("form_submissions")
    .select(
      `
        *,
        submittedprofile:profiles(first_name, last_name)
      `,
    )
    .eq("form_id", formId)
    .eq("company_id", companyId)
    .order("submitted_at", { ascending: false });

  if (error) {
    throw error;
  }

  return z.array(formSubmissionWithProfileSchema).parse(data ?? []);
}

export async function insertFormSubmission(
  companyId: string,
  payload: TablesInsert<"form_submissions">,
): Promise<FormSubmissionRow> {
  await ensureCompanyScope(companyId);
  const { data, error } = await supabase
    .from("form_submissions")
    .insert({ ...payload, company_id: companyId })
    .select("*")
    .single();
  if (error) {
    throw error;
  }
  return formSubmissionRowSchema.parse(data);
}
