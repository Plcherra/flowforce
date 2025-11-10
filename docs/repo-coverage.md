# Repository Coverage Checklist

Track migration of direct `supabase.from` usage into typed repositories. Mark each entry once wrapped by a feature repository and covered by tests.

## Contexts
- [ ] `src/contexts/SchedulingContext.tsx` (delete/insert on schedules, vendor_event, user_unavailability, time_off_requests)

## Components / Sections
- [ ] `src/components/availability/AvailabilityRequestForm.tsx`
- [ ] `src/components/sections/DynamicSection.tsx`

## Pages
- [ ] `src/pages/copilot/review.tsx`
- [ ] `src/pages/availability/index.tsx`

## Services (high priority)
- [ ] `src/services/inventory.ts`
- [ ] `src/services/guardrail/scheduleWorkflowService.ts`
- [ ] `src/services/cookbook.ts`
- [ ] `src/services/financialDemoData.ts`
- [ ] `src/services/learning/learningService.ts`
- [ ] `src/services/forms/formImportService.ts`

## Repositories (need validation)
- [ ] `src/repositories/tasksRepository.ts`
- [ ] `src/repositories/taskNotificationsRepository.ts`
- [ ] `src/repositories/certificationsRepository.ts`
- [ ] `src/repositories/messagesRepository.ts`
- [ ] `src/repositories/formsRepository.ts`
- [ ] `src/repositories/performanceRepository.ts`
- [ ] `src/repositories/remindersRepository.ts`

## Hooks / Features
- [ ] `src/features/messages/hooks/*`
- [ ] `src/features/company-updates/*`
- [ ] `src/features/learning/*`

## Supabase Edge Functions
- [ ] `supabase/functions/*`

_Update this checklist as each location migrates to a typed repository._
