import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import type {
  Json,
  Tables,
  TablesInsert,
  TablesUpdate,
} from "@/integrations/supabase/public-types";
import type { AppLanguage } from "@/i18n/resolveLanguage";
import { logger } from "@/utils/logger";
import {
  formContentTouches,
  saveFormWithoutModel,
  withFormSourceLocale,
} from "@/features/forms/formContentFields";
import { scheduleFormContentTranslation } from "@/features/forms/scheduleFormContent";
import { scheduleFormFieldTranslation } from "@/features/forms/scheduleFormField";
import { parseFormFieldRows } from "@/features/forms/utils/formFieldRows";

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
  title: z
    .string()
    .nullable()
    .transform((value) => value ?? "Untitled form"),
  description: z.string().nullable(),
  status: z
    .string()
    .nullable()
    .transform((value) => value ?? "draft"),
  created_at: z.string().nullable(),
  updated_at: z.string().nullable(),
  created_by: z.string().nullable(),
  department_id: z
    .string()
    .nullable()
    .optional()
    .transform((value) => value ?? null),
  is_anonymous: z.boolean().nullable(),
  max_submissions: z.number().nullable(),
  settings: jsonSchema.nullable(),
  start_date: z.string().nullable(),
  end_date: z.string().nullable(),
});

const formSubmissionRowObjectSchema = z.object({
  id: z.string(),
  company_id: z.string().nullable().optional(),
  form_id: z.string().nullable(),
  submission_data: jsonSchema.nullable().optional(),
  submitted_at: z.string().nullable(),
  submitted_by: z.string().nullable(),
  ip_address: z.string().nullable(),
  user_agent: z.string().nullable(),
});

const withSubmissionData = <T extends { submission_data?: Json | null }>(
  row: T,
) => ({
  ...row,
  submission_data: row.submission_data ?? null,
  submissiondata: row.submission_data ?? {},
});

const formSubmissionRowSchema = formSubmissionRowObjectSchema.transform(
  withSubmissionData,
);

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

const formSubmissionWithProfileSchema = formSubmissionRowObjectSchema
  .extend({
    submittedprofile: z
      .object({
        first_name: z.string().nullable().optional(),
        last_name: z.string().nullable().optional(),
      })
      .nullable()
      .optional(),
  })
  .transform(withSubmissionData);

export type FormSubmissionWithProfile = z.infer<
  typeof formSubmissionWithProfileSchema
>;

let missingCompanyGuardWarned = false;

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
    if (!missingCompanyGuardWarned) {
      missingCompanyGuardWarned = true;
      logger.warn(
        "[formsRepository] Skipping company guard RPC because function is unavailable.",
        { tags: ["warning"] },
      );
    }
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
  sourceLocale?: AppLanguage,
): Promise<FormRow> {
  await ensureCompanyScope(companyId);
  const row: TablesInsert<"forms"> = { ...payload, company_id: companyId };
  if (sourceLocale) {
    row.settings = withFormSourceLocale(payload.settings, sourceLocale) as Json;
  }
  let created: FormRow | null = null;
  await saveFormWithoutModel({
    save: async () => {
      const { data, error } = await supabase
        .from("forms")
        .insert(row)
        .select("*")
        .single();
      if (error) throw error;
      created = formRowSchema.parse(data);
    },
    translate: sourceLocale
      ? () => {
          if (!created) return;
          scheduleFormContentTranslation({
            companyId,
            sourceId: created.id,
            sourceLocale,
            title: typeof payload.title === "string" ? payload.title : null,
            description:
              typeof payload.description === "string" ? payload.description : null,
          });
        }
      : undefined,
  });
  if (!created) {
    throw new Error("Form was not created");
  }
  return created;
}

export async function updateFormRow(
  companyId: string,
  formId: string,
  updates: TablesUpdate<"forms">,
  sourceLocale?: AppLanguage,
): Promise<FormRow | null> {
  await ensureCompanyScope(companyId);
  const nextUpdates: TablesUpdate<"forms"> = { ...updates };
  const touchesContent = formContentTouches(updates);
  if (sourceLocale && touchesContent) {
    let settings = updates.settings;
    if (settings === undefined) {
      const { data, error: readError } = await supabase
        .from("forms")
        .select("settings")
        .eq("id", formId)
        .eq("company_id", companyId)
        .maybeSingle();
      if (readError) throw readError;
      settings = data?.settings ?? null;
    }
    nextUpdates.settings = withFormSourceLocale(settings, sourceLocale) as Json;
  }
  let updated: FormRow | null = null;
  await saveFormWithoutModel({
    save: async () => {
      const { data, error } = await supabase
        .from("forms")
        .update(nextUpdates)
        .eq("id", formId)
        .eq("company_id", companyId)
        .select("*")
        .maybeSingle();
      if (error) throw error;
      updated = data ? formRowSchema.parse(data) : null;
    },
    translate:
      sourceLocale && touchesContent
        ? () => {
            scheduleFormContentTranslation({
              companyId,
              sourceId: formId,
              sourceLocale,
              title: typeof nextUpdates.title === "string" ? nextUpdates.title : null,
              description:
                typeof nextUpdates.description === "string"
                  ? nextUpdates.description
                  : null,
            });
          }
        : undefined,
  });
  return updated;
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

  return parseFormFieldRows(data ?? []) as FormFieldRow[];
}

type SaveableFormField = Omit<
  FormFieldRow,
  "id" | "form_id" | "created_at" | "updated_at"
>;

export async function replaceFormFields(
  companyId: string,
  formId: string,
  fields: SaveableFormField[],
  sourceLocale?: AppLanguage,
): Promise<void> {
  await ensureCompanyScope(companyId);
  const { data: existing, error: existingError } = await supabase
    .from("form_fields")
    .select("id")
    .eq("form_id", formId)
    .eq("company_id", companyId);
  if (existingError) throw existingError;
  const previousIds = (existing ?? [])
    .map((row) => row.id)
    .filter((id): id is string => Boolean(id));

  const removePrevious = async () => {
    if (!previousIds.length) return;
    const { error: deleteError } = await supabase
      .from("form_fields")
      .delete()
      .in("id", previousIds)
      .eq("company_id", companyId);
    if (deleteError) throw deleteError;
  };

  if (!fields.length) {
    await removePrevious();
    return;
  }

  const fieldsToInsert = fields.map((field, index) => ({
    ...field,
    company_id: companyId,
    form_id: formId,
    field_order: index + 1,
  }));

  const { data, error } = await supabase
    .from("form_fields")
    .insert(fieldsToInsert)
    .select("id, label, description, placeholder, options");
  if (error) {
    throw error;
  }
  await removePrevious();
  if (!sourceLocale) return;
  for (const row of data ?? []) {
    if (!row.id) continue;
    scheduleFormFieldTranslation({
      companyId,
      sourceId: row.id,
      sourceLocale,
      label: row.label,
      description: row.description,
      placeholder: row.placeholder,
      options: row.options,
    });
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
