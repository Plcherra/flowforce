const LOCALES = ["en", "es", "pt", "fr", "it", "de"] as const;

const ATTRIBUTE_PATTERN =
  /\b(?:placeholder|aria-label|title|alt|label)\s*=\s*(?:"([^"]*)"|'([^']*)'|\{\s*"([^"]*)"\s*\}|\{\s*'([^']*)'\s*\})/g;

const JSX_TEXT_PATTERN = />([^<>{}]+)</g;

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

function hasLetters(value: string): boolean {
  return /[A-Za-z]/.test(value);
}

function isIgnoredLiteral(value: string): boolean {
  const text = value.replace(/\s+/g, " ").trim();
  if (!hasLetters(text)) return true;
  if (/^[a-z]+:\/\//i.test(text)) return true;
  if (/^www\./i.test(text)) return true;
  if (text.includes("://")) return true;
  return false;
}

function looksLikeCode(value: string): boolean {
  if (
    /^(Promise|Record|Partial|Omit|ComponentType|Awaited|ReturnType|FieldPath|string|number|boolean|unknown|void|any)$/.test(
      value,
    )
  ) {
    return true;
  }
  return (
    /=>|[{};]|&&|\|\||\?\?|\?\.|===|!==|\(\s*$|=\s*\d/.test(value) ||
    /\)\s*:/.test(value) ||
    /^\s*[(),=]/.test(value) ||
    value.includes('? "') ||
    value.includes("? '")
  );
}

export function extractHardcodedLiterals(source: string, filePath: string): string[] {
  const withoutBlockComments = source.replace(/\/\*[\s\S]*?\*\//g, "");
  const literals = new Set<string>();
  const collect = (raw: string | undefined) => {
    if (!raw) return;
    const text = raw.replace(/\s+/g, " ").trim();
    if (isIgnoredLiteral(text) || looksLikeCode(text)) return;
    literals.add(`${filePath}: ${text}`);
  };

  for (const match of withoutBlockComments.matchAll(ATTRIBUTE_PATTERN)) {
    collect(match[1] ?? match[2] ?? match[3] ?? match[4]);
  }
  if (filePath.endsWith(".tsx") || filePath.endsWith(".jsx")) {
    for (const match of withoutBlockComments.matchAll(JSX_TEXT_PATTERN)) {
      collect(match[1]);
    }
  }

  return [...literals];
}
