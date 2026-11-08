export const HIRING_MIME_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "text/csv",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
] as const;

export const HIRING_FILE_ACCEPT = [
  ".pdf",
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".gif",
  ".csv",
  ".xls",
  ".xlsx",
  ".ppt",
  ".pptx",
  ...HIRING_MIME_TYPES,
].join(",");

const MIME = new Set<string>(HIRING_MIME_TYPES);

export function acceptedHiringFile(file: { type: string; size: number; name?: string }) {
  const extension = file.name?.split(".").pop()?.toLowerCase() ?? "";
  const office = ["csv", "xls", "xlsx", "ppt", "pptx", "pdf", "png", "jpg", "jpeg", "webp", "gif"];
  const typed = MIME.has(file.type) || office.includes(extension);
  return typed && file.size > 0 && file.size <= 10 * 1024 * 1024;
}
