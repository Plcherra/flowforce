alter table public.profiles
  add column if not exists language text;

alter table public.profiles
  drop constraint if exists profiles_language_check;

alter table public.profiles
  add constraint profiles_language_check
  check (
    language is null
    or language in ('en', 'es', 'pt', 'fr', 'it', 'de')
  );

notify pgrst, 'reload schema';
