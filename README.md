# FlowForce - Business Operations Platform

A comprehensive business operations platform built with Next.js, React, TypeScript, and Supabase.

## Project Overview

FlowForce is a feature-rich business operations platform that includes:

- **Messaging & Communication**: Team channels, direct messages, announcements
- **Scheduling**: Shift management, availability, time-off requests
- **Tasks & Goals**: Task management, goal tracking, OKRs
- **Analytics & Reports**: Business intelligence, KPI dashboards, report analysis
- **Inventory Management**: Purchasing, expenses, inventory tracking
- **Employee Management**: Directory, invitations, role management
- **Forms & Workflows**: Digital forms, form builder, submissions
- **Learning Center**: Course management, certifications, training
- **Performance & Recognition**: Performance tracking, recognition, leaderboards

## Project Structure

The project follows a **feature-based architecture** for better organization, maintainability, and scalability.

### Directory Structure

```
src/
├── app/                    # Next.js app router pages
├── components/             # Global/shared UI components
├── features/               # Feature-based modules (see below)
├── hooks/                  # Global hooks (auth, toast, mobile, etc.)
├── lib/                    # Core libraries and configurations
├── providers/              # React context providers
├── screens/                # Re-export shims for backward compatibility
├── services/               # Re-export shims for backward compatibility
├── shared/                 # Shared utilities across features
│   └── utils/              # Common utilities (date, currency, validation, etc.)
└── types/                  # Global TypeScript types
```

### Feature-Based Organization

Each feature is self-contained in `src/features/<feature-name>/` with the following structure:

```
src/features/<feature-name>/
├── components/             # Feature-specific UI components
│   ├── <Component>.tsx
│   └── index.ts           # Barrel export
├── hooks/                  # Feature-specific hooks
│   ├── useFeatureHook.ts
│   └── index.ts           # Barrel export
├── pages/                  # Feature page components
│   └── FeaturePage.tsx
├── services/               # Feature-specific services
│   ├── featureService.ts
│   └── index.ts           # Barrel export
├── types/                  # Feature-specific types
│   ├── featureTypes.ts
│   └── index.ts           # Barrel export
├── utils/                  # Feature-specific utilities
│   ├── featureHelpers.ts
│   └── index.ts           # Barrel export
├── contexts/               # Feature-specific contexts (if needed)
│   └── FeatureContext.tsx
├── constants/              # Feature-specific constants
│   └── featureConstants.ts
└── index.ts               # Main feature barrel export
```

### Available Features

- **`analytics`** - Analytics dashboards, KPI tiles, reports analysis
- **`calendar`** - Calendar events, meetings, vendor visits
- **`company-updates`** - Company announcements, updates feed
- **`employees`** - Employee directory, invitations, team management
- **`forms`** - Form builder, form filling, form submissions
- **`gamification`** - Leaderboards, badges, recognition
- **`goals`** - Goal management, OKRs, goal tracking
- **`inventory`** - Inventory management, purchasing, expenses
- **`learning`** - Learning center, courses, certifications
- **`messages`** - Messaging, channels, conversations
- **`performance`** - Performance tracking, reviews
- **`recognition`** - Employee recognition, badges
- **`roles`** - Role management, permissions, access control
- **`scheduling`** - Shift scheduling, availability, time-off
- **`tasks`** - Task management, task tracking

### Import Patterns

#### Feature Imports (Recommended)

```typescript
// Import from feature barrel export
import { useScheduling, SchedulingProvider } from "@/features/scheduling";
import { useTasks, TaskCard } from "@/features/tasks";
import { useEmployees, EmployeeTable } from "@/features/employees";

// Import specific items
import { useKpiMetrics } from "@/features/analytics/hooks";
import { formatCurrency } from "@/features/inventory/utils";
```

#### Shared Utilities

```typescript
// Import from shared utilities
import { formatDate, formatCurrency, validateEmail } from "@/shared/utils";
import { getErrorMessage, isNetworkError } from "@/shared/utils";
```

#### Backward Compatibility

For backward compatibility, re-export shims exist in:

- `src/screens/` → Re-exports from `src/features/*/pages/`
- `src/services/` → Re-exports from `src/features/*/services/`
- `src/hooks/` → Re-exports from `src/features/*/hooks/`
- `src/contexts/` → Re-exports from `src/features/*/contexts/`

These shims allow existing code to continue working while migrating to the new structure.

