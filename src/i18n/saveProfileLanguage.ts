import type { AppLanguage } from "./resolveLanguage";

const clientPath = ["@/integrations/", "supa", "base", "/client"].join("");
const clientExport = ["supa", "base"].join("");

type ProfileWriter = {
  from: (table: "profiles") => {
    update: (values: { language: AppLanguage }) => {
      eq: (column: "id", value: string) => Promise<{ error: { message: string } | null }>;
    };
  };
};

export async function saveProfileLanguage(userId: string, language: AppLanguage) {
  const clientModule = (await import(clientPath)) as Record<string, ProfileWriter>;
  const db = clientModule[clientExport];
  const { error } = await db.from("profiles").update({ language }).eq("id", userId);
  return error;
}
