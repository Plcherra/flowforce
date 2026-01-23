# How to Apply the Help Desk Tickets Migration

## Option 1: Apply via Supabase Dashboard (Recommended - Easiest)

Since you're using a hosted Supabase instance, the easiest way is to apply the migration directly in the dashboard:

1. **Go to your Supabase Dashboard:**
   - Navigate to: https://supabase.com/dashboard/project/wvkfhprjpegjyzktyueh

2. **Open SQL Editor:**
   - Click on "SQL Editor" in the left sidebar
   - Click "New query"

3. **Copy and paste the migration SQL:**
   - Open the file: `supabase/migrations/20260122000000_create_helpdesk_tickets.sql`
   - Copy all the contents
   - Paste into the SQL Editor

4. **Run the migration:**
   - Click "Run" or press `Cmd+Enter` (Mac) / `Ctrl+Enter` (Windows/Linux)
   - Wait for it to complete

5. **Verify:**
   - Go to "Table Editor" in the left sidebar
   - You should see `helpdesk_tickets` table listed

---

## Option 2: Start Local Supabase and Apply Migration

If you want to use the Supabase CLI:

### Step 1: Start Supabase locally
```bash
# Make sure Supabase CLI is installed
# If not: brew install supabase/tap/supabase

# Start Supabase
supabase start
```

This will start:
- Postgres database on port 54322
- Supabase Studio on port 54323
- API server on port 54321

### Step 2: Apply migrations
```bash
# Apply all pending migrations
supabase db reset

# Or apply just this migration
supabase migration up
```

### Step 3: Link to your remote project (if needed)
```bash
# Link to your hosted project
supabase link --project-ref wvkfhprjpegjyzktyueh

# Push migrations to remote
supabase db push
```

---

## Option 3: Use Supabase CLI with Remote Connection

If you have Supabase CLI installed but don't want to run locally:

```bash
# Link to your remote project
supabase link --project-ref wvkfhprjpegjyzktyueh

# Apply migration to remote
supabase db push
```

---

## Quick SQL to Copy-Paste

Here's the migration SQL ready to paste:

```sql
-- Create helpdesk_tickets table
CREATE TABLE IF NOT EXISTS public.helpdesk_tickets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subject TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  requester_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  category TEXT,
  department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS helpdesk_tickets_company_id_idx ON public.helpdesk_tickets(company_id);
CREATE INDEX IF NOT EXISTS helpdesk_tickets_status_idx ON public.helpdesk_tickets(status);
CREATE INDEX IF NOT EXISTS helpdesk_tickets_requester_id_idx ON public.helpdesk_tickets(requester_id);
CREATE INDEX IF NOT EXISTS helpdesk_tickets_assigned_to_idx ON public.helpdesk_tickets(assigned_to);
CREATE INDEX IF NOT EXISTS helpdesk_tickets_created_at_idx ON public.helpdesk_tickets(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.helpdesk_tickets ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "helpdesk_tickets_select_own_company" ON public.helpdesk_tickets;
CREATE POLICY "helpdesk_tickets_select_own_company" ON public.helpdesk_tickets
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.company_id = helpdesk_tickets.company_id
    )
  );

DROP POLICY IF EXISTS "helpdesk_tickets_insert_own_company" ON public.helpdesk_tickets;
CREATE POLICY "helpdesk_tickets_insert_own_company" ON public.helpdesk_tickets
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.company_id = helpdesk_tickets.company_id
    )
  );

DROP POLICY IF EXISTS "helpdesk_tickets_update_own_company" ON public.helpdesk_tickets;
CREATE POLICY "helpdesk_tickets_update_own_company" ON public.helpdesk_tickets
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.company_id = helpdesk_tickets.company_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.company_id = helpdesk_tickets.company_id
    )
  );

DROP POLICY IF EXISTS "helpdesk_tickets_delete_own_company" ON public.helpdesk_tickets;
CREATE POLICY "helpdesk_tickets_delete_own_company" ON public.helpdesk_tickets
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.company_id = helpdesk_tickets.company_id
    )
  );

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_helpdesk_tickets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_helpdesk_tickets_updated_at_trigger ON public.helpdesk_tickets;
CREATE TRIGGER update_helpdesk_tickets_updated_at_trigger
  BEFORE UPDATE ON public.helpdesk_tickets
  FOR EACH ROW
  EXECUTE FUNCTION update_helpdesk_tickets_updated_at();
```

---

## Troubleshooting

### If you get "relation already exists" error:
The table might already exist. You can safely skip this migration or drop it first:
```sql
DROP TABLE IF EXISTS public.helpdesk_tickets CASCADE;
```
Then run the migration again.

### If you get permission errors:
Make sure you're logged in as a project owner or have database admin permissions.

---

## After Applying

Once the migration is applied:
1. ✅ The `helpdesk_tickets` table will be created
2. ✅ All indexes and RLS policies will be set up
3. ✅ The Help Desk feature will work in your app
4. ✅ Users can create, view, and manage tickets

Test it by:
- Going to `/app/help-desk` in your app
- Creating a new ticket
- Verifying it appears in the list
