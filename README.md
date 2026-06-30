# FlowForce

**All-in-one business operations platform for growing teams.**

FlowForce helps small and medium businesses manage employees, scheduling, tasks, communication, and daily operations in one clean, modern platform.

<!-- Add screenshots here -->
![FlowForce dashboard](docs/screenshots/dashboard.png)

### Key Features

- **Team Management** — Employee directory, invitations & roles
- **Smart Scheduling** — Drag & drop shifts, availability, time-off
- **Real-time Messaging** — Team communication & announcements
- **Task & Goal Tracking** — Priorities, accountability & OKRs
- **Forms & Workflows** — Custom forms and process automation
- **Analytics & Insights** — Performance dashboards and reports

### Tech Stack

Next.js 16 (App Router) • TypeScript • Tailwind CSS • Supabase • React Query

### Current Status

This project is **in active stabilization**. Core validation gates pass locally:

- `npm run typecheck` — scoped app, tests, and Supabase checks
- `npm run build` — production build (use `npm run build:local` on memory-constrained machines)
- `npm run lint` — ESLint (warnings only; no blocking errors)

Protected pages and API routes require valid Supabase credentials. Full release validation uses CI release gates (`npm run check:release`).

### Quick Start

```bash
npm ci
cp .env.example .env.local   # Windows: Copy-Item .env.example .env.local
npm run dev
```

The app will be available at `http://localhost:3000`.

### Local verification

```bash
npm run verify              # typecheck + build + lint
npm run check:architecture  # architecture contract
```

For Supabase-backed checks, start local Supabase and run `npm run check:supabase`.

### Demo Path

Best pages to show:

- `http://localhost:3000` — Homepage
- `/app/dashboard` — Main dashboard (after login)
- `/app/messages` — Messaging interface
- `/app/tasks` — Task management
- `/app/enhanced-scheduling` — Scheduling view

### Known Issues

- ESLint reports many warnings (mostly `@typescript-eslint/no-explicit-any`); no blocking lint errors
- TypeScript uses relaxed null checks during migration (`strictNullChecks: false`)
- Requires valid Supabase credentials to access protected pages
- Some routes may show loading states until authentication is set up
- Prettier config is new; run `npx prettier --write app src` before enforcing format checks in CI

