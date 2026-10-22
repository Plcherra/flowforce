import { supabase } from "@/integrations/supabase/client";
import type { AppLanguage } from "@/i18n/resolveLanguage";

export interface ContentTranslationRequest {
  companyId: string;
  sourceTable: string;
  sourceId: string;
  sourceLocale: AppLanguage;
  viewerLocale: AppLanguage;
  fields: Array<{ fieldPath: string; text: string }>;
}

export async function requestContentTranslation(
  input: ContentTranslationRequest,
): Promise<boolean> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return false;
  const response = await fetch("/api/i18n/content-translations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });
  return response.ok;
}
