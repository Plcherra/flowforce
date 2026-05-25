export interface StorageObjectReference {
  bucket: string;
  path: string;
  name?: string;
  filename?: string;
  type?: string;
  size?: number;
  url?: string;
}

export type StorageObjectValue = string | StorageObjectReference;

export function isStorageObjectReference(
  value: unknown,
): value is StorageObjectReference {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return typeof record.bucket === "string" && typeof record.path === "string";
}

export function getStorageObjectName(value: StorageObjectValue): string {
  if (typeof value === "string") {
    try {
      const url = new URL(value);
      return decodeURIComponent(url.pathname.split("/").pop() ?? value);
    } catch {
      return value.split("/").pop() ?? value;
    }
  }

  return value.name ?? value.filename ?? value.path.split("/").pop() ?? "File";
}

export function getStorageObjectUrl(value: StorageObjectValue): string | null {
  if (typeof value === "string") return value;
  return value.url ?? null;
}
