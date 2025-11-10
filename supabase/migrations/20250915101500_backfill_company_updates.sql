insert into public.company_updates (
  id,
  company_id,
  title,
  body,
  rich_content,
  update_type,
  priority,
  status,
  background_style,
  recipients,
  publishing_settings,
  assigned_employees,
  author_id,
  author_name,
  author_role,
  author_avatar,
  publish_date,
  scheduled_date,
  is_pinned,
  likes_count,
  comments_count,
  views_count,
  created_by,
  created_at,
  updated_at
)
select
  ann.id,
  ann.company_id,
  ann.title,
  ann.content,
  null,
  'announcement',
  case ann.priority
    when 'low' then 'low'
    when 'high' then 'high'
    when 'urgent' then 'high'
    else 'medium'
  end,
  case when ann.is_published then 'published' else 'draft' end,
  null,
  jsonb_build_object(
    'type',
    case ann.target_audience
      when 'department' then 'departments'
      when 'role' then 'roles'
      when 'specific' then 'individuals'
      else 'all'
    end,
    'targets',
    coalesce(ann.target_ids, '[]'::jsonb)
  ),
  jsonb_build_object(
    'publishNow', ann.is_published,
    'notifications', jsonb_build_object(
      'email', true,
      'push', false,
      'inApp', true,
      'reminders', false
    ),
    'engagement', jsonb_build_object(
      'allowLikes', true,
      'allowComments', true,
      'allowSharing', false,
      'requireConfirmation', false,
      'showAsPopup', false
    ),
    'authorAttribution', true,
    'authorName', nullif(trim(coalesce(prof.first_name, '') || ' ' || coalesce(prof.last_name, '')), '')
  ),
  '[]'::jsonb,
  prof.id,
  coalesce(
    nullif(trim(coalesce(prof.first_name, '') || ' ' || coalesce(prof.last_name, '')), ''),
    'Company Updates'
  ),
  prof.role,
  prof.avatar_url,
  ann.created_at,
  case when ann.is_published then null else ann.created_at end,
  false,
  0,
  0,
  0,
  prof.id,
  ann.created_at,
  ann.updated_at
from public.announcements ann
left join public.profiles prof
  on prof.id = ann.created_by
where not exists (
  select 1
  from public.company_updates existing
  where existing.id = ann.id
);
