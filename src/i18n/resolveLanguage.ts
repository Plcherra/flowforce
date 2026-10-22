export const APP_LANGUAGES = ["en", "es", "pt", "fr", "it", "de"] as const;

export type AppLanguage = (typeof APP_LANGUAGES)[number];

export function isAppLanguage(value: unknown): value is AppLanguage {
  return (
    typeof value === "string" &&
    (APP_LANGUAGES as readonly string[]).includes(value)
  );
}

export function resolveLanguage(
  profileLanguage: unknown,
  companyLanguage: unknown,
): AppLanguage {
  if (isAppLanguage(profileLanguage)) return profileLanguage;
  if (isAppLanguage(companyLanguage)) return companyLanguage;
  return "en";
}

export function appLanguageFromTag(tag: unknown): AppLanguage {
  if (typeof tag !== "string") return "en";
  const code = tag.toLowerCase().split("-")[0];
  return isAppLanguage(code) ? code : "en";
}
