import { supabase } from "@/integrations/supabase/client"; // pragma: allowlist secret
import type { AppLanguage } from "./resolveLanguage";

export async function saveProfileLanguage(userId: string, language: AppLanguage) {
  const { error } = await supabase // pragma: allowlist secret
    .from("profiles")
    .update({ language })
    .eq("id", userId);
  return error;
}
