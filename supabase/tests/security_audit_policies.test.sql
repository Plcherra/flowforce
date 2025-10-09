BEGIN;
SELECT plan(12);

-- Ensure clean audit log state
TRUNCATE public.audit_log RESTART IDENTITY;

-- Seed management and employee profiles
INSERT INTO public.profiles (id, first_name, last_name, email, employment_status, role, created_at, updated_at)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'Manager', 'One', 'manager@example.com', 'active', 'manager', now(), now()),
  ('22222222-2222-2222-2222-222222222222', 'Staff', 'One', 'staff1@example.com', 'active', 'staff', now(), now()),
  ('33333333-3333-3333-3333-333333333333', 'Staff', 'Two', 'staff2@example.com', 'active', 'staff', now(), now())
ON CONFLICT (id) DO NOTHING;

-- Reset org prefs lock mode
INSERT INTO public.org_prefs (id, availability_lock_mode, auto_lock_day_of_week, auto_lock_hour)
VALUES ('00000000-0000-0000-0000-000000000001', 'open', 4, 17)
ON CONFLICT (id) DO UPDATE
SET availability_lock_mode = EXCLUDED.availability_lock_mode,
    auto_lock_day_of_week = EXCLUDED.auto_lock_day_of_week,
    auto_lock_hour = EXCLUDED.auto_lock_hour;

-- Insert availability requests as individual employees
DO $$
BEGIN
  PERFORM set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
  INSERT INTO public.availability_request (id, employee_id, week_start, payload, status)
  VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', DATE '2025-10-20', '{}'::jsonb, 'pending')
  ON CONFLICT (id) DO UPDATE
  SET payload = EXCLUDED.payload, status = EXCLUDED.status;
END;
$$;

DO $$
BEGIN
  PERFORM set_config('request.jwt.claim.sub', '33333333-3333-3333-3333-333333333333', true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
  INSERT INTO public.availability_request (id, employee_id, week_start, payload, status)
  VALUES ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '33333333-3333-3333-3333-333333333333', DATE '2025-10-20', '{}'::jsonb, 'pending')
  ON CONFLICT (id) DO UPDATE
  SET payload = EXCLUDED.payload, status = EXCLUDED.status;
END;
$$;

-- Seed badge catalog and promotion proposal
INSERT INTO public.badge_catalog (id, code, title, description, created_at, updated_at)
VALUES ('44444444-4444-4444-4444-444444444444', 'TEAM_PLAYER', 'Team Player', 'Consistently supports teammates', now(), now())
ON CONFLICT (code) DO UPDATE
SET title = EXCLUDED.title,
    description = EXCLUDED.description;

DO $$
BEGIN
  PERFORM set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
  INSERT INTO public.promotion_proposal (id, employee_id, proposed_role, proposed_level, status, rationale)
  VALUES ('55555555-5555-5555-5555-555555555555', '22222222-2222-2222-2222-222222222222', 'shift_lead', 2, 'pending', 'Strong performance')
  ON CONFLICT (id) DO UPDATE
  SET proposed_role = EXCLUDED.proposed_role,
      proposed_level = EXCLUDED.proposed_level,
      status = 'pending',
      rationale = EXCLUDED.rationale,
      decided_by = NULL,
      decided_at = NULL;
END;
$$;

-- 1. Staff cannot change availability lock mode
SELECT throws_ok(
  $$
    DO $do$
    BEGIN
      PERFORM set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', true);
      PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
      UPDATE public.org_prefs
      SET availability_lock_mode = 'lock'
      WHERE id = '00000000-0000-0000-0000-000000000001';
    END;
    $do$;
  $$,
  '42501',
  'Staff member cannot change lock mode'
);

-- 2. Manager can change lock mode (and back)
SELECT lives_ok(
  $$
    DO $do$
    BEGIN
      PERFORM set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);
      PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
      UPDATE public.org_prefs
      SET availability_lock_mode = 'lock'
      WHERE id = '00000000-0000-0000-0000-000000000001';
      UPDATE public.org_prefs
      SET availability_lock_mode = 'open'
      WHERE id = '00000000-0000-0000-0000-000000000001';
    END;
    $do$;
  $$,
  'Manager can change lock mode'
);

-- 3. Audit log captured lock mode change
SELECT set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SELECT is(
  (
    SELECT count(*) FROM public.audit_log
    WHERE action = 'org_prefs.lock_mode_updated'
  ),
  1::bigint,
  'Lock mode change writes single audit entry'
);

-- 4. Staff only sees own availability request
SELECT set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SELECT is(
  (
    SELECT count(*) FROM public.availability_request
  ),
  1::bigint,
  'Employee sees only their availability request'
);

-- 5. Manager approves availability request and audit logged
SELECT lives_ok(
  $$
    DO $do$
    BEGIN
      PERFORM set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);
      PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
      UPDATE public.availability_request
      SET status = 'approved', manager_id = '11111111-1111-1111-1111-111111111111', decision_note = 'Looks good'
      WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    END;
    $do$;
  $$,
  'Manager can approve availability request'
);

SELECT set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SELECT is(
  (
    SELECT count(*) FROM public.audit_log
    WHERE action = 'availability_request.status_changed'
      AND entity_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
  ),
  1::bigint,
  'Availability approval logged to audit'
);

-- 6. Employee only sees own badges
DELETE FROM public.employee_badge;
SELECT lives_ok(
  $$
    DO $do$
    BEGIN
      PERFORM set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);
      PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
      INSERT INTO public.employee_badge (id, employee_id, badge_code, awarded_at, awarded_by, reason)
      VALUES ('66666666-6666-6666-6666-666666666666', '22222222-2222-2222-2222-222222222222', 'TEAM_PLAYER', now(), '11111111-1111-1111-1111-111111111111', 'Great collaboration');
    END;
    $do$;
  $$,
  'Manager can award badge'
);

SELECT set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SELECT is(
  (
    SELECT count(*) FROM public.employee_badge
  ),
  1::bigint,
  'Employee sees only their own badge'
);

SELECT set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SELECT is(
  (
    SELECT count(*) FROM public.audit_log
    WHERE action = 'employee_badge.awarded'
      AND entity_id = '66666666-6666-6666-6666-666666666666'
  ),
  1::bigint,
  'Badge award logged to audit'
);

-- 7. Staff cannot approve promotion
SELECT throws_ok(
  $$
    DO $do$
    BEGIN
      PERFORM set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', true);
      PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
      UPDATE public.promotion_proposal
      SET status = 'approved'
      WHERE id = '55555555-5555-5555-5555-555555555555';
    END;
    $do$;
  $$,
  '42501',
  'Staff cannot approve promotion'
);

-- 8. Manager can approve promotion and audit recorded
SELECT lives_ok(
  $$
    DO $do$
    BEGIN
      PERFORM set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);
      PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
      UPDATE public.promotion_proposal
      SET status = 'approved', decided_by = '11111111-1111-1111-1111-111111111111', decided_at = now()
      WHERE id = '55555555-5555-5555-5555-555555555555';
    END;
    $do$;
  $$,
  'Manager can approve promotion'
);

SELECT set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SELECT is(
  (
    SELECT count(*) FROM public.audit_log
    WHERE action = 'promotion_proposal.status_changed'
      AND entity_id = '55555555-5555-5555-5555-555555555555'
  ),
  1::bigint,
  'Promotion approval logged to audit'
);

SELECT * FROM finish();
ROLLBACK;
