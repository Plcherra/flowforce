# FlowForce Account Creation Flow Audit

Date: 2026-05-09

## Executive Summary

Account creation is currently broken in two different layers:

1. Database creation fails because Supabase Row Level Security blocks inserts into `companies`.
2. The onboarding UI can crash on the custom-template review step because `StepSidebar` tries to render an undefined icon.

The current visible database error is:

```text
42501: new row violates row-level security policy for table "companies"
```

This means the registration code is now reaching the company insert, but Supabase rejects it. That is why `auth.users` gets a new user while `companies` and `profiles` stay empty.

## Flow Map

1. Landing page CTA in `src/components/landing/HeroSection.tsx` sends users to `/company-registration`.
2. `app/company-registration/page.tsx` renders `src/screens/CompanyRegistration.tsx`.
3. `CompanyRegistration` renders `EnhancedOnboardingWizard`.
4. The wizard collects:
   - user first name, last name, email, password, personal phone
   - company name, industry, size, description, website, company phone
   - template, enabled sections, roles, positions
5. Final step calls `handleComplete()` in `EnhancedOnboardingWizard`.
6. `handleComplete()` calls `register()` from `useCompanyRegistration`.
7. `register()` validates data, then calls `createCompanyWithUser()`.
8. `createCompanyWithUser()` calls `supabase.auth.signUp()`.
9. Supabase creates `auth.users`.
10. Code attempts to save `companies`.
11. Supabase rejects the insert with RLS error `42501`.
12. Because company creation fails, `profiles` never gets created.

## Confirmed Issues

### 1. RLS blocks company insert

File: `src/hooks/useCompanyRegistration.tsx`

`saveCompany()` inserts into `companies` using the browser Supabase client:

```ts
supabase.from("companies").insert(nextPayload)
```

That insert is rejected by Supabase because RLS on the remote `companies` table does not allow this client to create rows.

Impact:

- `auth.users` row is created.
- `companies` row is not created.
- `profiles` row is not created because `saveProfile()` depends on `companyId`.

This is the current primary blocker.

### 2. The local migration does not match the remote RLS state

File: `supabase/migrations/20260509000100_align_onboarding_schema.sql`

The migration creates/updates table columns, but it does not define RLS policies. The remote database clearly has RLS enabled because Supabase returns `42501`.

Impact:

- Local SQL suggests inserts should work.
- Remote Supabase blocks them.
- Debugging is confusing because schema and policies are not represented together.

### 3. Client-only onboarding cannot reliably create tenant rows with email confirmation enabled

File: `src/hooks/useCompanyRegistration.tsx`

When email confirmation is enabled, `supabase.auth.signUp()` can return a user but no active session. Without an authenticated session, the browser client cannot satisfy normal RLS policies.

Impact:

- Creating `companies` immediately after signup is fragile.
- The correct solution needs either a secure server/RPC path or a post-confirmation recovery path with proper policies.

### 4. `ProfileContext` recovery repeats the same RLS failure

File: `src/contexts/ProfileContext.tsx`

When no profile row exists, recovery tries to create the company/profile from auth metadata. This is useful in concept, but it still uses the browser Supabase client and hits the same RLS policy.

Impact:

- Recovery cannot repair a missing profile until policies or a privileged creation path exist.
- It adds noise in the console after the first failure.

### 5. `StepSidebar` crashes on step 6

File: `src/components/onboarding/StepSidebar.tsx`

`stepIcons` only defines icons for steps 1 through 5:

```ts
const stepIcons = {
  1: Building2,
  2: Settings,
  3: Users,
  4: CheckCircle,
  5: FileCheck,
};
```

The custom-template path has 6 steps. On step 6, `IconComponent` is undefined and React crashes.

Impact:

- Users can reach a blank error boundary before completing setup.
- This is separate from the Supabase insert failure.

### 6. Template names show translation fallback keys

Files:

- `src/components/templates/TemplateSelector.tsx`
- `src/utils/i18nHelpers.ts`
- `src/locales/en.json`

The UI displays strings like:

```text
templates.fallback.name
templates.fallback.description
```

That means i18n keys are missing or the fallback helper returns untranslated key names.

Impact:

- Onboarding looks unfinished and unprofessional.
- Template selection is still functional, but the UI is confusing.

### 7. Phone field appears to be browser-autofilled with email

File: `src/components/onboarding/forms/UserInfoForm.tsx`

The screenshot shows the personal phone field filled with an email address. This is likely browser autofill because fields do not have strong `name` and `autoComplete` attributes.

Impact:

- Bad data can enter `profiles.phone`.
- User trust is reduced during first setup.

### 8. Error handling hides the real database issue from the user

File: `src/hooks/useCompanyRegistration.tsx`

The toast currently says:

```text
There was an error setting up your company. Please try again.
```

But the real error is:

```text
42501: new row violates row-level security policy for table "companies"
```

Impact:

- The user sees a generic failure.
- Debugging depends on console logs.

### 9. `EnhancedOnboardingWizard` swallows completion errors

File: `src/components/onboarding/EnhancedOnboardingWizard.tsx`

`handleComplete()` catches errors and only resets loading:

```ts
catch {
  setIsCreatingAccount(false);
}
```

Impact:

- Parent-level errors are not surfaced in the wizard state.
- The toast appears, but the wizard itself has no persistent error message.

### 10. There are multiple signup paths with different behavior

Files:

- `src/screens/Auth.tsx`
- `src/hooks/useAuth.tsx`
- `src/screens/CompanyRegistration.tsx`
- `src/hooks/useCompanyRegistration.tsx`

The `/auth` signup path only creates an auth user. The `/company-registration` path tries to create auth user + company + profile.

Impact:

- Users created through `/auth` can enter the app without `companies` or `profiles`.
- Dashboard/profile loading then falls into placeholder/recovery logic.

## Recommended Fix Strategy

Do not keep fighting this entirely from the browser client. The secure, stable fix is to move tenant creation into a database/server-controlled flow.

Best option:

- Create a Supabase `security definer` RPC such as `complete_company_onboarding(...)`.
- The browser calls this RPC after signup when there is a valid session.
- The RPC inserts `companies` and `profiles` atomically.
- RLS remains enabled.

Alternative:

- Use a Next.js API route or Supabase Edge Function with the service role key.
- The function creates company/profile after verifying the user/session.

Temporary development option:

- Add explicit RLS policies that allow authenticated users to insert their own company and profile.
- Disable email confirmation during local development, or delay company/profile creation until after the email-confirmed session exists.

## Fix Checklist

### Critical Database Fixes

- [ ] Inspect remote RLS status for `companies` and `profiles`.
- [ ] Add RLS policies to source-controlled migration files, not only in Supabase Dashboard.
- [ ] Decide the canonical tenant-creation approach: RPC, Edge Function, Next API route, or client policies.
- [ ] Prefer one atomic server/RPC function that creates both `companies` and `profiles`.
- [ ] Make company/profile creation idempotent so retrying registration does not create duplicate companies.
- [ ] If email confirmation stays enabled, support post-confirmation onboarding completion.
- [ ] Remove or simplify browser-side profile recovery once the canonical creation flow works.

### Critical Frontend Fixes

- [ ] Fix `StepSidebar` icon lookup for step 6 or add a default fallback icon.
- [ ] Fix template name/description fallbacks so cards show real names, not translation keys.
- [ ] Add `name` and `autoComplete` attributes to onboarding inputs, especially phone/email/password.
- [ ] Show specific registration error messages in development instead of only a generic toast.
- [ ] Replace the empty `catch` in `EnhancedOnboardingWizard.handleComplete()` with visible error state or logging.

### Flow Cleanup

- [ ] Decide whether `/auth` signup should exist independently of company onboarding.
- [ ] If `/auth` signup remains, route users without a profile/company back to onboarding.
- [ ] Prevent dashboard access until a profile and company are linked.
- [ ] Ensure `register()` does not navigate to `/app/dashboard` until company and profile creation are confirmed.

### Verification Steps

- [ ] Start from the landing page CTA and complete onboarding with a brand-new email.
- [ ] Confirm exactly one new row appears in `auth.users`.
- [ ] Confirm exactly one new row appears in `companies`.
- [ ] Confirm exactly one new row appears in `profiles`.
- [ ] Confirm `profiles.company_id` matches `companies.id`.
- [ ] Confirm `profiles.first_name`, `profiles.last_name`, and `profiles.phone` match the form.
- [ ] Confirm `companies.name`, `companies.website`, and `companies.phone` match the form.
- [ ] Confirm refresh after signup does not show missing profile errors.
- [ ] Confirm the custom-template path reaches the final review step without crashing.

## Honest Diagnosis

The current code is close enough that the form data is being assembled correctly, but the architecture is incomplete. A multi-tenant app cannot rely on a browser-only insert into protected tenant tables unless the RLS policies are explicitly designed for that flow.

Right now, Supabase is doing the correct security behavior: it is blocking an insert that has no valid policy. The project needs a real account-creation backend path, not more frontend retries.
