import { z } from "zod";

const numericValue = z
  .union([z.number(), z.string(), z.null()])
  .optional()
  .transform((value) => {
    if (value == null || value === "") return null;
    const parsed = typeof value === "number" ? value : Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  });

const jsonValue = z.unknown().optional().nullable();

const formFieldRowSchema = z.object({
  id: z.string(),
  company_id: z.string().nullish(),
  form_id: z.string().nullish(),
  field_order: numericValue,
  field_type: z.string().nullish(),
  label: z.string().nullish(),
  description: z.string().nullish(),
  placeholder: z.string().nullish(),
  is_required: z.boolean().nullish(),
  options: jsonValue,
  validation_rules: jsonValue,
  min_value: numericValue,
  max_value: numericValue,
  step_value: numericValue,
  formula_expression: z.string().nullish(),
  dependent_fields: jsonValue,
  rating_config: jsonValue,
  scan_config: jsonValue,
  media_config: jsonValue,
  created_at: z.string().nullish(),
  updated_at: z.string().nullish(),
});

export type ParsedFormFieldRow = z.infer<typeof formFieldRowSchema>;

/** Postgres numeric columns arrive as strings. One bad row must not hide the rest. */
export function parseFormFieldRows(input: unknown): ParsedFormFieldRow[] {
  if (!Array.isArray(input)) return [];
  const rows: ParsedFormFieldRow[] = [];
  for (const row of input) {
    const parsed = formFieldRowSchema.safeParse(row);
    if (parsed.success) rows.push(parsed.data);
  }
  return rows;
}
