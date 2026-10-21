-- Company availability choice and schedule window weekdays.
-- Weekday numbers stay 0-6. This does not set a day, and it does not reuse availability_lock_mode.

alter table public.org_prefs
  add column if not exists availability_choice text,
  add column if not exists schedule_window_start_weekday smallint,
  add column if not exists schedule_window_end_weekday smallint,
  add column if not exists schedule_posting_weekday smallint;

alter table public.org_prefs
  drop constraint if exists org_prefs_availability_choice_check;

alter table public.org_prefs
  add constraint org_prefs_availability_choice_check
  check (
    availability_choice is null
    or availability_choice in ('open', 'fixed')
  );

alter table public.org_prefs
  drop constraint if exists org_prefs_schedule_window_start_weekday_check;

alter table public.org_prefs
  add constraint org_prefs_schedule_window_start_weekday_check
  check (
    schedule_window_start_weekday is null
    or schedule_window_start_weekday between 0 and 6
  );

alter table public.org_prefs
  drop constraint if exists org_prefs_schedule_window_end_weekday_check;

alter table public.org_prefs
  add constraint org_prefs_schedule_window_end_weekday_check
  check (
    schedule_window_end_weekday is null
    or schedule_window_end_weekday between 0 and 6
  );

alter table public.org_prefs
  drop constraint if exists org_prefs_schedule_posting_weekday_check;

alter table public.org_prefs
  add constraint org_prefs_schedule_posting_weekday_check
  check (
    schedule_posting_weekday is null
    or schedule_posting_weekday between 0 and 6
  );
