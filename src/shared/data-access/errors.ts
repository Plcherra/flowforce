import type { AppError } from "@/types/platform";

export type DataAccessSource = "supabase" | "api" | "service" | "unknown";

export interface DataAccessErrorContext {
  source?: DataAccessSource;
  module?: string;
  operation?: string;
  resource?: string;
  fallbackMessage?: string;
}

export type DataAccessError = AppError & {
  source: DataAccessSource;
  module?: string;
  operation?: string;
  resource?: string;
};

const readStringField = (error: unknown, field: string) => {
  if (!error || typeof error !== "object" || !(field in error)) {
    return undefined;
  }

  const value = (error as Record<string, unknown>)[field];
  return typeof value === "string" && value.length > 0 ? value : undefined;
};

const readNumberField = (error: unknown, field: string) => {
  if (!error || typeof error !== "object" || !(field in error)) {
    return undefined;
  }

  const value = (error as Record<string, unknown>)[field];
  return typeof value === "number" ? value : undefined;
};

export const normalizeDataAccessError = (
  error: unknown,
  context: DataAccessErrorContext = {},
): DataAccessError => {
  const message =
    readStringField(error, "message") ??
    (typeof error === "string" ? error : undefined) ??
    context.fallbackMessage ??
    "Data access operation failed";

  return {
    message,
    code: readStringField(error, "code"),
    status: readNumberField(error, "status"),
    details:
      readStringField(error, "details") ??
      readStringField(error, "hint") ??
      undefined,
    cause: error,
    source: context.source ?? "unknown",
    module: context.module,
    operation: context.operation,
    resource: context.resource,
  };
};

export const throwDataAccessError = (
  error: unknown,
  context: DataAccessErrorContext = {},
): never => {
  throw normalizeDataAccessError(error, context);
};

export const isDataAccessError = (
  error: unknown,
): error is DataAccessError => {
  return (
    !!error &&
    typeof error === "object" &&
    "message" in error &&
    "source" in error
  );
};

