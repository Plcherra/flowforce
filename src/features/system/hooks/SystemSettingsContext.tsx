import { createContext, useContext } from "react";
import type { SystemSettingsHook } from "./useSystemSettings";

export const SystemSettingsContext = createContext<SystemSettingsHook | null>(
  null,
);

export function useOptionalSystemSettingsContext() {
  return useContext(SystemSettingsContext);
}

export function useSystemSettingsContext() {
  const value = useOptionalSystemSettingsContext();
  if (!value) {
    throw new Error(
      "SystemSettingsContext value is missing. Wrap components in SystemSettingsProvider.",
    );
  }
  return value;
}
