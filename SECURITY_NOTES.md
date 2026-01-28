# Security Notes

**Last Updated:** January 25, 2026

## Resolved Vulnerabilities

✅ **Fixed:** 10 of 12 vulnerabilities resolved via `npm audit fix` and package updates

## Remaining Vulnerabilities

### Quill XSS Vulnerability (Moderate)

**Status:** Mitigated with DOMPurify sanitization  
**Severity:** Moderate  
**CVE:** GHSA-4943-9vgg-gr5r  
**Package:** `quill` (via `react-quill`)

**Details:**

- `react-quill@2.0.0` is the latest version available
- The underlying `quill@1.3.7` has a known XSS vulnerability
- No patch is available from the quill maintainers (vulnerability is disputed)
- The vulnerability affects the `onloadstart` attribute on IMG elements

**Mitigation Applied:**

- ✅ Added DOMPurify sanitization to all react-quill output rendering
- ✅ All `dangerouslySetInnerHTML` usage now sanitizes content with `DOMPurify.sanitize()`
- ✅ Files updated:
  - `src/components/forms/fields/DescriptionField.tsx`

**Recommendation:**

- Consider migrating from `react-quill` to `@tiptap/react` (already in dependencies) for future features
- Continue using DOMPurify for any rich text content rendering
- Monitor for quill updates or react-quill alternatives

## Package Updates

- ✅ Updated `baseline-browser-mapping` to latest version
- ✅ Updated `@capacitor/cli` and related packages to v8.0.1
- ✅ Added npm override for `tar` package to force version ^7.5.4 (fixes high severity vulnerability)

## Security Best Practices

1. **Input Sanitization:** All user-generated HTML content is sanitized with DOMPurify
2. **Dependency Updates:** Regularly run `npm audit` and `npm audit fix`
3. **Package Overrides:** Used npm overrides to force secure versions of transitive dependencies

## Monitoring

Run the following commands regularly:

```sh
# Check for vulnerabilities
npm audit

# Fix non-breaking vulnerabilities
npm audit fix

# Update packages
npm update

# Check for outdated packages
npm outdated
```
