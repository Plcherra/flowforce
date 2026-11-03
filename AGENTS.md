# Agent notes

FlowForce is a Next.js app with Supabase and a Capacitor shell. Supported UI languages are English, Spanish, Portuguese, French, Italian, and German.

Every user-facing string must go through `t()` (`useTranslation`) or `i18n.t()` (`@/i18n/config`). That includes buttons, dialogs, toasts, placeholders, and aria labels. Add the key to all six locales in the same commit (`src/locales/{en,es,pt,fr,it,de}.json`, or `src/locales/literals/` for the shared literal catalog). Do not leave hard-coded English in the interface.

`npm run check:i18n` checks that the locale catalogs match and that no new hard-coded user-facing string was added. Release Gates run that check. The ESLint rule `i18next/no-literal-string` covers JSX text.
