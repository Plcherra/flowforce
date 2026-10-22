-- Course modules live in learning_modules. The cache check must allow that table.

alter table public.content_translations
  drop constraint if exists content_translations_source_table_check;

alter table public.content_translations
  add constraint content_translations_source_table_check
  check (source_table in (
    'company_updates',
    'company_update_comments',
    'forms',
    'form_fields',
    'form_submissions',
    'tasks',
    'task_comments',
    'reminders',
    'custom_reports',
    'employee_report',
    'schedules',
    'time_off_requests',
    'announcements',
    'messages',
    'goals',
    'learning_courses',
    'learning_modules',
    'training_modules',
    'recognition_events',
    'employee_badge',
    'helpdesk_tickets',
    'ops_issues',
    'expenses',
    'vendor_visits'
  ));
