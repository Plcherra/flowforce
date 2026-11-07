import { APP_LANGUAGES, isAppLanguage, type AppLanguage } from "./resolveLanguage";

export const LANGUAGE_COOKIE = "i18nextLng";
export const LANGUAGE_SOURCE_COOKIE = "flowforce.lang.source";
export const LANGUAGE_STORAGE_KEY = "i18nextLng";
export const LANGUAGE_SOURCE_STORAGE_KEY = "flowforce.lang.source";

export type LanguageSource = "user" | "resolved";

const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export function readCookie(
  cookieHeader: string | null | undefined,
  name: string,
): string | null {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(";")) {
    const trimmed = part.trim();
    const separator = trimmed.indexOf("=");
    if (separator <= 0) continue;
    const key = trimmed.slice(0, separator);
    if (key !== name) continue;
    const raw = trimmed.slice(separator + 1);
    try {
      return decodeURIComponent(raw);
    } catch {
      return raw;
    }
  }
  return null;
}

export function languageFromAcceptLanguage(
  header: string | null | undefined,
): AppLanguage | null {
  if (!header) return null;
  const ranked = header
    .split(",")
    .map((part) => {
      const [tag, ...params] = part.trim().split(";");
      const qualityParam = params.find((param) => param.trim().startsWith("q="));
      const quality = qualityParam ? Number(qualityParam.trim().slice(2)) : 1;
      return { tag: tag.trim().toLowerCase(), quality: Number.isFinite(quality) ? quality : 0 };
    })
    .filter((entry) => entry.tag && entry.tag !== "*")
    .sort((a, b) => b.quality - a.quality);

  for (const entry of ranked) {
    const code = entry.tag.split("-")[0];
    if (isAppLanguage(code)) return code;
  }
  return null;
}

export function resolveRequestLanguage(input: {
  cookieLanguage: unknown;
  acceptLanguage?: unknown;
}): AppLanguage {
  if (isAppLanguage(input.cookieLanguage)) return input.cookieLanguage;
  if (typeof input.acceptLanguage === "string") {
    return languageFromAcceptLanguage(input.acceptLanguage) ?? "en";
  }
  return "en";
}

export function isLanguageSource(value: unknown): value is LanguageSource {
  return value === "user" || value === "resolved";
}

export function readClientLanguage(): {
  language: AppLanguage | null;
  source: LanguageSource | null;
} {
  if (typeof window === "undefined") {
    return { language: null, source: null };
  }
  const cookieLanguage = readCookie(document.cookie, LANGUAGE_COOKIE);
  const cookieSource = readCookie(document.cookie, LANGUAGE_SOURCE_COOKIE);
  const storedLanguage = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
  const storedSource = window.localStorage.getItem(LANGUAGE_SOURCE_STORAGE_KEY);
  const language = isAppLanguage(cookieLanguage)
    ? cookieLanguage
    : isAppLanguage(storedLanguage)
      ? storedLanguage
      : null;
  const source = isLanguageSource(cookieSource)
    ? cookieSource
    : isLanguageSource(storedSource)
      ? storedSource
      : null;
  return { language, source };
}

export function persistLanguage(language: AppLanguage, source: LanguageSource) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  window.localStorage.setItem(LANGUAGE_SOURCE_STORAGE_KEY, source);
  const base = "; Path=/; Max-Age=" + String(COOKIE_MAX_AGE) + "; SameSite=Lax";
  document.cookie = `${LANGUAGE_COOKIE}=${language}${base}`;
  document.cookie = `${LANGUAGE_SOURCE_COOKIE}=${source}${base}`;
}

export function languageBootScript(language: AppLanguage): string {
  return `(function(){var lang=${JSON.stringify(language)};document.documentElement.lang=lang;window.__FLOWFORCE_LANG__=lang;})();`;
}

export function bootLanguage(): AppLanguage | undefined {
  if (typeof window === "undefined") return undefined;
  const value = (window as Window & { __FLOWFORCE_LANG__?: unknown }).__FLOWFORCE_LANG__;
  return isAppLanguage(value) ? value : undefined;
}

export const SUPPORTED_LANGUAGE_CODES: readonly AppLanguage[] = APP_LANGUAGES;
