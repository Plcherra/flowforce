# Operations Module Map

- **Primary entry**: `src/modules/operations/pages/OperationsPage.tsx` re-exports the legacy intelligence surface while new experiences live under `src/modules/operations/pages/**`.
- **Components**: Feature widgets reside in `src/modules/operations/components/`, split by checklist, AI insights, and KPI cards.
- **Data/contexts**: Shared state and fetchers live in `src/modules/operations/contexts/` and `src/modules/operations/hooks/`.
- **Owner squad**: Operations & Scheduling team (Goals, Tasks, Forms, Scheduling).
- **Notes**: Keep this module authoritative while legacy `/src/pages/OperationsIntelligence.tsx` sunsets.
