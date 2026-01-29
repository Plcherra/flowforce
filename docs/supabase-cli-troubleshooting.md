# Supabase CLI: "invalid SCRAM server-final-message"

When `supabase db pull`, `supabase db push`, or `supabase link` fails with:

```
failed to connect to postgres: ... failed SASL auth (invalid SCRAM server-final-message received from server)
```

the pooler (Supavisor) is often caching bad credentials for the CLI's password-less flow, or your IP was temporarily blocked from repeated failed attempts.

## Fixes (try in order)

### 1. Check network bans

1. Open [Database Settings](https://supabase.com/dashboard/project/_/database/settings) for your project.
2. Check **Blocked IP addresses**.
3. Remove your current IP if it’s listed, then retry the CLI command.

### 2. Use password-based auth (recommended)

Use your **database password** (Dashboard → Project Settings → Database → Database password), **not** the anon or service role keys from `.env`:

```bash
SUPABASE_DB_PASSWORD='<your-database-password>' supabase db pull
```

Or export it first:

```bash
export SUPABASE_DB_PASSWORD='<your-database-password>'
supabase db pull
```

Same pattern for other commands:

```bash
SUPABASE_DB_PASSWORD='<your-database-password>' supabase db push
SUPABASE_DB_PASSWORD='<your-database-password>' supabase migration up   # local
```

### 3. Skip the pooler (IPv6 only)

If your network has IPv6, use the beta CLI and bypass the pooler:

```bash
npx supabase@beta link --skip-pooler
npx supabase@beta db pull
```

---

**Reference:** [Supabase CLI SASL / SCRAM troubleshooting](https://supabase.com/docs/guides/troubleshooting/supabase-cli-failed-sasl-auth-or-invalid-scram-server-final-message)
