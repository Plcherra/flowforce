import i18n from "@/i18n/config";
const SCHEMA_CACHE_ERROR_CODES = new Set(["PGRST200", "PGRST202", "PGRST205"]);

export const getUnknownErrorMessage = (error: unknown) => {
  if (!error) return "";
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    return typeof message === "string" ? message : "";
  }
  return "";
};

export const getSupabaseErrorCode = (error: unknown) => {
  if (typeof error !== "object" || !error || !("code" in error)) {
    return null;
  }

  const code = (error as { code?: unknown }).code;
  return typeof code === "string" ? code : null;
};

export const isMissingTableError = (
  error: unknown,
  tableNames: string[] = [],
) => {
  const message = getUnknownErrorMessage(error).toLowerCase();
  const code = getSupabaseErrorCode(error);
  const mentionsRequestedTable =
    tableNames.length === 0 ||
    tableNames.some((tableName) => message.includes(tableName.toLowerCase()));

  return (
    mentionsRequestedTable &&
    (code === "PGRST205" ||
      message.includes("could not find the table") ||
      message.includes("schema cache"))
  );
};

export const isMissingRpcError = (
  error: unknown,
  functionNames: string[] = [],
) => {
  const message = getUnknownErrorMessage(error).toLowerCase();
  const code = getSupabaseErrorCode(error);
  const mentionsRequestedFunction =
    functionNames.length === 0 ||
    functionNames.some((functionName) =>
      message.includes(functionName.toLowerCase()),
    );

  return (
    mentionsRequestedFunction &&
    (code === "PGRST202" ||
      message.includes("could not find the function") ||
      message.includes("schema cache"))
  );
};

export const isMissingRelationshipError = (error: unknown) => {
  const message = getUnknownErrorMessage(error).toLowerCase();
  const code = getSupabaseErrorCode(error);

  return (
    code === "PGRST200" ||
    message.includes("could not find a relationship") ||
    message.includes("schema cache")
  );
};

export const isMissingBackendResourceError = (
  error: unknown,
  resourceNames: string[],
) => {
  const message = getUnknownErrorMessage(error).toLowerCase();
  const code = getSupabaseErrorCode(error);
  const hasSchemaCode = !!code && SCHEMA_CACHE_ERROR_CODES.has(code);

  return (
    (hasSchemaCode ||
      message.includes("schema cache") ||
      message.includes("could not find the table") ||
      message.includes("could not find the function") ||
      message.includes("could not find a relationship")) &&
    resourceNames.some((resource) => message.includes(resource.toLowerCase()))
  );
};

export const getSupabaseSetupMessage = (
  error: unknown,
  moduleName: string,
) => {
  const message = getUnknownErrorMessage(error);
  if (!message) {
    return i18n.t("literals.isNotFullySetUpInSupabaseYet", { moduleName: moduleName });
  }

  if (
    isMissingTableError(error) ||
    isMissingRpcError(error) ||
    isMissingRelationshipError(error)
  ) {
    return i18n.t("literals.isNotFullySetUpInSupabaseYet2", { moduleName: moduleName });
  }

  return message;
};
