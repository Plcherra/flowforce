create or replace function public.product_level_allowed_permissions(level text)
returns jsonb
language plpgsql
immutable
as $$
begin
  if level = 'owner' then
    return null;
  end if;

  if level = 'admin' then
    return jsonb_build_array(
      'viewOwnProfile', 'editOwnProfile', 'viewTeamProfiles', 'editTeamProfiles',
      'viewOwnSchedules', 'viewTeamSchedules', 'editSchedules',
      'schedule.view', 'schedule.edit', 'schedule.create', 'schedule.delete',
      'viewOwnTasks', 'viewTeamTasks', 'editTasks',
      'viewOwnExpenses', 'viewTeamExpenses', 'approveExpenses', 'approveTimeOff',
      'manageUsers', 'systemSettings', 'createForms', 'manageForms', 'approveFormSubmissions',
      'managePositions', 'viewAIInsights', 'ai.insights.view', 'ai.actions.suggest',
      'ai.actions.approve', 'ai.actions.automate', 'ai.audit.view', 'ai.governance.manage',
      'manageInventory', 'managePayments', 'directory.view', 'directory.manage',
      'inventory.view', 'inventory.create', 'inventory.edit', 'inventory.delete',
      'inventory.adjust', 'inventory.import', 'inventory.export',
      'inventory.purchasing.view', 'inventory.purchasing.manage',
      'inventory.counts.view', 'inventory.counts.create', 'inventory.counts.edit',
      'inventory.counts.approve', 'inventory.waste.view', 'inventory.waste.create',
      'inventory.prep.view', 'inventory.prep.edit',
      'reports.view', 'reports.export', 'billing.view',
      'admin.roles', 'admin.permissions', 'admin.settings'
    );
  end if;

  if level = 'manager' then
    return jsonb_build_array(
      'viewOwnProfile', 'editOwnProfile', 'viewTeamProfiles', 'editTeamProfiles',
      'viewOwnSchedules', 'viewTeamSchedules', 'editSchedules',
      'schedule.view', 'schedule.edit', 'schedule.create',
      'viewOwnTasks', 'viewTeamTasks', 'editTasks',
      'viewOwnExpenses', 'viewTeamExpenses', 'approveExpenses', 'approveTimeOff',
      'createForms', 'approveFormSubmissions',
      'viewAIInsights', 'ai.insights.view', 'ai.actions.suggest',
      'ai.actions.approve', 'ai.audit.view',
      'manageInventory', 'directory.view',
      'inventory.view', 'inventory.create', 'inventory.edit', 'inventory.adjust',
      'inventory.purchasing.view',
      'inventory.counts.view', 'inventory.counts.create', 'inventory.counts.edit',
      'inventory.counts.approve', 'inventory.waste.view', 'inventory.waste.create',
      'inventory.prep.view', 'inventory.prep.edit',
      'reports.view'
    );
  end if;

  return jsonb_build_array(
    'viewOwnProfile',
    'editOwnProfile',
    'viewOwnSchedules',
    'viewOwnTasks',
    'viewOwnExpenses',
    'viewTeamProfiles',
    'viewTeamSchedules',
    'schedule.view',
    'viewTeamTasks',
    'directory.view'
  );
end;
$$;
