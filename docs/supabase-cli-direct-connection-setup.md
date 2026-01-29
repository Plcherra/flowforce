# Supabase CLI: Reliable connection setup (FlowForce)

## Summary

- **Direct DB host** (`db.wvkfhprjpegjyzktyueh.supabase.co`) is **IPv6-only**. From networks with no IPv6 (or no route to it), you get "no route to host" or "resolves to []". So we do **not** use direct for CLI on this machine.
- **Pooler** (`aws-0-us-west-1.pooler.supabase.com`) works with **password-based auth**. The password-less `cli_login_postgres` flow often fails with "invalid SCRAM server-final-message"; always use `SUPABASE_DB_PASSWORD` for `db pull` / `db push` / `gen types`.

## Permanent env (already in `~/.zshrc`)

```bash
export SUPABASE_DB_URL="postgresql://postgres:Vanilla.thunder97@db.wvkfhprjpegjyzktyueh.supabase.co:5432/postgres"
export SUPABASE_DB_PASSWORD="Vanilla.thunder97"
export SUPABASE_DNS_RESOLVER=https
```

Reload after editing:

```bash
source ~/.zshrc
```

## CLI version

- Prefer latest: `brew upgrade supabase` then `supabase --version` (e.g. 2.72.7).

## Commands that work

### 1. List projects / link

```bash
supabase projects list
# FlowForce (wvkfhprjpegjyzktyueh) should show as linked (●)
```

### 2. Pull schema (pooler + password)

```bash
SUPABASE_DB_PASSWORD='Vanilla.thunder97' supabase db pull
# Or after: source ~/.zshrc
supabase db pull
```

- If you see **migration history does not match**, fix with the suggested `supabase migration repair` commands, then run `supabase db pull` again.

### 3. Push migrations (pooler + password)

```bash
SUPABASE_DB_PASSWORD='Vanilla.thunder97' supabase db push
# Or with env already set:
supabase db push
```

### 4. Generate TypeScript types (project-id + password)

Uses pooler via project-id; **no** `--db-url` and **no** Docker:

```bash
SUPABASE_DB_PASSWORD='Vanilla.thunder97' npx supabase gen types typescript --project-id wvkfhprjpegjyzktyueh > supabase/database.types.ts
# Or with env already set:
npx supabase gen types typescript --project-id wvkfhprjpegjyzktyueh > supabase/database.types.ts
```

Output path: **`supabase/database.types.ts`** (used by `supabase/database-overrides.ts`).

### 5. If something fails

Run with debug and paste the output:

```bash
supabase db pull --debug
# or
SUPABASE_DB_PASSWORD='Vanilla.thunder97' supabase db pull --debug
```

## Direct connection (optional, IPv6-only)

If you’re on a network with IPv6 and route to Supabase:

```bash
supabase db pull --db-url "$SUPABASE_DB_URL" --dns-resolver native
```

From this machine, that host currently resolves only to IPv6 and fails with "no route to host", so we rely on the pooler + password instead.

## Security note

`SUPABASE_DB_PASSWORD` and the password in `SUPABASE_DB_URL` in `~/.zshrc` are in plain text. If you prefer not to store the password there, omit those lines and pass it when needed:

```bash
SUPABASE_DB_PASSWORD='yourpassword' supabase db pull
SUPABASE_DB_PASSWORD='yourpassword' npx supabase gen types typescript --project-id wvkfhprjpegjyzktyueh > supabase/database.types.ts
```
