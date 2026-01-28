import { useMemo } from "react";
import { useProfile } from "./useProfile";

type PermissionList = string[] | null | undefined;

export function usePermission(required: string) {
  const { profile } = useProfile();

  const permissions = useMemo(() => {
    const candidate = (profile as Record<string, unknown> | null)
      ?.permissions as PermissionList;
    if (Array.isArray(candidate)) {
      return candidate.filter(
        (value): value is string => typeof value === "string",
      );
    }
    return [];
  }, [profile]);

  if (!required) {
    return false;
  }

  return permissions.includes(required);
}
