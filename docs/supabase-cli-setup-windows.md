# Supabase CLI Setup (Windows)

Last updated: 2026-07-02

This is the permanent local setup for FlowForce Supabase CLI commands on Windows. It avoids manually exporting `SUPABASE_DB_PASSWORD` in every PowerShell session.

## What went wrong

Two different credentials are required, and they are **not interchangeable**:

| Credential | Where to get it | Format | Used for |
|---|---|---|---|
| **Personal access token** | [Account → Access Tokens](https://supabase.com/dashboard/account/tokens) | `sbp_...` | Supabase Management API (`projects list`, `link`, etc.) |
| **Database password** | Project → Settings → Database → Database password | plain text | `db push`, `migration list --linked` |

Common mistakes:

- Pasting the **anon key** or **service role key** into `supabase login` → `Invalid access token format`
- Using the wrong password or an old rotated password → `password authentication failed`
- Running bare `supabase db push` without loading `.env.local` → missing credentials every session

## One-time setup

### 1. Clear any bad stored CLI token

```powershell
supabase logout
```

### 2. Create `.env.local` (if you do not already have one)

```powershell
Copy-Item .env.example .env.local
```

Add these values to `.env.local`:

```bash
SUPABASE_PROJECT_REF=vncapxfubgqaibhjwtoy
SUPABASE_ACCESS_TOKEN=sbp_your_personal_access_token
SUPABASE_DB_PASSWORD=your_database_password
```

Notes:

- `SUPABASE_ACCESS_TOKEN` must start with `sbp_`
- `SUPABASE_DB_PASSWORD` is the **database** password, not an API key
- If you forgot the DB password, reset it in Supabase Dashboard → Project Settings → Database

### 3. Verify auth

```powershell
npm run supabase:doctor
```

Fix anything reported before continuing.

### 4. Link the project once

```powershell
npm run supabase:link
```

This stores the local link metadata under `.supabase/` (gitignored).

## Daily workflow (no manual exports)

Use npm scripts. They load `.env.local` automatically:

```powershell
npm run supabase:doctor      # check auth + link + DB password
npm run db:push              # apply migrations to remote
npm run db:push:dry-run      # preview migrations
npm run supabase:migrations  # list local vs remote migrations
npm run supabase -- gen types typescript --linked > supabase/database.types.ts
```

Do **not** rely on bare `supabase db push` in PowerShell unless you have another permanent env loader.

## Optional: browser login instead of token in `.env.local`

If you prefer not to store `SUPABASE_ACCESS_TOKEN` in `.env.local`:

```powershell
supabase logout
supabase login
```

Complete the browser flow, then keep `SUPABASE_DB_PASSWORD` in `.env.local` and continue using `npm run db:push`.

The database password is still required for remote Postgres commands even after browser login.

## Troubleshooting

### `Invalid access token format. Must be like sbp_...`

1. Run `supabase logout`
2. Ensure `.env.local` has a real `sbp_` token, **not** anon/service role keys
3. Run `npm run supabase:doctor`

### `password authentication failed for user "postgres"`

1. Open Supabase Dashboard → Project Settings → Database
2. Reset or copy the current database password
3. Update `SUPABASE_DB_PASSWORD` in `.env.local`
4. Run `npm run supabase:doctor`

### `failed to connect to postgres ... pooler.supabase.com`

Usually means the DB password is missing or wrong. The npm wrapper passes `--password` from `.env.local` automatically.

## CI parity

GitHub Actions uses the same variable names from repository secrets:

- `SUPABASE_DB_PASSWORD`
- `SUPABASE_ACCESS_TOKEN` (optional in CI if using injected credentials another way)
- `SUPABASE_PROJECT_REF`

Local `.env.local` mirrors that contract so local and CI behave the same.
