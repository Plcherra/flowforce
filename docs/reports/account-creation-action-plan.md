# FlowForce Account Creation Action Plan

Status: **Complete**. Account creation has been manually verified end to end. The original signup/RLS/profile/company creation errors are resolved.

## Phase 1: Make Registration Work

Goal: A fresh onboarding signup must create exactly one `auth.users` row, one `companies` row, and one `profiles` row with the actual form data.

Original blocker, now resolved:

```text
42501: new row violates row-level security policy for table "companies"
```

This meant frontend code reached `saveCompany()`, but Supabase RLS blocked the insert. The creation flow now uses the server onboarding completion route, and manual verification confirms the account, company, and profile rows are created correctly.

### Task 1: Stop writing tenant rows directly from the browser

- [x] Replace browser-side `companies.insert()` with a server-side onboarding completion endpoint.
- [x] Replace browser-side `profiles.upsert()` with the same server-side endpoint.
- [x] Keep `supabase.auth.signUp()` in the browser because auth signup belongs there.
- [x] After signup returns `authData.user.id`, call the server endpoint with the onboarding payload.

Exact file to change:

- `src/hooks/useCompanyRegistration.tsx`

Specific code change:

- Keep this:

```ts
const { data: authData, error: signUpError } = await supabase.auth.signUp(...)
```

- Replace this section:

```ts
const companyId = await saveCompany(data, userId);
await saveProfile(data, userId, companyId);
await updateUserMetadata(data, companyId);
```

- With a call like:

```ts
const { companyId } = await completeOnboardingOnServer(data, userId);
await updateUserMetadata(data, companyId);
```

- Add a helper in the same hook:

```ts
const completeOnboardingOnServer = async (
  data: RegistrationData,
  userId: string,
) => {
  const response = await fetch("/api/onboarding/complete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userId,
      userInfo: data.userInfo,
      companyInfo: data.companyInfo,
      branding: data.branding,
      template: data.template,
      enabledSections: data.enabledSections,
      customRoles: data.customRoles,
      positions: data.positions,
    }),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result?.message || "Failed to complete onboarding.");
  }

  return result as { companyId: string };
};
```

### Task 2: Add a server route that creates company and profile atomically

- [x] Create a new API route for onboarding completion.
- [x] Use `SUPABASE_SERVICE_ROLE_KEY` only on the server.
- [x] Verify the auth user exists before creating company/profile rows.
- [x] Insert company first.
- [x] Upsert profile second with the returned `company.id`.
- [x] Return `{ companyId }` only after both writes succeed.

Exact file to create:

- `app/api/onboarding/complete/route.ts`

Specific implementation requirements:

- Import server Supabase client directly from `@supabase/supabase-js`.
- Use:

```ts
process.env.NEXT_PUBLIC_SUPABASE_URL;
process.env.SUPABASE_SERVICE_ROLE_KEY;
```

- Validate required payload fields:

```ts
userId;
userInfo.email;
userInfo.firstName;
userInfo.lastName;
companyInfo.name;
companyInfo.industry;
companyInfo.size;
```

- Verify the user:

```ts
const { data: userResult, error: userError } =
  await supabaseAdmin.auth.admin.getUserById(userId);
```

- Reject if:

```ts
userError;
!userResult.user;
userResult.user.email !== userInfo.email.toLowerCase();
```

- Insert into `companies`:

```ts
const { data: company, error: companyError } = await supabaseAdmin
  .from("companies")
  .insert({
    name: companyInfo.name.trim(),
    slug,
    website,
    phone: companyInfo.phone || null,
    industry: companyInfo.industry || null,
    size: companyInfo.size || null,
    description: companyInfo.description || null,
    logo_url: null,
    primary_color: branding.primaryColor,
    secondary_color: branding.secondaryColor,
    template_id: null,
    template_name: template.name,
    enabled_sections: enabledSections,
    template_config: {
      templateId: template.id,
      templateName: template.name,
      industry: template.industry,
      defaultRoles: template.defaultRoles,
      customFields: template.customFields,
      suggestedPositions: template.suggestedPositions,
    },
    custom_roles: transformedRoles,
    positions: transformedPositions,
    registration_complete: true,
    created_by: userId,
    owner_id: userId,
  })
  .select("id")
  .single();
```

- Upsert into `profiles`:

```ts
const { error: profileError } = await supabaseAdmin.from("profiles").upsert(
  {
    id: userId,
    company_id: company.id,
    first_name: userInfo.firstName.trim(),
    last_name: userInfo.lastName.trim(),
    email: userInfo.email.trim().toLowerCase(),
    role: "owner",
    phone: userInfo.phone || null,
    is_company_admin: true,
    employment_status: "active",
  },
  { onConflict: "id" },
);
```

### Task 3: Make company slug creation safe

- [x] Move slug creation into the server route.
- [x] Add a short random suffix so duplicate company names do not fail on `companies.slug`.

Exact file to change:

- `app/api/onboarding/complete/route.ts`

Specific code:

```ts
const createCompanySlug = (companyName: string) => {
  const base =
    companyName
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "company";

  return `${base}-${crypto.randomUUID().slice(0, 8)}`;
};
```

### Task 4: Improve registration error visibility

- [x] Preserve the real backend error message in development.
- [x] Keep user-friendly messaging in production.

Exact file to change:

- `src/hooks/useCompanyRegistration.tsx`

Specific code change:

- In `handleRegistrationError()`, add a branch for RLS/service errors:

```ts
if (message.includes("row-level security") || message.includes("42501")) {
  return {
    type: "database",
    message:
      process.env.NODE_ENV === "development"
        ? details || "Supabase RLS blocked onboarding setup."
        : "There was an issue setting up your company workspace.",
    details,
  };
}
```

### Task 5: Keep navigation blocked until rows are confirmed

- [x] Do not navigate to `/app/dashboard` until the API route returns `companyId`.
- [x] Do not show the “Welcome to FlowForce” toast until the server route succeeds.

Exact file to change:

- `src/hooks/useCompanyRegistration.tsx`

Specific check:

```ts
const { companyId } = await completeOnboardingOnServer(data, userId);
if (!companyId) throw new Error("Company setup did not return a company id.");
```

### Task 6: Add minimum RLS policies to source control

Status: Implemented in source control. Run `supabase db push` before manual verification.

Even with a service-role server route, the authenticated app still needs to read its own company/profile after login.

Exact file to change:

- `supabase/migrations/20260509000100_align_onboarding_schema.sql`

SQL to add:

```sql
alter table public.companies enable row level security;
alter table public.profiles enable row level security;

drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile"
on public.profiles
for select
to authenticated
using (id = auth.uid());

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists "Users can read own company" on public.companies;
create policy "Users can read own company"
on public.companies
for select
to authenticated
using (
  id in (
    select company_id
    from public.profiles
    where profiles.id = auth.uid()
  )
);
```

Do not add public client insert policies for `companies` in Phase 1. Company creation should go through the server route.

### Task 7: Confirm environment variables

- [x] Confirm `.env` includes a real service role key.
- [x] Never expose the service role key through a `NEXT_PUBLIC_` variable.

Exact files to check:

- `.env`
- `.env.example`

Required values:

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

### Task 8: Remove the noisy recovery insert path or disable it temporarily

Status: Implemented. The profile context now logs a missing profile warning instead of trying browser-side recovery inserts.

The current `ProfileContext` recovery tries to insert into `companies` from the browser and hits the same RLS failure.

Exact file to change:

- `src/contexts/ProfileContext.tsx`

Specific Phase 1 change:

- Stop calling `recoverProfileFromMetadata()` when the profile is missing.
- Return the placeholder profile and log a warning instead.
- Once the server onboarding route is working, this recovery path should not be needed during normal signup.

### Task 9: Manual verification

- [x] Delete the failed test user from Supabase Auth.
- [x] Delete any partial company/profile rows for that test email, if present.
- [x] Restart the dev server after `.env` changes.
- [x] Start from `/`.
- [x] Click the landing CTA to `/company-registration`.
- [x] Complete all onboarding steps with a fresh email.
- [x] Confirm `auth.users` has one new user.
- [x] Confirm `companies` has one row with the typed company name.
- [x] Confirm `profiles` has one row with the typed first name, last name, and personal phone.
- [x] Confirm `profiles.company_id = companies.id`.
- [x] Confirm app navigates to `/app/dashboard`.

### Task 10: Expected Done State

Phase 1 is complete only when:

- [x] Registration no longer shows `42501`.
- [x] `auth.users`, `companies`, and `profiles` all get rows.
- [x] The saved company row contains real onboarding company data.
- [x] The saved profile row contains real onboarding user data.
- [x] Dashboard loads without “Missing profile row” errors.

## Phase 2: Fix UI/UX Issues

Goal: The onboarding flow should look credible, avoid avoidable browser autofill mistakes, and show useful failure state without crashing.

### Task 1: Fix the custom-flow sidebar crash

- [x] Add a step 6 icon for the custom-template flow.
- [x] Add a fallback icon so unknown step IDs cannot crash React.

Exact file changed:

- `src/components/onboarding/StepSidebar.tsx`

### Task 2: Fix template fallback labels

- [x] Stop showing raw keys like `templates.fallback.name`.
- [x] Fall back to the real template `name` and `description` from `businessTemplates.ts`.
- [x] Add a safe fallback icon for unknown template icon names.

Exact files changed:

- `src/utils/i18nHelpers.ts`
- `src/components/templates/TemplateSelector.tsx`
- `src/components/onboarding/StepSidebar.tsx`

### Task 3: Fix onboarding input autofill behavior

- [x] Give personal fields specific `name` and `autoComplete` values.
- [x] Split personal phone and company phone into unique IDs.
- [x] Mark phone inputs as `type="tel"` and `inputMode="tel"`.
- [x] Mark website as `type="url"` with URL autocomplete.

Exact files changed:

- `src/components/onboarding/forms/UserInfoForm.tsx`
- `src/components/onboarding/forms/CompanyInfoForm.tsx`

### Task 4: Show persistent setup failure in the wizard

- [x] Capture completion errors in wizard state.
- [x] Show a visible destructive alert below the current step.
- [x] Clear the error when the user navigates to another step or retries completion.

Exact file changed:

- `src/components/onboarding/EnhancedOnboardingWizard.tsx`

### Task 5: Manual verification

- [ ] Open `/company-registration`.
- [ ] Select the custom template and continue to step 6 without hitting the error boundary.
- [ ] Confirm template cards show names like `Office & Professional Services`, not translation keys.
- [ ] Confirm personal phone no longer autofills with the email address.
- [ ] Force a failed setup and confirm the wizard shows a visible error alert.
