# Inventory Module Map

- **Primary entry**: Router now points `/app/inventory-actions` to `src/features/inventory/routes/Actions.tsx`.
- **Feature scope**: Core UI lives under `src/features/inventory/components/` plus supporting hooks/services in `src/features/inventory/hooks/` and `src/features/inventory/services/`.
- **Legacy links**: Classic pages were removed; this folder is now the single source of truth.
- **Owner squad**: Inventory & Operations.
- **Notes**: Keep repositories (`src/features/inventory/repositories/`) in sync with Supabase tables before deleting any supporting files.
