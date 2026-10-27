import { fieldsFromCsv } from "@/features/forms/utils/csvFormFields";

const MAX_LABELS = 40;
const TEXT_EXTENSIONS = new Set([".txt", ".text", ".md", ".markdown", ".log"]);

function fileExtension(fileName: string): string {
  const base = fileName.trim().toLowerCase().split(/[/\\]/).pop() ?? "";
  const dot = base.lastIndexOf(".");
  if (dot <= 0) return "";
  return base.slice(dot);
}

/** PDF bytes are not a question list, even when the file is mostly ASCII. */
export function isPdfImport(fileName: string, text: string): boolean {
  if (fileExtension(fileName) === ".pdf") return true;
  return /^\uFEFF?\s*%PDF-/.test(text.slice(0, 1024));
}

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
  if (isPdfImport("", text)) return [];
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
  const extension = fileExtension(fileName);
  if (extension === ".csv") return fieldsFromCsv(text);
  if (isPdfImport(fileName, text)) return [];
  if (extension && !TEXT_EXTENSIONS.has(extension)) return [];
  return fieldsFromPlainText(text);
}
