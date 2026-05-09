# Regenerating Supabase Types

## Option 1: From Remote Database (No Docker Required)

Since Docker isn't running, you can regenerate types directly from your remote Supabase instance:

```bash
# Using Supabase CLI with project ID
supabase gen types typescript --project-id wvkfhprjpegjyzktyueh > src/integrations/supabase/types.ts

# Or if you have Supabase CLI linked
supabase gen types typescript --linked > src/integrations/supabase/types.ts
```

## Option 2: Start Docker and Use Local Supabase

If you want to use local Supabase:

1. **Start Docker Desktop** - Make sure Docker Desktop is running
2. **Start Supabase locally:**
   ```bash
   supabase start
   ```
3. **Generate types:**
   ```bash
   supabase gen types typescript --local > src/integrations/supabase/types.ts
   ```

## What This Will Fix

Regenerating types will include:
- `availability_exception` table
- `availability_request` table  
- `audit_log` table
- Any other tables that exist in the database but aren't in the current types file

This should reduce the ~1922 TypeScript errors significantly.

## Note

The app can still run against the remote Supabase instance without Docker. The Docker requirement is only for local Supabase development.
