# Production dependency audit

Checked with `npm audit --omit=dev` on main `e867c07` and again after this upgrade.

## Before

| Severity | Count |
| --- | --- |
| Critical | 4 |
| High | 7 |
| Moderate | 30 |

The critical packages were Next.js `16.2.9` (lockfile range through `16.4.0`), Capacitor Android and iOS `8.4.1`, and DOMPurify `3.3.x`. The high packages were Tiptap and ProseMirror, PostCSS, Sharp, Zod `3.23.8`, nanoid `3.3.17`, and source-map-js.

## After

`npm audit --omit=dev` reports zero critical, zero high, and zero moderate vulnerabilities.

Patched ranges now in use:

- `next` `^16.4.5`
- `@capacitor/android`, `@capacitor/core`, `@capacitor/ios`, and `@capacitor/cli` `^8.6.0`
- `dompurify` `^3.4.17`
- Tiptap packages `3.33.0` (pulls ProseMirror view `1.42.3` or newer)
- `zod` `^4.6.7`
- `postcss` `8.5.32`
- overrides for `nanoid@<=3.3.17`, `source-map-js@<=1.2.1`, `postcss-selector-parser@<6.1.5`, `prosemirror-view@<1.42.3`, and `sharp@<=0.35.5-rc.1`

No moderate advisories remain in the production tree, so none are accepted with an exception.
