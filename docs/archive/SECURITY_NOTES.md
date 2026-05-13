# Security Notes

**Last Updated:** January 25, 2026

## Resolved Vulnerabilities

✅ **Fixed:** 10 of 12 vulnerabilities resolved via `npm audit fix` and package updates

## Remaining Vulnerabilities

None recorded at the time of the Next.js-only dependency cleanup.

## Rich Text Editor Cleanup

- ✅ Replaced the retired rich text editor dependency with the existing TipTap stack.
- ✅ Removed the vulnerable transitive rich text package from `package.json` and `package-lock.json`.
- ✅ Kept DOMPurify sanitization for rendered rich text content.
- ✅ Files updated:
  - `src/features/forms/components/fields/DescriptionField.tsx`
  - `src/features/forms/components/builder/DescriptionEditorDialog.tsx`
  - `src/features/forms/components/builder/RichTextContentEditor.tsx`

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
