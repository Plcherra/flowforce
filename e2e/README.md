# End-to-end tests

One Playwright test signs in, creates a task with a unique title, checks that the task shows up in the list, and deletes it.

## Run

Install Chromium once:

```bash
npx playwright install chromium
```

Then:

```bash
npm run test:e2e
```

By default this starts the local dev server and opens `http://127.0.0.1:3000`. To use a server that is already running on that address, leave it up. Playwright reuses it.

Point the same test at a Vercel preview (the local server is not started):

```bash
PLAYWRIGHT_BASE_URL=https://your-preview.vercel.app npm run test:e2e
```

HTML reports and failure screenshots are written to `playwright-report/` and `test-results/`. Both directories are gitignored.

`npm run test:playwright` still runs the older specs in `tests/playwright`. It does not start the dev server.

## Environment

Local runs need these variables in the environment (or in `.env.local`, which Next.js loads for the dev server):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` or `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `TEST_USER_EMAIL`
- `TEST_USER_PASSWORD`
- `TEST_RECIPIENT_EMAIL` and `TEST_RECIPIENT_PASSWORD` for the two-user message test

The message test signs in as both users through the app. It does not use a service role key. The local seed script creates the second user and prints those variables. `TEST_USER_NAME` defaults to `Playwright Owner` and `TEST_RECIPIENT_NAME` defaults to `Relay Tester`.

The test user must be able to sign in and create a task. A preview run still needs `TEST_USER_EMAIL` and `TEST_USER_PASSWORD`. The preview build already contains the public Supabase keys.

Do not set `SUPABASE_SERVICE_ROLE_KEY` for this suite. Do not put that key in Playwright config, and do not expose it as a `NEXT_PUBLIC_` variable. This folder does not seed the database.

## Test data

Each run creates one task titled `e2e-task-<timestamp>`. The title is unique to that run. At the end the test opens the task and deletes it through the UI when the account can edit tasks.

If a run stops before that delete, remove the leftover task in the app. To wipe leftover rows another way, reset the Supabase project you use for tests (for example the Supabase dashboard SQL editor, or `supabase db reset` against a local stack). Do not point that reset at production.
