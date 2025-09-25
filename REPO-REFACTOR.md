Refactor report — connectflow-operations-suite

Date: 2025-09-03

Purpose
- Surface the largest files and provide a concrete, prioritized plan for safe refactors.
- Provide low-risk quick wins and a path for larger decompositions.

Top large files (line counts from git-tracked files)
- src/integrations/supabase/types.ts — 3,480 lines
- src/components/scheduling/DragDropScheduleCalendar.tsx — 898 lines
- src/components/scheduling/AddShiftDialog.tsx — 786 lines
- src/components/ui/sidebar.tsx — 761 lines
- src/locales/en.json — 707 lines
- src/components/onboarding/BrandingCustomizer.tsx — 642 lines
- src/components/onboarding/OnboardingRoleManager.tsx — 516 lines
- src/sections/events/index.tsx — 459 lines
- src/components/sections/SectionConfigurationWizard.tsx — 458 lines
- src/components/messages/AnimatedChannelWizard.tsx — 448 lines
- (more files listed in terminal output)

Goals and constraints
- Keep changes low-risk: prefer extract-to-new-file refactors with behavior-preserving moves.
- Run TypeScript checks after edits; avoid sweeping logic changes in a single run.
- Produce small PR-sized commits for each refactor.

Recommended prioritized refactors (short term: safe / quick wins)
1) Split very large types file into logical modules
   - `src/integrations/supabase/types.ts` (3.5k lines) should be split into smaller files, e.g.:
     - `src/integrations/supabase/types/auth.ts`
     - `src/integrations/supabase/types/messages.ts`
     - `src/integrations/supabase/types/scheduling.ts`
   - Rationale: types are read-only and safe to move; update imports via automated find/replace.
   - Risk: low if done with careful automated import updates and `npx tsc --noEmit` passes.

2) Break very large components into focused components
   - Candidates: `DragDropScheduleCalendar.tsx`, `AddShiftDialog.tsx`, `AnimatedChannelWizard.tsx`, `SectionConfigurationWizard.tsx`, `events/index.tsx`.
   - Pattern: extract subcomponents (Header, Controls, Row, Cell, Forms) into `components/.../partials` and import them.
   - Risk: medium — watch for prop drilling; prefer to keep behavior identical and only move code.

3) Move locale files into `src/locales/{en,pt,...}/index.json` per-locale folder if you plan to add programmatic transforms.
   - Benefit: reduces merge conflicts and simplifies i18n tooling.

4) Add linting rules to prevent future large files
   - Add an ESLint rule (max-lines) for critical directories (e.g., `src/components/**`) with a generous limit (600) and an automated reporter.

5) Introduce a CI job / script to surface large files
   - The script `scripts/list-large-files.mjs` (included) can be used in pre-commit or CI to fail if files exceed thresholds.

Medium/long-term refactors (higher effort)
- Component decomposition with tests: add unit tests when extracting complex behavior, especially scheduling and drag-drop logic.
- Replace heavy components with smaller atomic components and well-typed hooks (e.g., extract scheduling logic to `useScheduleState` hook).
- Evaluate code-sharing between `pages` and `sections` directories and unify patterns.

Proposed first automated change (I can run now)
- Split `src/integrations/supabase/types.ts` into a shallow index + multiple smaller files using automated extraction and update imports.
  - I will do a dry-run: create `src/integrations/supabase/types/index.ts` that re-exports, and place `types/` folder with suggested split files containing the same content (no logic changes). Then run `npx tsc --noEmit` and adjust imports if necessary.
  - This is a low-risk approach because existing import paths can continue to point at `src/integrations/supabase/types.ts` while we introduce smaller modules. After verification, we can switch imports project-wide.

Quick wins you can ask me to execute now
- Split `types.ts` into smaller files (automated). Recommended.
- Extract 1 large UI component (e.g., `DragDropScheduleCalendar.tsx`) subcomponents into `components/scheduling/partials/` and validate types.
- Add `scripts/list-large-files.mjs` (done) and run it in CI.

How I validated
- Generated a line-count list using `wc -l` on git-tracked `src` files. Typecheck is green after the small logging refactors I applied earlier.

Next action
- Tell me which of the 'Proposed first automated change' or 'Quick wins' you'd like me to run now. If you want the full `types.ts` split, I'll run an automated extraction and type-check in this session.
