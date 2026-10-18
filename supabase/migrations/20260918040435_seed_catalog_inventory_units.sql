insert into public.inv_units (
  name,
  abbreviation,
  unit_type,
  is_active,
  is_base_unit
)
select
  seed.name,
  seed.abbreviation,
  seed.unit_type,
  true,
  seed.is_base_unit
from (
  values
    ('Each', 'ea', 'count', true),
    ('Case', 'cs', 'count', false),
    ('Pound', 'lb', 'weight', true),
    ('Ounce', 'oz', 'weight', false),
    ('Kilogram', 'kg', 'weight', false),
    ('Gram', 'g', 'weight', false),
    ('Gallon', 'gal', 'volume', true),
    ('Quart', 'qt', 'volume', false),
    ('Pint', 'pt', 'volume', false),
    ('Cup', 'cup', 'volume', false),
    ('Fluid ounce', 'fl oz', 'volume', false),
    ('Liter', 'L', 'volume', false),
    ('Milliliter', 'ml', 'volume', false)
) as seed(name, abbreviation, unit_type, is_base_unit)
where not exists (
  select 1
  from public.inv_units existing
  where lower(coalesce(existing.abbreviation, '')) = lower(seed.abbreviation)
     or lower(coalesce(existing.name, '')) = lower(seed.name)
);
