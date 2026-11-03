import { extractHardcodedLiterals as extractUserFacingLiterals } from "./userFacingLiterals";

const LOCALES = ["en", "es", "pt", "fr", "it", "de"] as const;

export { extractUserFacingLiterals as extractHardcodedLiterals };

export function compareLocaleKeySets(
  sets: Record<string, readonly string[]>,
): string[] {
  const problems: string[] = [];
  const byLocale = Object.fromEntries(
    LOCALES.map((locale) => [locale, new Set(sets[locale] ?? [])]),
  );
  const union = new Set(LOCALES.flatMap((locale) => [...byLocale[locale]]));

  for (const locale of LOCALES) {
    if (!(locale in sets)) {
      problems.push(`${locale} locale is missing`);
    }
    for (const key of union) {
      if (!byLocale[locale].has(key)) {
        problems.push(`${locale} is missing ${key}`);
      }
    }
  }

  return problems;
}

export function compareHardcodedLiterals(
  found: readonly string[],
  baseline: readonly string[],
): string[] {
  const foundSet = new Set(found);
  const baselineSet = new Set(baseline);
  const problems: string[] = [];

  for (const literal of foundSet) {
    if (!baselineSet.has(literal)) {
      problems.push(`new hard-coded string: ${literal}`);
    }
  }
  for (const literal of baselineSet) {
    if (!foundSet.has(literal)) {
      problems.push(`baseline string is gone: ${literal}`);
    }
  }

  return problems;
}
