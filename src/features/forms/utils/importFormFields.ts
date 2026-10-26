import { fieldsFromCsv } from "@/features/forms/utils/csvFormFields";

const MAX_LABELS = 40;

/** Binary uploads and empty files are not field lists. */
export function looksLikeReadableText(text: string): boolean {
  const sample = text.slice(0, 4000);
  if (!sample.trim()) return false;
  if (sample.startsWith("PK") || sample.includes("\u0000")) return false;
  const letters = sample.match(/[A-Za-z]/g)?.length ?? 0;
  return letters >= 8 && letters / sample.length >= 0.3;
}

/** One short line becomes one field label. */
export function fieldsFromPlainText(text: string): string[] {
  if (!looksLikeReadableText(text)) return [];
  const labels: string[] = [];
  for (const line of text.split(/\r?\n/)) {
    const label = line.replace(/^[\s\-*•\d.)]+/, "").trim();
    if (label.length < 2 || label.length > 80) continue;
    if (!/[A-Za-z]/.test(label)) continue;
    labels.push(label);
    if (labels.length >= MAX_LABELS) break;
  }
  return labels;
}

/** CSV headers become fields. Readable text lines become fields. Other files do not invent fields. */
export function fieldLabelsFromImport(fileName: string, text: string): string[] {
  if (fileName.toLowerCase().endsWith(".csv")) return fieldsFromCsv(text);
  return fieldsFromPlainText(text);
}
