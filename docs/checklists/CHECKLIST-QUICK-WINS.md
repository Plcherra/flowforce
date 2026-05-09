# Quick Wins Checklist

These are the highest-impact cleanup tasks that can make the project look more professional quickly. Prioritize this file before deeper technical recovery work.

## 1. Branding Consistency

- [x] Pick one product name and use it everywhere: `FlowForce`.
- [x] Update the browser title/metadata in `app/layout.tsx` to match the chosen brand.
- [x] Search the repo for mismatched brand references such as `ConnectFlow` and `Operations Suite`.
- [x] Update public page copy so homepage, auth, pricing, and registration pages use the same product name.
- [ ] Confirm the logo/icon treatment is consistent across homepage, auth, register, and app shell pages.

## 2. README Cleanup

- [x] Rewrite the top of `README.md` with a short, honest project description.
- [x] Add a "Current Status" section that clearly says the project is in stabilization, not production-ready.
- [x] Add exact setup commands: `npm install`, `npm run dev`, `npm run build`, `npm run typecheck`.
- [x] Add a "Known Issues" section for the current build/typecheck/auth limitations.
- [x] Add a "Demo Path" section listing the safest pages to show first.
- [x] Remove or move outdated claims that say the MVP is fully production-ready unless verified.

## 3. Root Folder Cleanup

- [x] Create `docs/archive/` for old status, refactor, and error-report markdown files.
- [x] Move old root-level reports into `docs/archive/`, including MVP/refactor/build/error summary files.
- [x] Keep only essential root files visible: `README.md`, package/config files, checklist files, and active docs.
- [x] Move manual testing docs into `docs/testing/`.
- [x] Move refactor task docs into `docs/refactor_tasks/`.
- [x] Delete or archive odd placeholder files such as `NEW MAIN PROOF` if no longer needed.

## 4. Public Navigation Polish

- [ ] Fix the public `Resources` nav item so it does not send users into a protected `/app/resources` route.
- [ ] Decide whether resources are public marketing content or authenticated app content.
- [ ] If resources are public, create or restore a real public `/resources` page.
- [ ] If resources are protected, remove `Resources` from the public navbar.
- [ ] Check homepage buttons for correct destinations: `Register Your Company`, `Watch Demo`, `Sign In`, `Start Free Trial`.

## 5. Visual Polish

- [ ] Review homepage first viewport and make sure it clearly communicates the product in 5 seconds.
- [ ] Tighten homepage copy to sound like a real SaaS product, not placeholder marketing text.
- [ ] Reduce repetitive mint/blue color usage where pages feel too one-note.
- [ ] Make auth, register, and company-registration pages visually consistent with each other.
- [ ] Check mobile layout for homepage, auth, register, and pricing.
- [ ] Remove visible placeholder/demo copy where it makes the app look unfinished.

## 6. Screenshots And Demo Assets

- [ ] Capture clean screenshots for homepage, auth, register, and one authenticated dashboard if available.
- [x] Create `docs/screenshots/` for client-facing product screenshots.
- [ ] Add screenshots to `docs/screenshots/`.
- [ ] Add screenshot links to `README.md`.
- [ ] Prepare a short demo script showing only stable pages.
- [ ] Add a `DEMO_NOTES.md` file if client demos are planned.

## 7. Test And Audit Output Cleanup

- [x] Move generated test output under `docs/test-results/` out of the main review path.
- [ ] Add `test-results/*.json` to `.gitignore` if these files should not be committed.
- [ ] Remove stale reports that contradict current audit results.
- [ ] Keep one current audit file or checklist instead of many overlapping status files.

## 8. Small Developer Experience Fixes

- [ ] Fix the Next.js workspace-root warning by setting `turbopack.root` or removing the parent lockfile issue.
- [ ] Update Browserslist data with `npx update-browserslist-db@latest`.
- [ ] Add a short `npm run audit:local` script if repeated checks are needed.
- [ ] Document which Node version should be used.
- [ ] Make sure `.env.example` includes all required public and server variables without secrets.
