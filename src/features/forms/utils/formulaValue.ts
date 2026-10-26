/** Arithmetic only. Field references use {Label} or {field id}. */
export function evaluateArithmeticFormula(
  expression: string,
  data: Record<string, unknown>,
): number | null {
  const trimmed = expression.trim();
  if (!trimmed) return null;
  let processed = trimmed;
  const keys = Object.keys(data).sort((left, right) => right.length - left.length);
  for (const key of keys) {
    const value = data[key];
    const numeric =
      typeof value === "number"
        ? value
        : typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value))
          ? Number(value)
          : null;
    if (numeric == null || !key) continue;
    processed = processed.split(`{${key}}`).join(String(numeric));
  }
  if (!/^[0-9+\-*/().\s]+$/.test(processed)) return null;
  try {
    const result = Function(`"use strict"; return (${processed})`)();
    if (typeof result !== "number" || !Number.isFinite(result)) return null;
    return Math.round(result * 100) / 100;
  } catch {
    return null;
  }
}

export function formulaAnswerMap(
  fields: Array<{ id: string; label?: string | null }>,
  values: Record<string, unknown>,
): Record<string, unknown> {
  const data: Record<string, unknown> = { ...values };
  for (const field of fields) {
    const value = values[field.id];
    if (field.label) data[field.label] = value;
  }
  return data;
}
