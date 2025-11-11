# HR / Learning Module Map

- **Learning Center**: `src/features/learning/**` powers catalog, enrollments, analytics, and admin tabs consumed by `src/pages/LearningCenter.tsx`.
- **Performance Bridge**: `src/pages/Performance.tsx` plus hooks in `src/hooks/usePerformanceOverview.tsx` tie learning data to HR analytics.
- **Owner squad**: HR & Development.
- **Notes**: Keep supabase edge functions (learning progress history) aligned with feature contracts before pruning any hooks.
