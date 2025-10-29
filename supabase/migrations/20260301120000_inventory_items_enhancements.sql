BEGIN;

ALTER TABLE inv_items
  ADD COLUMN IF NOT EXISTS barcode text,
  ADD COLUMN IF NOT EXISTS category_id uuid,
  ADD COLUMN IF NOT EXISTS recipe_yield_quantity numeric,
  ADD COLUMN IF NOT EXISTS recipe_yield_unit_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'inv_items_category_id_fkey'
  ) THEN
    ALTER TABLE inv_items
      ADD CONSTRAINT inv_items_category_id_fkey
      FOREIGN KEY (category_id)
      REFERENCES inventory_categories(id)
      ON DELETE SET NULL;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'inv_items_recipe_yield_unit_id_fkey'
  ) THEN
    ALTER TABLE inv_items
      ADD CONSTRAINT inv_items_recipe_yield_unit_id_fkey
      FOREIGN KEY (recipe_yield_unit_id)
      REFERENCES inv_units(id)
      ON DELETE SET NULL;
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS inv_items_category_id_idx ON inv_items(category_id);
CREATE INDEX IF NOT EXISTS inv_items_recipe_yield_unit_idx ON inv_items(recipe_yield_unit_id);

CREATE UNIQUE INDEX IF NOT EXISTS inv_items_company_barcode_uidx
  ON inv_items (company_id, barcode)
  WHERE barcode IS NOT NULL;

COMMIT;
