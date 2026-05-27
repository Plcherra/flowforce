import type { SupabaseClient } from "@supabase/supabase-js";
import type { AppResult, CompanyId, UserId } from "@/types/platform";
import {
  normalizeDataAccessError,
  throwDataAccessError,
  type DataAccessError,
  type DataAccessErrorContext,
} from "./errors";

export interface RepositoryContext {
  companyId?: CompanyId | null;
  userId?: UserId | null;
  supabaseClient?: SupabaseClient;
}

export interface RepositoryOperationContext extends DataAccessErrorContext {
  module: string;
  operation: string;
}

export const repositoryResult = async <TData>(
  operation: () => Promise<TData>,
  context: RepositoryOperationContext,
): Promise<AppResult<TData, DataAccessError>> => {
  try {
    return { ok: true, data: await operation() };
  } catch (error) {
    return {
      ok: false,
      error: normalizeDataAccessError(error, {
        source: "supabase",
        ...context,
      }),
    };
  }
};

export const assertRepositoryData = <TData>(
  data: TData | null | undefined,
  error: unknown,
  context: RepositoryOperationContext,
): TData => {
  if (error) {
    throwDataAccessError(error, { source: "supabase", ...context });
  }

  if (data === null || data === undefined) {
    throwDataAccessError(new Error("Expected repository data was empty"), {
      source: "supabase",
      ...context,
    });
  }

  return data;
};

export const assertRepositorySuccess = (
  error: unknown,
  context: RepositoryOperationContext,
) => {
  if (error) {
    throwDataAccessError(error, { source: "supabase", ...context });
  }
};

