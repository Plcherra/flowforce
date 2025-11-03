# Refactor Tasks Progress

| Task ID | Status | Notes |
| --- | --- | --- |
| R01 | Completed | Scoped `clearWeek` deletes to the active company and added guard coverage. |
| R02 | Completed | Hardened the tasks hook with tenant filters and regression tests. |
| R05 | Completed | Memoised the forms fetcher, moved reads to React Query, and added coverage for the paginated latest submission. |
| R07 | Completed | Restricted admin enrollment fetch to the active company and blocked non-admin access. |
| R24 | Completed | Delegated weekly report summarization to a Supabase function. |
| R11 | Completed | Scoped inventory item listings to the active company context. |
| R12 | Completed | Added company-aware filters to transfer queries and hook usage. |
| R13 | Completed | Normalized transaction totals in the form and added converted-unit coverage. |
| R15 | Completed | Typed the transactions hook and scoped queries to the active company. |
| R18 | Completed | Stored rejection metadata for expenses/payments and cleared approval fields on rejection. |
| R22 | Completed | Gated the AI actions feed behind company context and added regression tests. |
| R30 | Completed | Removed the stray trailing comma in Supabase notification relationships to restore type parsing. |
