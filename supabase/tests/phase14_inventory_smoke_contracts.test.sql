begin;

create extension if not exists pgtap;

select plan(18);

select ok(exists (select 1 from pg_constraint where conrelid = 'public.inv_items'::regclass and conname = 'inv_items_unit_id_fkey' and contype = 'f'), 'inv_items exposes unit relationship');
select ok(exists (select 1 from pg_constraint where conrelid = 'public.inv_items'::regclass and conname = 'inv_items_recipe_yield_unit_id_fkey' and contype = 'f'), 'inv_items exposes recipe yield unit relationship');
select ok(exists (select 1 from pg_constraint where conrelid = 'public.inv_items'::regclass and conname = 'inv_items_default_location_id_fkey' and contype = 'f'), 'inv_items exposes default location relationship');
select ok(exists (select 1 from pg_constraint where conrelid = 'public.inv_items'::regclass and conname = 'inv_items_preferred_supplier_id_fkey' and contype = 'f'), 'inv_items exposes supplier relationship');
select ok(exists (select 1 from pg_constraint where conrelid = 'public.inv_items'::regclass and conname = 'inv_items_category_id_fkey' and contype = 'f'), 'inv_items exposes category relationship');

select ok(exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'inv_production_events' and column_name = 'produced_at'), 'production events have produced_at');
select ok(exists (select 1 from pg_constraint where conrelid = 'public.inv_production_events'::regclass and conname = 'inv_production_events_item_id_fkey' and contype = 'f'), 'production events expose item relationship');
select ok(exists (select 1 from pg_constraint where conrelid = 'public.inv_production_events'::regclass and conname = 'inv_production_events_produced_unit_id_fkey' and contype = 'f'), 'production events expose produced unit relationship');
select ok(exists (select 1 from pg_constraint where conrelid = 'public.inv_production_events'::regclass and conname = 'inv_production_events_yield_unit_id_fkey' and contype = 'f'), 'production events expose yield unit relationship');
select ok(exists (select 1 from pg_constraint where conrelid = 'public.inv_production_events'::regclass and conname = 'inv_production_events_waste_unit_id_fkey' and contype = 'f'), 'production events expose waste unit relationship');
select ok(exists (select 1 from pg_constraint where conrelid = 'public.inv_production_events'::regclass and conname = 'inv_production_events_created_by_fkey' and contype = 'f'), 'production events expose creator relationship');
select ok(exists (select 1 from pg_constraint where conrelid = 'public.inv_production_events'::regclass and conname = 'inv_production_events_approved_by_fkey' and contype = 'f'), 'production events expose approver relationship');

select ok(exists (select 1 from pg_constraint where conrelid = 'public.inv_production_materials'::regclass and conname = 'inv_production_materials_production_id_fkey' and contype = 'f'), 'production materials embed under production events');
select ok(exists (select 1 from pg_constraint where conrelid = 'public.inv_production_materials'::regclass and conname = 'inv_production_materials_unit_id_fkey' and contype = 'f'), 'production materials expose unit relationship');
select ok(exists (select 1 from pg_constraint where conrelid = 'public.inv_production_materials'::regclass and conname = 'inv_production_materials_ingredient_item_id_fkey' and contype = 'f'), 'production materials expose ingredient relationship');

select ok(exists (select 1 from pg_constraint where conrelid = 'public.inv_production_approvals'::regclass and conname = 'inv_production_approvals_production_id_fkey' and contype = 'f'), 'production approvals embed under production events');
select ok(exists (select 1 from pg_constraint where conrelid = 'public.inv_production_approvals'::regclass and conname = 'inv_production_approvals_action_by_fkey' and contype = 'f'), 'production approvals expose actor relationship');
select ok(exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'inv_production_approvals' and column_name = 'action_at'), 'production approvals have action_at');

select * from finish();

rollback;
