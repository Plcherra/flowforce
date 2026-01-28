create extension if not exists "pgcrypto";

-- Create table only if company_updates table exists (created in later migration)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'company_updates'
  ) THEN
    -- Create table with foreign key to company_updates
    CREATE TABLE IF NOT EXISTS company_update_engagement (
      id uuid primary key default gen_random_uuid(),
      update_id uuid references company_updates(id) on delete cascade,
      company_id uuid references companies(id),
      likes_count int default 0,
      comments_count int default 0,
      views_count int default 0,
      engagement_score numeric default 0,
      sentiment_score numeric,
      ai_summary text,
      last_analyzed timestamptz default now(),
      created_at timestamptz default now(),
      updated_at timestamptz default now()
    );

    ALTER TABLE company_update_engagement ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Allow company-level read/write" ON company_update_engagement;
    CREATE POLICY "Allow company-level read/write" ON company_update_engagement
    FOR ALL USING (
      auth.uid() IN (
        SELECT id FROM profiles WHERE company_id = company_update_engagement.company_id
      )
    ) WITH CHECK (
      auth.uid() IN (
        SELECT id FROM profiles WHERE company_id = company_update_engagement.company_id
      )
    );
  ELSE
    -- Create table without foreign key (will be added later when company_updates exists)
    CREATE TABLE IF NOT EXISTS company_update_engagement (
      id uuid primary key default gen_random_uuid(),
      update_id uuid,
      company_id uuid references companies(id),
      likes_count int default 0,
      comments_count int default 0,
      views_count int default 0,
      engagement_score numeric default 0,
      sentiment_score numeric,
      ai_summary text,
      last_analyzed timestamptz default now(),
      created_at timestamptz default now(),
      updated_at timestamptz default now()
    );

    ALTER TABLE company_update_engagement ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Allow company-level read/write" ON company_update_engagement;
    CREATE POLICY "Allow company-level read/write" ON company_update_engagement
    FOR ALL USING (
      auth.uid() IN (
        SELECT id FROM profiles WHERE company_id = company_update_engagement.company_id
      )
    ) WITH CHECK (
      auth.uid() IN (
        SELECT id FROM profiles WHERE company_id = company_update_engagement.company_id
      )
    );
  END IF;
END $$;

-- Add foreign key constraint later if it doesn't exist and company_updates table exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'company_updates'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_name = 'company_update_engagement'
    AND kcu.column_name = 'update_id'
    AND tc.constraint_type = 'FOREIGN KEY'
  ) THEN
    ALTER TABLE company_update_engagement
    ADD CONSTRAINT company_update_engagement_update_id_fkey
    FOREIGN KEY (update_id) REFERENCES company_updates(id) ON DELETE CASCADE;
  END IF;
END $$;
