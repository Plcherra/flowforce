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

This project is **in active stabilization**. The dev server runs and public pages look good, but the production build and full TypeScript validation still need work. Not yet production-ready.

### Quick Start

```bash
npm install
cp .env.example .env.local
npm run dev
```

The app will be available at `http://localhost:3000`.

### Demo Path

Best pages to show:

- `http://localhost:3000` — Homepage
- `/app/dashboard` — Main dashboard (after login)
- `/app/messages` — Messaging interface
- `/app/tasks` — Task management
- `/app/enhanced-scheduling` — Scheduling view

### Known Issues

- Production build (`npm run build`) currently fails
- TypeScript checking is slow and needs optimization
- Requires valid Supabase credentials to access protected pages
- Some routes may show loading states until authentication is set up

