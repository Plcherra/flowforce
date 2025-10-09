
# Project Scan

## Largest files (top 40 by LOC)
-  5458  src/integrations/supabase/types.ts
-  1030  src/pages/availability/manage.tsx
-   980  src/components/inventory/InventoryItemForm.tsx
-   892  src/components/scheduling/DragDropScheduleCalendar.tsx
-   873  src/components/cookbook/RecipeDetailDialog.tsx
-   843  src/components/forms/FormFillDialog.tsx
-   814  src/components/ui/sidebar.tsx
-   788  src/components/scheduling/AddShiftDialog.tsx
-   688  src/components/availability/AvailabilityRequestForm.tsx
-   685  src/components/forms/builder/FieldEditor.tsx
-   643  src/components/onboarding/BrandingCustomizer.tsx
-   595  src/pages/Employees.tsx
-   542  src/services/inventory.ts
-   531  src/contexts/SchedulingContext.tsx
-   517  src/components/onboarding/OnboardingRoleManager.tsx
-   510  src/services/scheduling/autoScheduler.ts
-   508  src/pages/CompanyUpdates.tsx
-   494  src/components/inventory/NewCountWizard.tsx
-   489  src/pages/copilot/review.tsx
-   478  src/components/scheduling/ShiftDetailsPanel.tsx
-   466  src/pages/Reports.tsx
-   459  src/components/sections/SectionConfigurationWizard.tsx
-   459  src/sections/events/index.tsx
-   449  src/components/messages/AnimatedChannelWizard.tsx
-   448  src/pages/MessagesPage.tsx
-   446  src/features/inventory/routes/Actions.tsx
-   431  src/components/reminders/CreateReminderDialog.tsx
-   421  src/components/scheduling/StaffShiftManagement.tsx
-   418  src/components/onboarding/CompanyOnboardingWizard.tsx
-   413  src/components/forms/fields/FormulaField.tsx
-   408  src/data/scheduling/locationRuleSets.ts
-   407  src/components/reports/ReportInbox.tsx
-   405  src/pages/Settings.tsx
-   403  src/components/scheduling/ComplianceMonitor.tsx
-   401  src/components/forms/CreateFormDialog.tsx
-   399  src/components/onboarding/SectionBuilder.tsx
-   395  src/components/inventory/EnhancedCountingTable.tsx
-   392  src/router/index.tsx
-   391  src/hooks/scheduling/useSchedulingConsolidated.ts
-   390  src/components/analytics/FormAnalytics.tsx

## Files ≥ 500 LOC
-  5458  src/integrations/supabase/types.ts
-  1030  src/pages/availability/manage.tsx
-   980  src/components/inventory/InventoryItemForm.tsx
-   892  src/components/scheduling/DragDropScheduleCalendar.tsx
-   873  src/components/cookbook/RecipeDetailDialog.tsx
-   843  src/components/forms/FormFillDialog.tsx
-   814  src/components/ui/sidebar.tsx
-   788  src/components/scheduling/AddShiftDialog.tsx
-   688  src/components/availability/AvailabilityRequestForm.tsx
-   685  src/components/forms/builder/FieldEditor.tsx
-   643  src/components/onboarding/BrandingCustomizer.tsx
-   595  src/pages/Employees.tsx
-   542  src/services/inventory.ts
-   531  src/contexts/SchedulingContext.tsx
-   517  src/components/onboarding/OnboardingRoleManager.tsx
-   510  src/services/scheduling/autoScheduler.ts
-   508  src/pages/CompanyUpdates.tsx

## Contexts detected


## Consolidated scheduling hook usage


## Legacy scheduling hooks still referenced


## Supabase calls (from/rpc/auth)


