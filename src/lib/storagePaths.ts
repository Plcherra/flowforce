const FALLBACK_FILE_NAME = "upload";

export function sanitizeStorageFileName(fileName: string): string {
  const sanitized = fileName
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();

  return sanitized || FALLBACK_FILE_NAME;
}

export function createStorageObjectId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function buildCompanyStoragePath(
  companyId: string,
  folder: string,
  fileName: string,
): string {
  return `${companyId}/${folder}/${createStorageObjectId()}-${sanitizeStorageFileName(fileName)}`;
}

export function resolveProfileCompanyId(
  profile: { companyId?: string | null; company_id?: string | null } | null,
): string | null {
  return profile?.companyId ?? profile?.company_id ?? null;
}
