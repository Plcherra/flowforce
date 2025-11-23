# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/fb5a0aa8-3854-44d5-bf39-ada17945856b

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/fb5a0aa8-3854-44d5-bf39-ada17945856b) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/fb5a0aa8-3854-44d5-bf39-ada17945856b) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)

## KPI Insights data refresh

The Operations Intelligence page reads from the `kpi_insights` table. Two options exist to keep it populated:

1. **Seed baseline metrics** – running the Supabase seed (`supabase db reset`) now also loads four starter KPI rows for the demo tenant via `supabase/seeds/operations_tenant_seed.sql`.
2. **Backfill from live data** – use the new helper script to aggregate the latest schedules, tasks, and time-off data into `kpi_insights`:

```sh
SUPABASE_URL=<project-url> \
SUPABASE_SERVICE_ROLE_KEY=<service-role-key> \
npm run seed:kpi-insights
```

Optional: set `KPI_RANGE_DAYS` (defaults to 14) to change the rolling window. The script is idempotent and can be scheduled (e.g., nightly) to keep KPI cards fresh.

## Error/debug logging

Structured client and API logs now flow into the `system_logs` table in Supabase. Configure levels and ingestion via env vars (see `docs/error-debug-system.md`) and use `/api/logs` for client-side forwarding.
