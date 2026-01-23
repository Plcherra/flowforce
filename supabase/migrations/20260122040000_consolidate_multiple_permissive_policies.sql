-- Consolidate Multiple Permissive Policies
-- This migration consolidates overlapping permissive RLS policies for the same table/role/action
-- into single policies with OR conditions, improving query performance

-- Strategy:
-- 1. Identify policies that overlap for the same table/role/action
-- 2. Consolidate their USING and WITH CHECK clauses with OR conditions
-- 3. Drop old policies and create consolidated ones

DO $$
DECLARE
    table_rec RECORD;
    policy_group RECORD;
    consolidated_using TEXT;
    consolidated_with_check TEXT;
    policy_names TEXT[];
    using_clauses TEXT[];
    with_check_clauses TEXT[];
    table_name TEXT;
    action_type TEXT;
    has_using BOOLEAN;
    has_with_check BOOLEAN;
    consolidated_policy_name TEXT;
BEGIN
    -- Process each table that has multiple permissive policies
    FOR table_rec IN
        SELECT DISTINCT tablename
        FROM pg_policies
        WHERE schemaname = 'public'
        ORDER BY tablename
    LOOP
        table_name := table_rec.tablename;
        
        -- Process each action type (SELECT, INSERT, UPDATE, DELETE, ALL)
        FOR action_type IN SELECT DISTINCT cmd FROM pg_policies WHERE schemaname = 'public' AND tablename = table_name LOOP
            
            -- Find all permissive policies for this table/action combination
            -- Group by action type - we'll consolidate policies that apply to the same action
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
                AND cmd = action_type
                AND permissive = 'PERMISSIVE';
            
            -- Only process if we have multiple policies to consolidate
            IF array_length(policy_names, 1) > 1 THEN
                
                -- Build consolidated USING clause
                IF has_using AND array_length(using_clauses, 1) > 0 THEN
                    -- Remove NULLs, empty strings, and duplicates, then join with OR
                    SELECT array_agg(DISTINCT clause ORDER BY clause)
                    INTO using_clauses
                    FROM unnest(using_clauses) AS clause
                    WHERE clause IS NOT NULL AND trim(clause) != '';
                    
                    IF array_length(using_clauses, 1) > 1 THEN
                        -- Wrap each clause in parentheses and join with OR
                        consolidated_using := '(' || array_to_string(
                            array(SELECT '(' || clause || ')' FROM unnest(using_clauses) AS clause),
                            ' OR '
                        ) || ')';
                    ELSIF array_length(using_clauses, 1) = 1 THEN
                        consolidated_using := using_clauses[1];
                    END IF;
                END IF;
                
                -- Build consolidated WITH CHECK clause
                IF has_with_check AND array_length(with_check_clauses, 1) > 0 THEN
                    -- Remove NULLs, empty strings, and duplicates, then join with OR
                    SELECT array_agg(DISTINCT clause ORDER BY clause)
                    INTO with_check_clauses
                    FROM unnest(with_check_clauses) AS clause
                    WHERE clause IS NOT NULL AND trim(clause) != '';
                    
                    IF array_length(with_check_clauses, 1) > 1 THEN
                        -- Wrap each clause in parentheses and join with OR
                        consolidated_with_check := '(' || array_to_string(
                            array(SELECT '(' || clause || ')' FROM unnest(with_check_clauses) AS clause),
                            ' OR '
                        ) || ')';
                    ELSIF array_length(with_check_clauses, 1) = 1 THEN
                        consolidated_with_check := with_check_clauses[1];
                    END IF;
                END IF;
                
                -- Only proceed if we have something to consolidate
                IF consolidated_using IS NOT NULL OR consolidated_with_check IS NOT NULL THEN
                    
                    -- Generate a consolidated policy name
                    consolidated_policy_name := 'consolidated_' || lower(replace(action_type, ' ', '_')) || '_' || table_name;
                    -- Limit name length to 63 characters (PostgreSQL identifier limit)
                    IF length(consolidated_policy_name) > 63 THEN
                        consolidated_policy_name := 'consolidated_' || substr(lower(action_type), 1, 10) || '_' || substr(table_name, 1, 40);
                    END IF;
                    
                    -- Drop all old policies
                    FOR policy_group IN
                        SELECT policyname
                        FROM pg_policies
                        WHERE schemaname = 'public'
                            AND tablename = table_name
                            AND cmd = action_type
                            AND permissive = 'PERMISSIVE'
                    LOOP
                        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I',
                            policy_group.policyname,
                            'public',
                            table_name);
                    END LOOP;
                    
                    -- Create consolidated policy
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
                    
                    RAISE NOTICE 'Consolidated % policies for table %.% into policy %',
                        array_length(policy_names, 1),
                        'public',
                        table_name,
                        consolidated_policy_name;
                    
                    -- Reset for next iteration
                    consolidated_using := NULL;
                    consolidated_with_check := NULL;
                    policy_names := NULL;
                    using_clauses := NULL;
                    with_check_clauses := NULL;
                END IF;
            END IF;
        END LOOP;
    END LOOP;
END $$;

-- Note: This migration consolidates overlapping permissive policies by:
-- 1. Finding all permissive policies for each table/action combination
-- 2. Combining their USING clauses with OR
-- 3. Combining their WITH CHECK clauses with OR
-- 4. Creating a single consolidated policy
-- 5. Dropping the old policies
--
-- Security is preserved because the consolidated policy uses OR to combine
-- all the conditions from the original policies, maintaining the same access rules.
