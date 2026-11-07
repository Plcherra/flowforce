-- Permanently delete hidden Walk-in placeholder rows from inv_locations.
-- Name match only: walk-in, walk in, walkin. Other hidden location_type = 'store'
-- rows stay. References are cleared before the delete. schedules.location is
-- nulled and the previous text is kept in legacy_location when that column is empty.
-- Nullable foreign keys are set null so child inventory rows are not cascade-deleted.
-- inv_count_locations.location_id is ON DELETE RESTRICT, so it is cleared first.
-- company_policy_assignments.target_id is NOT NULL, so store assignments that
-- point at these rows are deleted.

do $walk_in$
declare
  walk_ids uuid[];
begin
  select coalesce(array_agg(room.id), '{}'::uuid[])
  into walk_ids
  from public.inv_locations as room
  where lower(regexp_replace(trim(coalesce(room.name, '')), '\s+', ' ', 'g'))
    in ('walk-in', 'walk in', 'walkin');

  update public.profiles
  set location_id = null
  where location_id = any(walk_ids);

  update public.company_invites
  set location_id = null
  where location_id = any(walk_ids);

  delete from public.company_policy_assignments
  where target_type = 'store'
    and (
      target_id = any(walk_ids::text[])
      or lower(regexp_replace(trim(target_id), '\s+', ' ', 'g'))
        in ('walk-in', 'walk in', 'walkin')
    );

  update public.schedules
  set
    legacy_location = coalesce(legacy_location, location),
    location = null
  where location = any(walk_ids::text[])
    or lower(regexp_replace(trim(coalesce(location, '')), '\s+', ' ', 'g'))
      in ('walk-in', 'walk in', 'walkin');

  update public.calendar_events
  set location = null
  where location = any(walk_ids::text[])
    or lower(regexp_replace(trim(coalesce(location, '')), '\s+', ' ', 'g'))
      in ('walk-in', 'walk in', 'walkin');

  update public.inventory_items
  set location = null
  where location = any(walk_ids::text[])
    or lower(regexp_replace(trim(coalesce(location, '')), '\s+', ' ', 'g'))
      in ('walk-in', 'walk in', 'walkin');

  update public.supervisor_schedule
  set location = null
  where location = any(walk_ids::text[])
    or lower(regexp_replace(trim(coalesce(location, '')), '\s+', ' ', 'g'))
      in ('walk-in', 'walk in', 'walkin');

  update public.system_logs
  set location = null
  where location = any(walk_ids::text[])
    or lower(regexp_replace(trim(coalesce(location, '')), '\s+', ' ', 'g'))
      in ('walk-in', 'walk in', 'walkin');

  update public.time_entries
  set location = null
  where location = any(walk_ids::text[])
    or lower(regexp_replace(trim(coalesce(location, '')), '\s+', ' ', 'g'))
      in ('walk-in', 'walk in', 'walkin');

  update public.vendor_visits
  set location = null
  where location = any(walk_ids::text[])
    or lower(regexp_replace(trim(coalesce(location, '')), '\s+', ' ', 'g'))
      in ('walk-in', 'walk in', 'walkin');

  update public.inv_adjustments
  set location_id = null
  where location_id = any(walk_ids);

  update public.inv_adjustments
  set from_location_id = null
  where from_location_id = any(walk_ids);

  update public.inv_adjustments
  set to_location_id = null
  where to_location_id = any(walk_ids);

  update public.inv_count_locations
  set location_id = null
  where location_id = any(walk_ids);

  update public.inv_counts
  set location_id = null
  where location_id = any(walk_ids);

  update public.inv_items
  set default_location_id = null
  where default_location_id = any(walk_ids);

  update public.inv_par_overrides
  set location_id = null
  where location_id = any(walk_ids);

  update public.inv_par_profiles
  set location_id = null
  where location_id = any(walk_ids);

  update public.inv_prep_batches
  set prep_location_id = null
  where prep_location_id = any(walk_ids);

  update public.inv_purchase_lines
  set location_id = null
  where location_id = any(walk_ids);

  update public.inv_stock_lots
  set location_id = null
  where location_id = any(walk_ids);

  update public.inv_waste
  set location_id = null
  where location_id = any(walk_ids);

  update public.task_workflow_instances
  set location_id = null
  where location_id = any(walk_ids);

  update public.workflow_assignments
  set location_id = null
  where location_id = any(walk_ids);

  update public.workflows
  set location_id = null
  where location_id = any(walk_ids);

  update public.forms as form
  set settings = jsonb_set(
    form.settings,
    '{distribution,store_ids}',
    coalesce(
      (
        select jsonb_agg(item)
        from jsonb_array_elements(form.settings #> '{distribution,store_ids}') as item
        where coalesce(item #>> '{}', '') <> all(walk_ids::text[])
          and lower(regexp_replace(trim(coalesce(item #>> '{}', '')), '\s+', ' ', 'g'))
            not in ('walk-in', 'walk in', 'walkin')
      ),
      '[]'::jsonb
    ),
    false
  )
  where jsonb_typeof(form.settings #> '{distribution,store_ids}') = 'array'
    and exists (
      select 1
      from jsonb_array_elements(form.settings #> '{distribution,store_ids}') as item
      where coalesce(item #>> '{}', '') = any(walk_ids::text[])
        or lower(regexp_replace(trim(coalesce(item #>> '{}', '')), '\s+', ' ', 'g'))
          in ('walk-in', 'walk in', 'walkin')
    );

  update public.system_settings as settings
  set admin_config = jsonb_set(
    settings.admin_config,
    '{businessStructure,locations}',
    coalesce(
      (
        select jsonb_agg(entry)
        from jsonb_array_elements(
          settings.admin_config #> '{businessStructure,locations}'
        ) as entry
        where coalesce(entry->>'id', '') <> all(walk_ids::text[])
          and lower(regexp_replace(trim(coalesce(entry->>'name', '')), '\s+', ' ', 'g'))
            not in ('walk-in', 'walk in', 'walkin')
      ),
      '[]'::jsonb
    ),
    false
  )
  where jsonb_typeof(settings.admin_config #> '{businessStructure,locations}') = 'array'
    and exists (
      select 1
      from jsonb_array_elements(
        settings.admin_config #> '{businessStructure,locations}'
      ) as entry
      where coalesce(entry->>'id', '') = any(walk_ids::text[])
        or lower(regexp_replace(trim(coalesce(entry->>'name', '')), '\s+', ' ', 'g'))
          in ('walk-in', 'walk in', 'walkin')
    );

  update public.announcements as announcement
  set target_ids = coalesce(
    (
      select jsonb_agg(item)
      from jsonb_array_elements(announcement.target_ids) as item
      where coalesce(item #>> '{}', '') <> all(walk_ids::text[])
        and lower(regexp_replace(trim(coalesce(item #>> '{}', '')), '\s+', ' ', 'g'))
          not in ('walk-in', 'walk in', 'walkin')
    ),
    '[]'::jsonb
  )
  where jsonb_typeof(announcement.target_ids) = 'array'
    and exists (
      select 1
      from jsonb_array_elements(announcement.target_ids) as item
      where coalesce(item #>> '{}', '') = any(walk_ids::text[])
        or lower(regexp_replace(trim(coalesce(item #>> '{}', '')), '\s+', ' ', 'g'))
          in ('walk-in', 'walk in', 'walkin')
    );

  delete from public.inv_locations
  where id = any(walk_ids);
end
$walk_in$;
