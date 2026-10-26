/** Text a submission row can show for a stored answer. */
export function submissionDisplayText(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) {
    return value.map((item) => submissionDisplayText(item)).filter(Boolean).join(", ");
  }
  if (!value || typeof value !== "object") return "";
  const record = value as Record<string, unknown>;
  if (typeof record.scandata === "string") return record.scandata;
  if (typeof record.rating_value === "number") return String(record.rating_value);
  if (typeof record.address === "string") return record.address;
  if (typeof record.signer_name === "string" && record.signer_name) return record.signer_name;
  if (typeof record.signature_url === "string") return record.signature_url;
  if (typeof record.url === "string") return record.url;
  if (typeof record.name === "string") return record.name;
  if (record.flagged === true) return submissionDisplayText(record.value);
  return "";
}

const FILE_FIELD_TYPES = new Set([
  "file",
  "file_upload",
  "image_upload",
  "video_upload",
  "audio_recording",
  "signature",
]);

export function submissionIsFile(fieldType: string | null | undefined): boolean {
  return FILE_FIELD_TYPES.has(fieldType ?? "");
}
