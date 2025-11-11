# Analytics Module Map

- **Primary entry**: `src/pages/Analytics.tsx` orchestrates dashboards, hooking into analytics hooks under `src/hooks/useBusinessAnalytics.tsx` and `src/hooks/useAnalytics.tsx`.
- **Shared widgets**: Charts/tables live in `src/components/analytics/**` and feed both Dashboard and Analytics pages.
- **Owner squad**: Analytics & Reporting.
- **Notes**: Preserve data-fetching hooks and TanStack query keys when modularizing.
