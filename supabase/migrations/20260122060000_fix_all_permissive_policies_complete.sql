-- Complete Fix for Multiple Permissive Policies
-- This migration handles the case where policies with cmd='ALL' overlap with specific action policies
-- Strategy: For each table, consolidate ALL policies (including 'ALL' policies) into action-specific policies

DO $$
DECLARE
    table_rec RECORD;
    action_type TEXT;
    table_name TEXT;
    consolidated_using TEXT;
    consolidated_with_check TEXT;
    using_clauses TEXT[];
    with_check_clauses TEXT[];
    policy_names TEXT[];
    all_policies_to_drop TEXT[];
    has_using BOOLEAN;
    has_with_check BOOLEAN;
    consolidated_policy_name TEXT;
    action_types TEXT[] := ARRAY['SELECT', 'INSERT', 'UPDATE', 'DELETE'];
    policy_data RECORD;
BEGIN
    -- Process each table
    FOR table_rec IN
        SELECT DISTINCT tablename
        FROM pg_policies
        WHERE schemaname = 'public'
        ORDER BY tablename
    LOOP
        table_name := table_rec.tablename;
        
        -- Process each action type
        FOREACH action_type IN ARRAY action_types
        LOOP
            -- FIRST: Collect policies that apply to this action BEFORE dropping:
            -- 1. Policies with cmd = action_type (e.g., SELECT)
            -- 2. Policies with cmd = 'ALL' (apply to all actions)
            SELECT 
                array_agg(DISTINCT policyname ORDER BY policyname),
                array_agg(DISTINCT qual) FILTER (WHERE qual IS NOT NULL),
                array_agg(DISTINCT with_check) FILTER (WHERE with_check IS NOT NULL),
                bool_or(qual IS NOT NULL),
                bool_or(with_check IS NOT NULL)
            INTO
                policy_names,
                using_clauses,
                with_check_clauses,
                has_using,
                has_with_check
            FROM pg_policies
            WHERE schemaname = 'public'
                AND tablename = table_name
                AND permissive = 'PERMISSIVE'
                AND (
                    cmd = action_type OR 
                    cmd = 'ALL'
                );
            
            -- SECOND: Drop policies for this action (including any existing consolidated ones)
            IF policy_names IS NOT NULL AND array_length(policy_names, 1) > 0 THEN
                FOREACH consolidated_policy_name IN ARRAY policy_names
                LOOP
                    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I',
                        consolidated_policy_name,
                        'public',
                        table_name);
                END LOOP;
                
                -- Also drop the consolidated policy we're about to create (if it exists from previous run)
                consolidated_policy_name := 'consolidated_' || lower(action_type) || '_' || table_name;
                IF length(consolidated_policy_name) > 63 THEN
                    consolidated_policy_name := 'consolidated_' || substr(lower(action_type), 1, 10) || '_' || substr(table_name, 1, 40);
                END IF;
                EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I',
                    consolidated_policy_name,
                    'public',
                    table_name);
            END IF;
            
            -- THIRD: Build consolidated policy if we have policies to consolidate
            IF policy_names IS NOT NULL AND array_length(policy_names, 1) > 0 THEN
                
                -- Build consolidated USING clause
                IF has_using AND using_clauses IS NOT NULL AND array_length(using_clauses, 1) > 0 THEN
                    -- Remove NULLs, empty strings, and duplicates
                    SELECT array_agg(DISTINCT clause ORDER BY clause)
                    INTO using_clauses
                    FROM unnest(using_clauses) AS clause
                    WHERE clause IS NOT NULL AND trim(clause) != '';
                    
                    IF using_clauses IS NOT NULL AND array_length(using_clauses, 1) > 1 THEN
                        consolidated_using := '(' || array_to_string(
                            array(SELECT '(' || clause || ')' FROM unnest(using_clauses) AS clause),
                            ' OR '
                        ) || ')';
                    ELSIF using_clauses IS NOT NULL AND array_length(using_clauses, 1) = 1 THEN
                        consolidated_using := using_clauses[1];
                    END IF;
                END IF;
                
                -- Build consolidated WITH CHECK clause
                IF has_with_check AND with_check_clauses IS NOT NULL AND array_length(with_check_clauses, 1) > 0 THEN
                    -- Remove NULLs, empty strings, and duplicates
                    SELECT array_agg(DISTINCT clause ORDER BY clause)
                    INTO with_check_clauses
                    FROM unnest(with_check_clauses) AS clause
                    WHERE clause IS NOT NULL AND trim(clause) != '';
                    
                    IF with_check_clauses IS NOT NULL AND array_length(with_check_clauses, 1) > 1 THEN
                        consolidated_with_check := '(' || array_to_string(
                            array(SELECT '(' || clause || ')' FROM unnest(with_check_clauses) AS clause),
                            ' OR '
                        ) || ')';
                    ELSIF with_check_clauses IS NOT NULL AND array_length(with_check_clauses, 1) = 1 THEN
                        consolidated_with_check := with_check_clauses[1];
                    END IF;
                END IF;
                
                -- Create consolidated policy if we have clauses
                -- Note: INSERT policies can only use WITH CHECK, not USING
                -- SELECT policies can only use USING, not WITH CHECK
                -- UPDATE/DELETE can use both
                IF consolidated_using IS NOT NULL OR consolidated_with_check IS NOT NULL THEN
                    consolidated_policy_name := 'consolidated_' || lower(action_type) || '_' || table_name;
                    -- Limit name length
                    IF length(consolidated_policy_name) > 63 THEN
                        consolidated_policy_name := 'consolidated_' || substr(lower(action_type), 1, 10) || '_' || substr(table_name, 1, 40);
                    END IF;
                    
                    -- Handle different action types with their allowed clauses
                    -- PostgreSQL RLS policy rules:
                    -- SELECT: Only USING (no WITH CHECK)
                    -- INSERT: Only WITH CHECK (no USING)
                    -- UPDATE: Both USING and WITH CHECK allowed
                    -- DELETE: Only USING (no WITH CHECK)
                    IF action_type = 'INSERT' THEN
                        -- INSERT can only use WITH CHECK
                        IF consolidated_with_check IS NOT NULL THEN
                            EXECUTE format(
                                'CREATE POLICY %I ON %I.%I FOR %s WITH CHECK (%s)',
                                consolidated_policy_name,
                                'public',
                                table_name,
                                action_type,
                                consolidated_with_check
                            );
                        ELSIF consolidated_using IS NOT NULL THEN
                            -- If only USING exists, use it as WITH CHECK for INSERT
                            EXECUTE format(
                                'CREATE POLICY %I ON %I.%I FOR %s WITH CHECK (%s)',
                                consolidated_policy_name,
                                'public',
                                table_name,
                                action_type,
                                consolidated_using
                            );
                        END IF;
                    ELSIF action_type = 'SELECT' OR action_type = 'DELETE' THEN
                        -- SELECT and DELETE can only use USING
                        IF consolidated_using IS NOT NULL THEN
                            EXECUTE format(
                                'CREATE POLICY %I ON %I.%I FOR %s USING (%s)',
                                consolidated_policy_name,
                                'public',
                                table_name,
                                action_type,
                                consolidated_using
                            );
                        ELSIF consolidated_with_check IS NOT NULL THEN
                            -- If only WITH CHECK exists, use it as USING for SELECT/DELETE
                            EXECUTE format(
                                'CREATE POLICY %I ON %I.%I FOR %s USING (%s)',
                                consolidated_policy_name,
                                'public',
                                table_name,
                                action_type,
                                consolidated_with_check
                            );
                        END IF;
                    ELSIF action_type = 'UPDATE' THEN
                        -- UPDATE can use both USING and WITH CHECK
                        IF consolidated_using IS NOT NULL AND consolidated_with_check IS NOT NULL THEN
                            EXECUTE format(
                                'CREATE POLICY %I ON %I.%I FOR %s USING (%s) WITH CHECK (%s)',
                                consolidated_policy_name,
                                'public',
                                table_name,
                                action_type,
                                consolidated_using,
                                consolidated_with_check
                            );
                        ELSIF consolidated_using IS NOT NULL THEN
                            EXECUTE format(
                                'CREATE POLICY %I ON %I.%I FOR %s USING (%s)',
                                consolidated_policy_name,
                                'public',
                                table_name,
                                action_type,
                                consolidated_using
                            );
                        ELSIF consolidated_with_check IS NOT NULL THEN
                            EXECUTE format(
                                'CREATE POLICY %I ON %I.%I FOR %s WITH CHECK (%s)',
                                consolidated_policy_name,
                                'public',
                                table_name,
                                action_type,
                                consolidated_with_check
                            );
                        END IF;
                    END IF;
                    
                    RAISE NOTICE 'Created consolidated policy % for table public.% action %',
                        consolidated_policy_name,
                        table_name,
                        action_type;
                END IF;
                
                -- Reset for next action
                consolidated_using := NULL;
                consolidated_with_check := NULL;
                using_clauses := NULL;
                with_check_clauses := NULL;
                policy_names := NULL;
            END IF;
        END LOOP;
        
        -- All policies have been dropped per action type above
        -- Reset for next table
        all_policies_to_drop := NULL;
    END LOOP;
END $$;

-- Note: This migration:
-- 1. For each table, collects all policies (including 'ALL' policies)
-- 2. For each action type (SELECT, INSERT, UPDATE, DELETE), creates a consolidated policy
--    that includes both action-specific policies AND 'ALL' policies
-- 3. Drops all old policies (both original and previously consolidated)
-- 4. This ensures no overlaps and optimal performance