## Any/ts-ignore hotspots (first 200)
src/sections/AppSectionRoutes.tsx:14:        return importFn() as Promise<{ default: React.ComponentType<any> }>;
src/sections/AppSectionRoutes.tsx:38:          return importFn() as Promise<{ default: React.ComponentType<any> }>;
src/sections/registry.ts:12:const configs = import.meta.glob('./**/section.config.ts', { eager: true }) as Record<string, any>;
src/sections/registry.ts:15:  .map((mod: any) => mod.default as SectionMeta)
src/sections/registry.ts:23:  const byCat: Record<string, { name: string; href: string; icon: any }[]> = {};
src/sections/templates/TablePage.tsx:7:  rows?: Array<Record<string, any>>;
src/sections/events/index.tsx:444:      await createEvent({ title, start: new Date(start).toISOString(), end: end ? new Date(end).toISOString() : undefined, location, description, type: (type === 'meeting' ? 'meeting' : 'event') as any });
src/types/announcements.ts:7:  target_ids: any;
src/types/common.ts:1:// Common types to replace 'any' usage across the application
src/types/common.ts:7:  submission_data: any;
src/types/common.ts:26:  options?: any;
src/types/common.ts:27:  validation_rules?: any;
src/types/api.ts:1:// Strong type definitions to replace 'any' usage
src/types/api.ts:25:export interface FormSubmissionData extends Record<string, any> {}
src/types/forms.ts:121:  data: Record<string, any>;
src/types/customTemplate.ts:17:  content: any; // Flexible content based on type
src/types/auth.ts:22:  user: any; // Replace with proper user type from Supabase
src/types/auth.ts:23:  session: any; // Replace with proper session type from Supabase
src/types/auth.ts:25:  signIn: (email: string, password: string) => Promise<{ error: any | null }>;
src/types/auth.ts:26:  signUp: (email: string, password: string, firstName: string, lastName: string, metadata?: any) => Promise<{ error: any | null }>;
src/contexts/__tests__/SchedulingContext.integration.test.tsx:2:/* eslint-disable @typescript-eslint/no-explicit-any */
src/contexts/__tests__/SchedulingContext.integration.test.tsx:15:    const builder: any = {};
src/locales/en.json:93:      "subtitle": "Our streamlined setup process gets your entire organization operational faster than any other platform.",
src/config/featureFlags.ts:68:  let current: any = flags;
src/features/inventory/routes/Actions.tsx:63:        waste_type: wasteForm.waste_type as any,
src/features/inventory/routes/Actions.tsx:424:                        placeholder="Add any notes about this transfer..."
src/server/schedule/engine.ts:58:  fixes?: { label: string; payload?: any }[];
src/server/schedule/engine.ts:189:      } as any);
src/server/copilot/decision.ts:4:export type Fix = { label: string; payload?: any };
src/server/copilot/decision.ts:26: * - If any denies → deny with merged reasons/fixes.
src/server/copilot/policy-engine.ts:24:  async canScheduleShift(params: any): Promise<{ allow: boolean; reason?: string }> {
src/utils/errorHandler.ts:7:  details?: any;
src/utils/errorHandler.ts:10:export function handleError(error: any, context?: string): AppError {
src/utils/errorHandler.ts:28:export function showErrorToast(error: any, context?: string) {
src/utils/registrationHelpers.ts:144:export const getErrorMessage = (error: any): string => {
src/utils/registrationHelpers.ts:150:export const isNetworkError = (error: any): boolean => {
src/utils/registrationHelpers.ts:156:export const isAuthError = (error: any): boolean => {
src/utils/scheduleExport.ts:56:  message += '📝 Please confirm your shifts and report any conflicts immediately.';
src/utils/logger.ts:2:  debug: (...args: any[]) => {
src/utils/logger.ts:8:  info: (...args: any[]) => {
src/utils/logger.ts:12:  warn: (...args: any[]) => {
src/utils/logger.ts:16:  error: (...args: any[]) => {
src/utils/i18nHelpers.ts:45:  static pluralize(key: string, count: number, options?: any): string {
src/utils/i18nHelpers.ts:65:  static getValidationError(field: string, type: string, options?: any): string {
src/integrations/connecteam/forms.ts:57:    if (Array.isArray((data as any).data)) {
src/integrations/connecteam/forms.ts:58:      return (data as any).data as ConnecteamForm[];
src/integrations/connecteam/forms.ts:74:    if (Array.isArray((data as any).data)) {
src/integrations/connecteam/forms.ts:75:      return (data as any).data as ConnecteamFormSubmission[];
src/components/ui/async-wrapper.tsx:99:  data?: any[] | null;
src/components/ui/button.tsx:71:        {...(props as any)}
src/components/sections/UnifiedSectionsManager.tsx:46:      category: (s.category as any) || 'core',
src/components/sections/UnifiedSectionsManager.tsx:54:      category: (cs.category as any) || 'custom',
src/components/sections/UnifiedSectionsManager.tsx:78:            <Select value={category} onValueChange={(v: any) => setCategory(v)}>
src/components/sections/DynamicSection.tsx:48:  // If any of the identifying fields contains "event" (covers '/events', '/updates/events'), render EventsIndex.
src/components/sections/DynamicSection.tsx:73:function GenericSectionRenderer({ section }: { section: any }) {
src/components/sections/DynamicSection.tsx:99:    const IconComponent = (Icons as any)[section.icon];
src/components/sections/DynamicSection.tsx:172:            {section.custom_section_pages.map((page: any, index: number) => (
src/components/sections/DynamicSection.tsx:177:                      {page.icon && (Icons as any)[page.icon] ? 
src/components/sections/DynamicSection.tsx:178:                        React.createElement((Icons as any)[page.icon], { className: "h-5 w-5 text-primary" }) :
src/components/sections/DynamicSection.tsx:215:                This section doesn't have any pages or content set up yet.
src/components/sections/DynamicSection.tsx:257:        onSave={async (updates: any) => {
src/components/sections/DynamicSection.tsx:275:            const existingRoutes = new Set((existingPages || []).map((p: any) => p.route));
src/components/sections/DynamicSection.tsx:277:              .filter((p: any) => !existingRoutes.has(p.route))
src/components/sections/DynamicSection.tsx:278:              .map((p: any, idx: number) => ({
src/components/sections/SectionFilters.tsx:30:      <Tabs value={categoryFilter} onValueChange={(value: any) => onCategoryChange(value)}>
src/components/sections/SectionCard.tsx:13:  section: any;
src/components/sections/SectionConfigurationWizard.tsx:30:  section: any;
src/components/sections/SectionConfigurationWizard.tsx:33:  onSave: (updates: any) => void;
src/components/sections/SectionConfigurationWizard.tsx:71:    if (!tplId) return [] as any[];
src/components/sections/SectionConfigurationWizard.tsx:73:    return (tpl?.config?.pages || []) as any[];
src/components/sections/SectionConfigurationWizard.tsx:82:        pages: suggestedPages.map((p: any) => ({
src/components/sections/SectionConfigurationWizard.tsx:134:  const updatePage = (index: number, updates: any) => {
src/components/sections/SectionConfigurationWizard.tsx:153:    const IconComponent = (Icons as any)[iconName];
src/components/sections/SectionConfigurationWizard.tsx:209:                  {suggestedPages.map((p: any, index: number) => {
src/components/sections/SectionConfigurationWizard.tsx:210:                    const included = formData.pages.some((pg: any) => pg.route === p.route);
src/components/sections/SectionConfigurationWizard.tsx:228:                                  pages: prev.pages.filter((pg: any) => pg.route !== p.route)
src/components/sections/SectionCategoryGroup.tsx:11:  sections: any[];
src/components/sections/SectionCategoryGroup.tsx:15:  getTogglePermission: (section: any) => boolean;
src/components/sections/SectionCategoryGroup.tsx:17:  onEditSection?: (section: any) => void;
src/components/sections/SectionManager.tsx:98:  const handleCreateFromTemplate = async (template: any) => {
src/components/sections/SectionManager.tsx:151:  }, {} as Record<string, any[]>);
src/components/sections/SectionManager.tsx:179:  const getTogglePermission = (section: any) => {
src/components/sections/CreateSectionDialog.tsx:46:  onSuccess?: (section: any) => void;
src/components/sections/CreateSectionDialog.tsx:85:        category: data.category as any,
src/components/sections/CreateSectionDialog.tsx:110:    const IconComponent = (Icons as any)[iconName];
src/components/sections/EditSectionDialog.tsx:47:        category: category as any,
src/components/sections/CompanyUpdatesSection.tsx:31:  const handleEdit = (update: any) => {
src/components/sections/FileSectionsManager.tsx:41:            <Select value={category} onValueChange={(v: any) => setCategory(v)}>
src/components/RoleGuard.tsx:26:  if (permission && !can(permission as any)) {
src/components/tasks/TaskActivityFeed.tsx:185:                          {(activity.metadata as any).old_value && (activity.metadata as any).new_value && (
src/components/tasks/TaskActivityFeed.tsx:187:                              Changed from "{(activity.metadata as any).old_value}" to "{(activity.metadata as any).new_value}"
src/components/tasks/TaskActivityFeed.tsx:190:                          {(activity.metadata as any).task_title && (
src/components/tasks/TaskActivityFeed.tsx:192:                              {(activity.metadata as any).task_title}
src/components/tasks/TaskNotifications.tsx:43:  const getNotificationTitle = (notification: any) => {
src/components/tasks/TaskNotifications.tsx:78:  const handleNotificationClick = (notification: any) => {
src/components/tasks/TaskNotifications.tsx:173:                              {notification.metadata && typeof notification.metadata === 'object' && (notification.metadata as any)?.due_date && getDueDateBadge((notification.metadata as any).due_date)}
src/components/tasks/CreateTaskDialog.tsx:50:        priority: formData.priority as any,
src/components/messages/MessageInput.tsx:39:        attachments={messageAttachments as any}
src/components/messages/MessageInput.tsx:40:        onAttachmentsChange={setMessageAttachments as any}
src/components/messages/MessageInput.tsx:53:              (e.currentTarget.form as any)?.requestSubmit();
src/components/forms/FormFillDialog.tsx:79:      const fieldConfig = field.validation_rules as any;
src/components/forms/FormFillDialog.tsx:118:            shouldShow = referencedValue.some((val: any) => condition_values.includes(String(val)));
src/components/forms/FormFillDialog.tsx:125:            shouldShow = !referencedValue.some((val: any) => condition_values.includes(String(val)));
src/components/forms/FormFillDialog.tsx:236:  const parseConfig = (config: any, defaultConfig: any = {}) => {
src/components/forms/FormFieldTest.tsx:31:  const [testData, setTestData] = useState<Record<string, any>>({});
src/components/forms/FormFieldTest.tsx:33:  const handleFieldChange = (fieldId: string, value: any) => {
src/components/forms/FormFieldTest.tsx:157:              description="Upload any type of file"
src/components/forms/FormSubmissionsDialog.tsx:43:      setFields(fieldsResult.data as any);
src/components/forms/FormSubmissionsDialog.tsx:118:                  This form hasn't received any submissions yet
src/components/forms/fields/FormulaField.tsx:15:  formData?: Record<string, any>;
src/components/forms/fields/FormulaField.tsx:51:  const evaluateFormula = (expr: string, data: Record<string, any>): number | null => {
src/components/forms/fields/AudioRecordingField.tsx:163:      // Stop any currently playing audio
src/components/forms/builder/DescriptionFieldEditor.tsx:22:  rating_config?: Record<string, any>;
src/components/forms/builder/DescriptionFieldEditor.tsx:23:  scan_config?: Record<string, any>;
src/components/forms/builder/DescriptionFieldEditor.tsx:24:  media_config?: Record<string, any>;
src/components/forms/builder/FieldTypeSelector.tsx:92:  const createField = (type: any) => {
src/components/forms/builder/FieldEditor.tsx:36:  rating_config?: Record<string, any>;
src/components/forms/builder/FieldEditor.tsx:37:  scan_config?: Record<string, any>;
src/components/forms/builder/FieldEditor.tsx:38:  media_config?: Record<string, any>;
src/components/forms/builder/FieldEditor.tsx:80:  const iconMap: Record<string, any> = {
src/components/forms/builder/FieldEditor.tsx:547:                                  condition_type: value as any
src/components/forms/builder/FieldEditor.tsx:559:                                <SelectItem value="any_of">is any of</SelectItem>
src/components/goals/EditGoalDialog.tsx:43:      setRewardDetails((goal.reward_details as any)?.description || '');
src/components/goals/EditGoalDialog.tsx:168:            <Select value={rewardType} onValueChange={(value: any) => setRewardType(value)}>
src/components/goals/CreateGoalDialog.tsx:269:                <Select value={rewardType} onValueChange={(value: any) => setRewardType(value)}>
src/components/goals/GoalDetailsDialog.tsx:33:  const [linkedTasks, setLinkedTasks] = useState<any[]>([]);
src/components/goals/GoalDetailsDialog.tsx:150:      const updates: any = { progress };
src/components/scheduling/ComplianceMonitor.tsx:321:                        <Badge variant={getSeverityColor(violation.severity) as any} className="capitalize">
src/components/scheduling/calendar/CalendarToolbar.tsx:12:  weekSchedules: any[];
src/components/scheduling/calendar/CalendarToolbar.tsx:57:  weekSchedules.forEach((s: any) => {
src/components/scheduling/calendar/CalendarToolbar.tsx:61:    (s.assignments || []).forEach((a: any) => uniqueUsers.add(a.user_id));
src/components/scheduling/EmployeeSelector.tsx:14:  selectedEmployees: any[];
src/components/scheduling/SchedulingFilters.tsx:18:  filters: any;
src/components/scheduling/SchedulingFilters.tsx:19:  onFiltersChange: (filters: any) => void;
src/components/scheduling/SchedulingFilters.tsx:26:  const handleFilterChange = (key: string, value: any) => {
src/components/scheduling/WeekTemplateDialog.tsx:69:  const handleLoadTemplate = (template: any) => {
src/components/scheduling/WeekTemplateDialog.tsx:105:                          {(template.template_data as any)?.metadata?.total_shifts || 0} shifts
src/components/scheduling/add-shift/TasksTab.tsx:47:            <Select value={newTask.priority} onValueChange={(value) => setNewTask({ ...newTask, priority: value as any })}>
src/components/scheduling/SchedulingCalendar.tsx:89:            schedules={transformedSchedules as any}
src/components/scheduling/DragDropScheduleCalendar.tsx:209:        } as any);
src/components/scheduling/DragDropScheduleCalendar.tsx:306:        prevWeekSchedules.map(async (s: any) => {
src/components/scheduling/DragDropScheduleCalendar.tsx:313:            id: undefined as any,
src/components/scheduling/DragDropScheduleCalendar.tsx:317:          } as any);
src/components/scheduling/DragDropScheduleCalendar.tsx:329:        weekSchedules.map(async (s: any) => {
src/components/scheduling/DragDropScheduleCalendar.tsx:332:              s.assignments.map((assignment: any) => unassign(s.id, assignment.user_id))
src/components/scheduling/DragDropScheduleCalendar.tsx:356:        weekSchedules.map((s: any) => updateSchedule(s.id, { is_published: published } as any))
src/components/scheduling/DragDropScheduleCalendar.tsx:367:      ...weekSchedules.map((s: any) => [
src/components/scheduling/DragDropScheduleCalendar.tsx:588:                      } as any);
src/components/scheduling/DragDropScheduleCalendar.tsx:709:                <Select value={toType} onValueChange={(v) => setToType(v as any)}>
src/components/scheduling/AddShiftDialog.tsx:131:  const distinctLocations = Array.from(new Set((schedules || []).map((s: any) => s.location).filter((l: any) => !!l))) as string[];
src/components/scheduling/AddShiftDialog.tsx:148:    const items = unavailability?.filter((ua: any) => ua.user_id === userId) || [];
src/components/scheduling/AddShiftDialog.tsx:149:    // Not available if any unavailability overlaps [start, end)
src/components/scheduling/AddShiftDialog.tsx:150:    return !items.some((ua: any) => {
src/components/scheduling/AddShiftDialog.tsx:161:  const [shiftTemplates, setShiftTemplates] = useState<any[]>([]);
src/components/scheduling/AddShiftDialog.tsx:167:        const companyId = (user as any)?.user_metadata?.company_id || null;
src/components/scheduling/AddShiftDialog.tsx:184:  const applyTemplate = (tpl: any) => {
src/components/scheduling/AddShiftDialog.tsx:221:        company_id: (user as any)?.user_metadata?.company_id || null,
src/components/scheduling/AddShiftDialog.tsx:330:      breaks: [...prev.breaks, newBreak as any]
src/components/scheduling/EnhancedCalendarView.tsx:122:                    onClick={() => setCurrentView(view as any)}
src/components/auth/RegistrationErrorHandler.tsx:71:        return 'Please review the highlighted fields and correct any errors.';
src/components/RoleManager.tsx:30:        .update({ role: newRole as any })
src/components/RoleManager.tsx:71:    const legacyIcons: Record<string, any> = {
src/components/admin/UserManagement.tsx:48:        .update({ role: newRole as any })
src/components/admin/UserManagement.tsx:104:    const legacyIcons: Record<string, any> = {
src/components/admin/AuditLog.tsx:45:  const formatRoleChange = (oldValues: any, newValues: any) => {
src/components/navigation/NavigationItem.tsx:46:      const IconComponent = (Icons as any)[item.icon];
src/components/roles/RoleConfigurationTab.tsx:27:  const handleSaveRole = async (data: any) => {
src/components/roles/SectionPermissionsTab.tsx:17:    const base: any = {};
src/components/announcements/AnnouncementBanner.tsx:74:              first_name: (profile as any).first_name || 'Unknown',
src/components/announcements/AnnouncementBanner.tsx:75:              last_name: (profile as any).last_name || 'User'
src/components/updates/steps/RecipientsStep.tsx:33:const USERS: any[] = [];
src/components/updates/steps/RecipientsStep.tsx:89:  const filteredUsers = USERS.filter((user: any) =>
src/components/updates/steps/RecipientsStep.tsx:291:                             name = USERS.find((u: any) => u.id === id)?.name || id;
src/components/updates/steps/DesignContentStep.tsx:88:                    onValueChange={(value: any) => updateFormData({ type: value })}
src/components/updates/steps/DesignContentStep.tsx:106:                    onValueChange={(value: any) => updateFormData({ priority: value })}
src/components/updates/steps/DesignContentStep.tsx:213:                          onClick={() => updateBackgroundStyle({ pattern: pattern.id as any })}
src/components/permissions/PermissionButton.tsx:85:  strategy?: 'any' | 'all';
src/components/permissions/PermissionButton.tsx:94:  strategy = 'any',
src/components/permissions/PermissionButton.tsx:113:  const hasPermission = strategy === 'any' 
src/components/permissions/withPermission.tsx:15:  fallback?: React.ComponentType<any> | React.ReactElement | null;
src/components/permissions/withPermission.tsx:17:  loadingComponent?: React.ComponentType<any> | React.ReactElement;
src/components/permissions/withPermission.tsx:46:        const LoadingComponent = loadingComponent as ComponentType<any>;
src/components/permissions/withPermission.tsx:61:        const FallbackComponent = fallback as ComponentType<any>;
src/components/permissions/withPermission.tsx:118:  strategy?: 'any' | 'all';
src/components/permissions/withPermission.tsx:125:  strategy = 'any', 
src/components/permissions/withPermission.tsx:133:  const hasPermission = strategy === 'any' 
src/components/dashboard/CreateUpdateDialog.tsx:94:              <Select value={formData.type} onValueChange={(value: any) => setFormData({ ...formData, type: value })}>
src/components/dashboard/CreateUpdateDialog.tsx:109:              <Select value={formData.priority} onValueChange={(value: any) => setFormData({ ...formData, priority: value })}>
src/components/profile/AccountDeletionDialog.tsx:22:  deletionStats: any;
src/components/profile/AccountDeletionVerification.tsx:130:    } catch (error: any) {
src/components/ai/AIAssistant.tsx:58:Would you like me to help implement any of these improvements?`;
src/components/ai/AIAssistant.tsx:78:        return 'I don\'t see any submission data yet. Once you have submissions, I can provide detailed analytics and insights about your form performance.';
src/components/ai/PerformanceRadarChart.tsx:46:  const CustomTooltip = ({ active, payload, label }: any) => {
src/components/ai/PerformanceRadarChart.tsx:48:      const actual = payload.find((p: any) => p.dataKey === 'actual')?.value;
src/components/ai/PerformanceRadarChart.tsx:49:      const target = payload.find((p: any) => p.dataKey === 'target')?.value;
src/components/ai/AIInsightsPanel.tsx:62:    // Clear any existing interval
src/components/examples/PermissionExamples.tsx:21:  const canViewOrEdit = useCanMultiple(['viewTeamProfiles', 'editTeamProfiles'], 'any');
src/components/examples/PermissionExamples.tsx:112:              strategy="any"
src/components/examples/PermissionExamples.tsx:152:            strategy="any"
src/components/examples/PermissionExamples.tsx:204:                    {getSource(permission as any)}

