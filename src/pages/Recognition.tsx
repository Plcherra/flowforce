import { useEffect, useMemo, useState } from 'react';
import { formatDistanceToNow, subDays } from 'date-fns';
import { Loader2, RefreshCw, Sparkles, Filter, Plus } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useRecognitions } from '@/hooks/useRecognitions';
import { useEmployees } from '@/hooks/useEmployees';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useLeaderboardInsightsStore } from '@/stores/useLeaderboardInsights';
import type { RecognitionRecord, RecognitionSourceType } from '@/types/recognition';
import { recognitionSourceMeta } from '@/lib/recognitionMeta';

type RecognitionFilterKey = 'all' | 'goals' | 'tasks' | 'training' | 'manual';

const FILTER_CONFIG: Array<{ key: RecognitionFilterKey; label: string; sources?: RecognitionSourceType[] }> = [
  { key: 'all', label: 'All' },
  { key: 'goals', label: 'Goals & Milestones', sources: ['goal_milestone', 'goal_completion'] },
  { key: 'tasks', label: 'Tasks', sources: ['task_completion'] },
  { key: 'training', label: 'Training & Onboarding', sources: ['training_completion', 'onboarding_completion'] },
  { key: 'manual', label: 'Manual', sources: ['manual'] },
];

const TIMELINE_OPTIONS: Array<{ value: '30' | '90' | '365' | 'all'; label: string }> = [
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
  { value: '365', label: 'Last 12 months' },
  { value: 'all', label: 'All time' },
];

const LEADERBOARD_TIER_BADGE: Record<string, string> = {
  Bronze: 'bg-amber-900/15 text-amber-900 border-amber-900/40',
  Silver: 'bg-slate-200 text-slate-700 border-slate-300',
  Gold: 'bg-amber-400/20 text-amber-700 border-amber-500/30',
  Platinum: 'bg-indigo-100 text-indigo-700 border-indigo-300',
};

function formatAwardRule(code: string) {
  return code
    .split('_')
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase())
    .join(' ');
}

type ManualRecognitionForm = {
  userId: string;
  message: string;
  source: RecognitionSourceType;
  xpAwarded?: number | null;
};

