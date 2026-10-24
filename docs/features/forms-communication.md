# Forms and Communication

Forms phases 1 and 2 are checked. The Operations row in `docs/roadmap.md` is done.

Pedro asked for the forms page phases below on 2026-10-23. Chats and company updates stay unphased. Do not invent more phases from this file.

The surfaces already in the product:

- Forms: `/app/forms`, `src/features/forms`. Readiness notes are in [docs/forms-sections-completion.md](../forms-sections-completion.md).
- Messages: `/app/messages`, `src/features/messages`.
- Company updates: `/app/company-updates`, `src/features/company-updates`.

Tasks phases that mention forms are in [docs/features/tasks.md](tasks.md). Phases 9–12 there stay skipped. Do not reopen them from this file. Linking a form to a role shift is phases 39 and 41 in that file.

## Phases

### Phase 1 — Forms page density and scroll

- [x] The forms list, builder, and submissions fit the screen and scroll in their own area.

Rules:

- Tighten the forms page. Keep the same sections. Cut the large title, the double padding, and the tall readiness cards.
- The form table scrolls sideways on its own. The page does not.
- The builder header stays short. On a phone the library, editor, and preview are one at a time. Each pane scrolls.
- Submissions open from the form row. The dialog scrolls inside itself. A failed load shows an error.
- Do not add a migration.

Done when:

- A width under 768 uses stacked builder panes. 768 and above keeps the columns.
- The table scroller and the pane scroller both include a vertical or horizontal overflow class and `min-h-0` or `min-w-0`.

Prove: `src/features/forms/utils/formsSurface.test.ts`, run with `node scripts/test-tasks-page.mjs`.

### Phase 2 — One create flow

- [x] New form opens one screen: create directly, pick a template on that screen, or import a file.

Rules:

- Remove the three cards Start from scratch, Use a template, and Create from file.
- Creating a form still opens the editor. Templates on the same screen load their fields.
- Import accepts CSV plus the formats already accepted: PDF, DOC, DOCX, and TXT. A CSV header row becomes the fields.
- Do not add a migration.

Done when:

- A CSV header row becomes one text field per column.
- A quoted comma stays inside one column.

Prove: `src/features/forms/utils/csvFormFields.test.ts`, run with `node scripts/test-tasks-page.mjs`.

## Open questions

None.

## Progress log

### 2026-10-23 — Phase 1 Forms page density and scroll

Shipped: The forms page uses a smaller title, tighter gaps, and shorter readiness cards. The form table scrolls sideways on its own. The builder header is capped and scrolls. Under 768px the library, editor, and preview are one pane at a time, and each pane scrolls. Submissions open from the form row. The submissions dialog scrolls inside itself, and a failed load shows an error.

What was broken:
- The form table had no scroller, so a narrow screen moved the whole page sideways.
- The builder panes used a scroll area that would not shrink, so the library, editor, and preview did not scroll once the header filled the screen.
- On a phone the builder kept three columns, with the field library forced to 220px, so the editor and preview sat off screen.
- The submissions dialog was never opened from the forms page. Its shell also clipped long lists instead of scrolling them. A failed load left the dialog looking empty.

Proven: `src/features/forms/utils/formsSurface.test.ts` passed through `node scripts/test-tasks-page.mjs`. A width of 767 stacks the builder. 768 keeps the columns. `npm run typecheck` passed. ESLint passed on the files this phase changed. `npm run check:i18n` passed.

Phone and desktop steps for Pedro:
1. Sign in at https://www.flowforce.uk. Open Forms. The title and readiness cards should sit closer together, and the page should scroll to My forms.
2. On a phone, swipe the form table sideways. The header and the bottom nav should stay put.
3. Tap the list icon on a form. Submissions should open and scroll. If they cannot load, the dialog says so.
4. Edit a form. On a phone, Library, Form editor, and Live preview are three buttons. Each one scrolls. On a desktop, the three columns stay, and each column scrolls.

Blockers: none. No migration.

Questions: none.

### 2026-10-23 — Phase 2 One create flow

Shipped: New form is one screen. Create form opens the editor. Templates sit on that screen and load their fields. Import from file accepts CSV, PDF, DOC, DOCX, and TXT. A CSV header row becomes one text field per column. The three method cards are gone.

Proven: `src/features/forms/utils/csvFormFields.test.ts` passed through `node scripts/test-tasks-page.mjs`. A header `Name,"Clean, downstairs",Notes` becomes those three labels. `npm run typecheck` passed. ESLint passed on the files this phase changed. `npm run check:i18n` passed.

Phone and desktop steps for Pedro:
1. Open Forms and tap New form. You should see a title, Create form, a template list, and Import from file. The three cards should be gone.
2. Type a title and tap Create form. The editor should open.
3. Start again and tap Load on a template. The editor should open with that template’s fields.
4. Import a CSV whose first row is the column names. Those names should be the fields.

Blockers: none. No migration.

Questions: none.

### 2026-10-24 — No unchecked phase left

Shipped: nothing. Phases 1 and 2 were already checked. Chats and company updates stay unphased, as this file requires. The roadmap marks Operations done and Team active.

Proven: this file has no unchecked phase. No product code changed.

Phone steps for Pedro: none from this run.

Blockers: Team has no feature file and no owner audit. No phase was drafted.

Questions: none.