## Getting Started

### Prerequisites

- Node.js 18+ (recommended: use [nvm](https://github.com/nvm-sh/nvm))
- npm or yarn
- Supabase account and project

### Installation

```sh
# Clone the repository
git clone <YOUR_GIT_URL>
cd FlowForce

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Fill in your Supabase credentials in .env
# NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
# NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
# SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Development

```sh
# Start development server
npm run dev

# Start with Turbo (faster)
npm run dev:turbo

# Start with increased memory
npm run dev:fast
```

The application will be available at `http://localhost:3000`.

### Building for Production

```sh
# Build the application
npm run build

# Start production server
npm start
```

## Development Guidelines

### Code Organization Principles

1. **Feature-Based Structure**: All feature code lives in `src/features/<feature-name>/`
2. **Single Responsibility**: Each file should have one clear purpose
3. **Barrel Exports**: Use `index.ts` files for clean imports
4. **Shared Utilities**: Common utilities go in `src/shared/utils/`
5. **Type Safety**: Use TypeScript types defined in feature `types/` directories

### File Size Guidelines

- **Target**: ~100 lines per file (flexible: 50-150 lines)
- **Large Components**: Split into smaller sub-components
- **Complex Logic**: Extract into custom hooks or utility functions
- **Repeated Code**: Extract to shared utilities

### Adding a New Feature

1. Create feature directory: `src/features/<feature-name>/`
2. Set up subdirectories: `components/`, `hooks/`, `pages/`, `types/`, `utils/`
3. Create barrel exports: `index.ts` files in each subdirectory
4. Create main feature export: `src/features/<feature-name>/index.ts`
5. Add feature page: `src/features/<feature-name>/pages/FeaturePage.tsx`
6. Create re-export shim: `src/screens/FeaturePage.tsx` (if needed)

### Code Quality

- **Formatting**: All code is formatted with Prettier
- **Linting**: ESLint rules are enforced
- **Type Checking**: TypeScript strict mode enabled
- **Testing**: Write tests for critical functionality

```sh
# Format code
npx prettier --write "src/**/*.{ts,tsx}"

# Run linter
npm run lint

# Type check
npm run typecheck
```

## Technology Stack

- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **UI Library**: React 18+
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI, shadcn/ui
- **State Management**: React Query (TanStack Query)
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Forms**: React Hook Form
- **Date Handling**: date-fns
- **Icons**: Lucide React

## Key Features

### Messaging

- Real-time messaging channels
- Direct messages
- File attachments
- Message reactions
- Channel management

### Scheduling

- Drag-and-drop shift scheduling
- Availability management
- Time-off requests
- Vendor event scheduling
- AI-powered scheduling suggestions

### Tasks & Goals

- Task management with priorities
- Goal tracking and OKRs
- Task assignments and comments
- Due date tracking
- Task metrics and analytics

### Analytics

- KPI dashboards
- Report analysis
- Business intelligence
- AI-powered insights
- Data visualization

### Inventory

- Purchase order management
- Inventory tracking
- Expense management
- Vendor management
- Inventory reports

## Scripts

```sh
# Development
npm run dev              # Start dev server
npm run dev:turbo        # Start with Turbo
npm run dev:fast         # Start with increased memory

# Building
npm run build            # Production build
npm run build:local      # Local build with increased memory

# Quality
npm run lint             # Run ESLint
npm run lint:fix         # Fix ESLint errors
npm run typecheck        # TypeScript type checking
npm run test             # Run tests

# Utilities
npm run seed:kpi-insights    # Seed KPI insights data
npm run roster:sync          # Sync roster data
```

## Environment Variables

Required environment variables (see `.env.example`):

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Optional
CRON_SECRET=your-cron-secret
KPI_RANGE_DAYS=14
```

## Documentation

- **Architecture**: See `docs/` directory for detailed documentation
- **Error Handling**: `docs/error-debug-system.md`
- **Scheduling**: `docs/scheduling-rulebook.md`
- **System Settings**: `docs/system-settings-architecture.md`
- **Hook Migration**: `docs/hook-migration.md`

## KPI Insights Data Refresh

The Operations Intelligence page reads from the `kpi_insights` table. Two options exist to keep it populated:

1. **Seed baseline metrics** – running the Supabase seed (`supabase db reset`) now also loads four starter KPI rows for the demo tenant via `supabase/seeds/operations_tenant_seed.sql`.
2. **Backfill from live data** – use the helper script to aggregate the latest schedules, tasks, and time-off data into `kpi_insights`:

```sh
SUPABASE_URL=<project-url> \
SUPABASE_SERVICE_ROLE_KEY=<service-role-key> \
npm run seed:kpi-insights
```

Optional: set `KPI_RANGE_DAYS` (defaults to 14) to change the rolling window. The script is idempotent and can be scheduled (e.g., nightly) to keep KPI cards fresh.

## Error/Debug Logging

Structured client and API logs flow into the `system_logs` table in Supabase. Configure levels and ingestion via env vars (see `docs/error-debug-system.md`) and use `/api/logs` for client-side forwarding.

## MVP Launch Status

**Status:** Ready for MVP Launch  
**Last Updated:** January 25, 2026

### Recent Improvements

- ✅ Refactored to feature-based architecture
- ✅ Improved code organization and maintainability
- ✅ Extracted shared utilities
- ✅ Created comprehensive barrel exports
- ✅ Enhanced type safety
- ✅ Improved code quality (Prettier, ESLint, TypeScript)

### Known Issues (MVP)

#### TypeScript Errors
- **Status**: ~1922 TypeScript errors remaining (mostly Supabase type mismatches)
- **Impact**: Many are non-blocking type assertions for tables not in generated types
- **Fix**: Regenerate Supabase types from remote database (see `REGENERATE_TYPES.md`)
- **Workaround**: Type assertions (`as any`) with TODO comments are used for MVP

#### Supabase Type Mismatches
- Tables not in generated types: `availability_exception`, `availability_request`, `audit_log`
- **Fix**: Run `supabase gen types typescript --project-id wvkfhprjpegjyzktyueh > src/integrations/supabase/types.ts`
- **Note**: App can run against remote Supabase without Docker

#### Runtime Stability
- ✅ Error boundaries in place for critical features
- ✅ Loading states added across features
- ✅ Empty states present for messages, tasks, goals, reports
- ✅ Error handling with toast notifications
- ✅ Fallback data handling in scheduling

### MVP Launch Checklist

#### Code Quality
- [x] Critical TypeScript errors fixed
- [x] Runtime null checks added
- [x] Error handling improved
- [ ] All TypeScript errors resolved (many are type mismatches)
- [ ] ESLint errors resolved

#### Core Features
- [x] Messages: Error boundaries, empty states, retry logic
- [x] Forms: Validation, error handling, submission
- [x] Scheduling: Fallback handling, drag-drop errors
- [x] Analytics: Null checks, error boundaries
- [x] Availability: Error handling, loading states
- [x] Inventory: Error handling, loading states
- [x] Employees: Invite error handling

#### Testing
- [ ] Manual testing of core flows (login, messages, reports, tasks, goals, scheduling, forms)
- [ ] Network failure testing
- [ ] Invalid input testing
- [ ] Mobile responsiveness testing

#### Deployment
- [ ] Production build succeeds (`npm run build`)
- [ ] Environment variables documented
- [ ] Deployment guide created

### Troubleshooting

#### TypeScript Errors
If you see many TypeScript errors:
1. Regenerate Supabase types: `supabase gen types typescript --project-id wvkfhprjpegjyzktyueh`
2. Many errors are from missing table types - these are handled with type assertions for MVP

#### Docker Not Running
- App can use remote Supabase instance (configured in `.env`)
- Docker is only needed for local Supabase development
- See `REGENERATE_TYPES.md` for generating types from remote database

#### Build Issues
- Ensure all environment variables are set in `.env.local`
- Run `npm run typecheck` to see TypeScript errors
- Run `npm run lint` to see ESLint issues

### Testing

Before launching, please:

1. Review `MANUAL_TEST_CHECKLIST.md` and test all critical pages
2. Verify all core user flows work correctly
3. Test error scenarios (network failures, empty data, etc.)
4. Check browser console for any errors

## Support

For issues or questions, refer to:

- Error logs: Check `system_logs` table in Supabase
- Documentation: See `docs/` directory
- Error handling: See `docs/error-debug-system.md`

## Contributing

When contributing to this project:

1. Follow the feature-based structure
2. Keep files small and focused (~100 lines)
3. Use barrel exports for clean imports
4. Write TypeScript types for all data structures
5. Format code with Prettier before committing
6. Run linting and type checking before submitting PRs

## License

[Your License Here]
