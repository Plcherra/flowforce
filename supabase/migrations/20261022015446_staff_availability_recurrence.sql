-- Availability rows can repeat. Unavailability already stores its pattern on recurring_pattern.

alter table public.staff_availability
  add column if not exists recurrence jsonb;