function ManualRecognitionDialog({
  open,
  onOpenChange,
  onSubmit,
  submitting,
  employees,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (form: ManualRecognitionForm) => Promise<void>;
  submitting: boolean;
  employees: { id: string; first_name: string; last_name: string; avatar_url?: string }[];
}) {
  const [form, setForm] = useState<ManualRecognitionForm>({
    userId: '',
    message: '',
    source: 'manual',
    xpAwarded: null,
  });

  useEffect(() => {
    if (!open) {
      setForm({ userId: '', message: '', source: 'manual', xpAwarded: null });
    }
  }, [open]);

  const resetAndClose = () => {
    onOpenChange(false);
    setForm({ userId: '', message: '', source: 'manual', xpAwarded: null });
  };

  const handleSubmit = async () => {
    if (!form.userId || !form.message.trim()) {
      return;
    }
    await onSubmit(form);
    resetAndClose();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Give Recognition</DialogTitle>
          <DialogDescription>Celebrate a teammate&apos;s contribution with a recognition highlight.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="recognition-employee">Employee</Label>
            <Select
              value={form.userId}
              onValueChange={(value) => setForm((prev) => ({ ...prev, userId: value }))}
            >
              <SelectTrigger id="recognition-employee">
                <SelectValue placeholder="Select team member" />
              </SelectTrigger>
              <SelectContent>
                {employees.map((employee) => (
                  <SelectItem key={employee.id} value={employee.id}>
                    {employee.first_name} {employee.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="recognition-type">Recognition Type</Label>
            <Select
              value={form.source}
              onValueChange={(value: RecognitionSourceType) =>
                setForm((prev) => ({ ...prev, source: value }))
              }
            >
              <SelectTrigger id="recognition-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manual">General Recognition</SelectItem>
                <SelectItem value="goal_milestone">Goal Milestone</SelectItem>
                <SelectItem value="task_completion">Task Completion</SelectItem>
                <SelectItem value="training_completion">Training Completion</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="recognition-message">Message</Label>
            <Textarea
              id="recognition-message"
              value={form.message}
              onChange={(event) => setForm((prev) => ({ ...prev, message: event.target.value }))}
              placeholder="Highlight the achievement and its impact..."
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="recognition-xp">XP / Bonus Points (optional)</Label>
            <Input
              id="recognition-xp"
              type="number"
              min={0}
              value={form.xpAwarded ?? ''}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  xpAwarded: event.target.value ? Number(event.target.value) : null,
                }))
              }
              placeholder="e.g. 100"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={resetAndClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!form.userId || !form.message.trim() || submitting}>
            {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Give Recognition
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RecognitionCard({ record }: { record: RecognitionRecord }) {
  const details = record.reward_details;
  const source = details?.source ?? 'manual';
  const meta = recognitionSourceMeta[source] ?? recognitionSourceMeta.manual;
  const Icon = meta.icon;
  const awardRuleLabel = record.award_rule ? formatAwardRule(record.award_rule) : null;

  const recipientInitials = record.recipient
    ? `${record.recipient.first_name?.[0] ?? ''}${record.recipient.last_name?.[0] ?? ''}`.toUpperCase()
    : '??';

  const awardedDistance = record.awarded_at
    ? formatDistanceToNow(new Date(record.awarded_at), { addSuffix: true })
    : 'recently';

  const supportingTags: string[] = [];
  if (record.goal?.title) supportingTags.push(`Goal: ${record.goal.title}`);
  if (record.milestone?.title) supportingTags.push(`Milestone: ${record.milestone.title}`);
  if (record.task?.title) supportingTags.push(`Task: ${record.task.title}`);
  if (record.training?.module?.title) supportingTags.push(`Training: ${record.training.module.title}`);
  if (awardRuleLabel) supportingTags.push(`Rule: ${awardRuleLabel}`);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className={cn('p-2 rounded-full bg-muted/60', meta.color)}>
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                {meta.label}
                <Badge className={meta.badgeColor}>{awardedDistance}</Badge>
                {awardRuleLabel && (
                  <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
                    {awardRuleLabel}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription className="mt-2">
                {details?.message || 'Great work and outstanding contribution!'}
              </CardDescription>
            </div>
          </div>
          {details?.xp_awarded ? (
            <Badge variant="secondary" className="bg-amber-100 text-amber-700 border-amber-200">
              +{details.xp_awarded} XP
            </Badge>
          ) : null}
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-center space-x-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={record.recipient?.avatar_url ?? undefined} alt={record.recipient?.first_name} />
              <AvatarFallback>{recipientInitials}</AvatarFallback>
            </Avatar>
            <div>
              <div className="font-medium">
                {record.recipient
                  ? `${record.recipient.first_name ?? ''} ${record.recipient.last_name ?? ''}`.trim()
                  : 'Team Member'}
              </div>
              <div className="text-sm text-muted-foreground">
                Recognized by{' '}
                {record.creator
                  ? `${record.creator.first_name ?? ''} ${record.creator.last_name ?? ''}`.trim()
                  : 'system automation'}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {supportingTags.map((tag) => (
              <Badge key={tag} variant="outline">
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Recognition() {
  const { recognitions, loading, syncing, error, createManualRecognition, syncAutomation } = useRecognitions();
  const { employees } = useEmployees();
  const { toast } = useToast();

  const [filter, setFilter] = useState<RecognitionFilterKey>('all');
  const [departmentFilter, setDepartmentFilter] = useState<'all' | string>('all');
  const [timelineFilter, setTimelineFilter] = useState<'30' | '90' | '365' | 'all'>('30');
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const { insights: leaderboardInsights, lastUpdated: leaderboardSyncedAt } = useLeaderboardInsightsStore((state) => ({
    insights: state.insights,
    lastUpdated: state.lastUpdated,
  }));
  const leaderboardRecognitionLeaders = useMemo(
    () =>
      leaderboardInsights
        .slice()
        .sort((a, b) => b.recognitionCount - a.recognitionCount)
        .filter((item) => item.recognitionCount > 0)
        .slice(0, 4),
    [leaderboardInsights],
  );
  const leaderboardUpdatedLabel = leaderboardSyncedAt
    ? formatDistanceToNow(new Date(leaderboardSyncedAt), { addSuffix: true })
    : null;

  const stats = useMemo(() => {
    const recognitionByType: Record<RecognitionSourceType, number> = {
      goal_milestone: 0,
      goal_completion: 0,
      task_completion: 0,
      training_completion: 0,
      onboarding_completion: 0,
      manual: 0,
    };

    recognitions.forEach((record) => {
      const type = record.reward_details?.source ?? 'manual';
      recognitionByType[type] = (recognitionByType[type] ?? 0) + 1;
    });

    const trainingCount = recognitionByType.training_completion + recognitionByType.onboarding_completion;
    const goalCount = recognitionByType.goal_milestone + recognitionByType.goal_completion;

    return {
      total: recognitions.length,
      goals: goalCount,
      tasks: recognitionByType.task_completion ?? 0,
      training: trainingCount,
      manual: recognitionByType.manual ?? 0,
    };
  }, [recognitions]);

  const departmentOptions = useMemo(() => {
    const map = new Map<string, string>();
    employees.forEach((employee) => {
      if (employee.department?.id) {
        map.set(employee.department.id, employee.department.name ?? 'Unnamed department');
      }
    });
    return Array.from(map.entries());
  }, [employees]);

  const departmentIdByUser = useMemo(() => {
    const map = new Map<string, string | null>();
    employees.forEach((employee) => {
      map.set(employee.id, employee.department_id ?? null);
    });
    return map;
  }, [employees]);

  const filteredRecognitions = useMemo(() => {
    const lowered = searchTerm.toLowerCase();
    const sourceFilter = FILTER_CONFIG.find((entry) => entry.key === filter);
    const timelineDays = timelineFilter === 'all' ? null : Number(timelineFilter);
    const timelineCutoff = timelineDays ? subDays(new Date(), timelineDays) : null;

    return recognitions.filter((record) => {
      const details = record.reward_details;
      const source = details?.source ?? 'manual';

      if (sourceFilter?.sources && !sourceFilter.sources.includes(source)) {
        return false;
      }

      if (departmentFilter !== 'all') {
        const departmentId = departmentIdByUser.get(record.user_id) ?? null;
        if (departmentId !== departmentFilter) {
          return false;
        }
      }

      if (timelineCutoff && record.awarded_at) {
        const awardedAt = new Date(record.awarded_at);
        if (Number.isNaN(awardedAt.getTime()) || awardedAt < timelineCutoff) {
          return false;
        }
      }

      if (!lowered) return true;

      const recipientName = `${record.recipient?.first_name ?? ''} ${record.recipient?.last_name ?? ''}`.toLowerCase();
      const creatorName = `${record.creator?.first_name ?? ''} ${record.creator?.last_name ?? ''}`.toLowerCase();
      const goalTitle = record.goal?.title?.toLowerCase() ?? '';
      const message = details?.message?.toLowerCase() ?? '';
      const trainingTitle = record.training?.module?.title?.toLowerCase() ?? '';

      return (
        recipientName.includes(lowered) ||
        creatorName.includes(lowered) ||
        goalTitle.includes(lowered) ||
        trainingTitle.includes(lowered) ||
        message.includes(lowered)
      );
    });
  }, [recognitions, filter, searchTerm, departmentFilter, departmentIdByUser, timelineFilter]);

  const handleCreateRecognition = async (form: ManualRecognitionForm) => {
    setCreating(true);
    try {
      await createManualRecognition({
        userId: form.userId,
        message: form.message,
        source: form.source,
        xpAwarded: form.xpAwarded,
      });
      toast({
        title: 'Recognition shared',
        description: 'Your recognition has been published to the feed.',
      });
    } catch (err) {
      console.error(err);
      toast({
        title: 'Unable to post recognition',
        description: 'Please try again or contact your administrator.',
        variant: 'destructive',
      });
    } finally {
      setCreating(false);
    }
  };

  const handleSyncAutomation = async () => {
    try {
      await syncAutomation();
      toast({
        title: 'Automation complete',
        description: 'Training completions and goal milestones have been synced.',
      });
    } catch (err) {
      console.error(err);
      toast({
        title: 'Automation failed',
        description: 'We could not run the automation sync. Please try again later.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Recognition & Achievements</h1>
          <p className="text-gray-600 mt-1">
            Celebrate accomplishments across goals, tasks, and learning milestones.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={handleSyncAutomation} disabled={syncing}>
            {syncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Run Automation
          </Button>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Give Recognition
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-5">
        <Card className="md:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Highlights</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground mt-1">All-time recognitions</p>
          </CardContent>
        </Card>
        <Card className="md:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Goal Wins</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.goals}</div>
            <p className="text-xs text-muted-foreground mt-1">Milestones & completions</p>
          </CardContent>
        </Card>
        <Card className="md:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Task Heroes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.tasks}</div>
            <p className="text-xs text-muted-foreground mt-1">Completed critical tasks</p>
          </CardContent>
        </Card>
        <Card className="md:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Training Achieved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.training}</div>
            <p className="text-xs text-muted-foreground mt-1">Learning & onboarding</p>
          </CardContent>
        </Card>
        <Card className="md:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Manual Kudos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.manual}</div>
            <p className="text-xs text-muted-foreground mt-1">Team shout-outs</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Leaderboard Recognition Boosters
            </CardTitle>
            <CardDescription>Top employees by recognition-driven XP synced from the leaderboard.</CardDescription>
          </div>
          <Badge variant="outline" className="text-xs">
            {leaderboardRecognitionLeaders.length > 0
              ? `Synced ${leaderboardUpdatedLabel ?? 'just now'}`
              : 'Awaiting leaderboard sync'}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-3">
          {leaderboardRecognitionLeaders.length === 0 ? (
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              Launch the leaderboard to capture recognition milestones and surface spotlighted teammates here.
            </div>
          ) : (
            leaderboardRecognitionLeaders.map((leader, index) => (
              <div key={`recognition-leader-${leader.employeeId}`} className="flex flex-col gap-3 rounded-md border p-3 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="h-7 w-7 rounded-full p-0 text-center text-xs font-semibold leading-7">
                    {index + 1}
                  </Badge>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-sm">{leader.name}</span>
                      <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
                        {leader.role}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={cn(
                          'text-[10px] uppercase tracking-wide',
                          LEADERBOARD_TIER_BADGE[leader.badgeTier] ?? '',
                        )}
                      >
                        {leader.badgeTier}
                      </Badge>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {leader.achievements.length > 0
                        ? leader.achievements.slice(0, 3).join(' · ')
                        : 'No recent achievements captured'}
                    </div>
                  </div>
                </div>
                <div className="text-left md:text-right">
                  <div className="text-sm font-semibold">{leader.recognitionCount} recognitions</div>
                  <div className="text-xs text-muted-foreground">{leader.xp} XP</div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Tabs value={filter} onValueChange={(value) => setFilter(value as RecognitionFilterKey)}>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <TabsList className="w-full md:w-auto">
            {FILTER_CONFIG.map((item) => (
              <TabsTrigger key={item.key} value={item.key} className="text-sm">
                {item.label}
              </TabsTrigger>
            ))}
          </TabsList>
          <div className="flex w-full flex-col gap-3 md:flex-row md:items-center md:justify-end">
            <div className="relative w-full md:w-64">
              <Filter className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search recognitions..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </div>
            <Select value={timelineFilter} onValueChange={(value) => setTimelineFilter(value as typeof timelineFilter)}>
              <SelectTrigger className="md:w-44">
                <SelectValue placeholder="Timeline" />
              </SelectTrigger>
              <SelectContent>
                {TIMELINE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger className="md:w-48">
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All departments</SelectItem>
                {departmentOptions.map(([id, name]) => (
                  <SelectItem key={id} value={id}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Tabs>
      <div className="mt-6 space-y-4">
        {loading ? (
          <div className="flex h-48 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filteredRecognitions.length === 0 ? (
          <Card className="p-10 text-center">
            <Sparkles className="mx-auto h-10 w-10 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">No recognitions yet</h3>
            <p className="text-sm text-muted-foreground mt-2">
              Run automations or give a shout-out to celebrate your first achievement.
            </p>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredRecognitions.map((record) => (
              <RecognitionCard key={record.id} record={record} />
            ))}
          </div>
        )}
        {error ? (
          <Card className="border-destructive/40 bg-destructive/10 text-destructive">
            <CardHeader>
              <CardTitle className="text-base">Unable to load recognitions</CardTitle>
              <CardDescription className="text-destructive">
                {error}. Please try refreshing or running automation again.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : null}
      </div>

      <ManualRecognitionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleCreateRecognition}
        submitting={creating}
        employees={employees}
      />
    </div>
  );
}
