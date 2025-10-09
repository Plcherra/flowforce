import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Crown,
  Loader2,
  ShieldCheck,
  Star,
  TrendingUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { PromotionStatus } from '@/types/people';
import { evaluateEmployee } from '@/copilot/rulesEngine';

interface EmployeeSummary {
  id: string;
  firstName: string;
  lastName: string;
  role: string | null;
  level: number;
  xp: number;
  suggestions?: Awaited<ReturnType<typeof evaluateEmployee>>;
}

const DEFAULT_ORG_ID = '00000000-0000-0000-0000-000000000001';

export default function CopilotReviewPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'suggestions' | 'engagement'>('suggestions');

  const employeesQuery = useQuery<EmployeeSummary[]>({
    queryKey: ['copilot-review-employees'],
    queryFn: async () => {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, role')
        .order('first_name', { ascending: true });
      if (error) throw error;

      const ids = (profiles ?? []).map((profile) => profile.id);
      if (ids.length === 0) return [];

      const { data: skillRows, error: skillError } = await supabase
        .from('skill_matrix')
        .select('employee_id, role, level, xp')
        .in('employee_id', ids);
      if (skillError) throw skillError;

      const skillMap = new Map<string, { level: number; xp: number }>();
      (skillRows ?? []).forEach((row) => {
        const existing = skillMap.get(row.employee_id);
        if (!existing || row.xp > existing.xp) {
          skillMap.set(row.employee_id, { level: row.level, xp: row.xp });
        }
      });

      return (profiles ?? []).map((profile) => ({
        id: profile.id,
        firstName: profile.first_name,
        lastName: profile.last_name,
        role: profile.role,
        level: skillMap.get(profile.id)?.level ?? 1,
        xp: skillMap.get(profile.id)?.xp ?? 0,
      }));
    },
  });

  const suggestionsQuery = useQuery({
    queryKey: ['copilot-review-suggestions', employeesQuery.data?.map((employee) => employee.id) ?? []],
    enabled: Boolean(employeesQuery.data && employeesQuery.data.length > 0),
    queryFn: async () => {
      if (!employeesQuery.data) return {} as Record<string, Awaited<ReturnType<typeof evaluateEmployee>>>;
      const entries = await Promise.all(
        employeesQuery.data.map(async (employee) => {
          const decision = await evaluateEmployee(employee.id);
          return [employee.id, decision] as const;
        }),
      );
      return Object.fromEntries(entries);
    },
  });

  const employeesWithSuggestions = useMemo(() => {
    if (!employeesQuery.data) return [];
    const decisions = suggestionsQuery.data ?? {};
    return employeesQuery.data
      .map((employee) => ({
        ...employee,
        suggestions: decisions[employee.id],
      }))
      .filter((employee) => employee.suggestions);
  }, [employeesQuery.data, suggestionsQuery.data]);

  const selectedRecord = useMemo(() => {
    if (!selectedEmployee) return null;
    return employeesWithSuggestions.find((employee) => employee.id === selectedEmployee) ?? null;
  }, [selectedEmployee, employeesWithSuggestions]);

  const approveBadgeMutation = useMutation({
    mutationFn: async (
      payload: { employeeId: string; badgeCode: string; reason: string }
    ) => {
      const { error } = await supabase.from('employee_badge').insert({
        employee_id: payload.employeeId,
        badge_code: payload.badgeCode,
        reason: payload.reason,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: 'Badge awarded',
        description: 'The employee has been awarded the badge.',
      });
      queryClient.invalidateQueries({ queryKey: ['copilot-review-suggestions'] });
    },
    onError: (error) => {
      toast({
        title: 'Unable to award badge',
        description: error instanceof Error ? error.message : 'Please try again later.',
        variant: 'destructive',
      });
    },
  });

  const applySkillMutation = useMutation({
    mutationFn: async (
      payload: { employeeId: string; role: string; deltaXP: number; levelUp?: boolean; newLevel?: number }
    ) => {
      const { data: existing, error: fetchError } = await supabase
        .from('skill_matrix')
        .select('id, xp, level')
        .eq('employee_id', payload.employeeId)
        .eq('role', payload.role)
        .maybeSingle();
      if (fetchError) throw fetchError;

      const xp = (existing?.xp ?? 0) + payload.deltaXP;
      const level = payload.levelUp && payload.newLevel ? payload.newLevel : existing?.level ?? 1;

      const upsertPayload = {
        employee_id: payload.employeeId,
        role: payload.role,
        xp,
        level,
      };

      const { error } = await supabase.from('skill_matrix').upsert(upsertPayload, {
        onConflict: 'employee_id,role',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: 'Skill updated',
        description: 'Skill matrix has been updated.',
      });
      queryClient.invalidateQueries({ queryKey: ['copilot-review-suggestions'] });
      queryClient.invalidateQueries({ queryKey: ['copilot-review-employees'] });
    },
    onError: (error) => {
      toast({
        title: 'Unable to update skill',
        description: error instanceof Error ? error.message : 'Please try again later.',
        variant: 'destructive',
      });
    },
  });

  const approvePromotionMutation = useMutation({
    mutationFn: async (
      payload: { employeeId: string; role: string; level: number; rationale: string }
    ) => {
      if (!user) throw new Error('Not signed in');
      const insertResult = await supabase.from('promotion_proposal').insert({
        employee_id: payload.employeeId,
        proposed_role: payload.role,
        proposed_level: payload.level,
        rationale: payload.rationale,
        status: 'approved' as PromotionStatus,
        decided_by: user.id,
        decided_at: new Date().toISOString(),
      });
      if (insertResult.error) throw insertResult.error;

      const auditResult = await supabase.from('audit_log').insert({
        actor_id: user.id,
        action: 'copilot.promotion.approved',
        entity: 'promotion_proposal',
        entity_id: payload.employeeId,
        meta: {
          role: payload.role,
          level: payload.level,
          rationale: payload.rationale,
        },
      });
      if (auditResult.error) throw auditResult.error;
    },
    onSuccess: () => {
      toast({
        title: 'Promotion proposal created',
        description: 'Leadership will be notified.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Unable to create promotion proposal',
        description: error instanceof Error ? error.message : 'Please try again later.',
        variant: 'destructive',
      });
    },
  });

  return (
    <div className="grid h-full grid-cols-[320px_minmax(0,1fr)]">
      <aside className="border-r bg-muted/30">
        <div className="px-4 py-3">
          <h2 className="text-lg font-semibold">Review inbox</h2>
          <p className="text-xs text-muted-foreground">
            Employees with new Copilot suggestions awaiting your review.
          </p>
        </div>
        <ScrollArea className="h-[calc(100vh-80px)]">
          <nav className="space-y-1 px-2 pb-6">
            {(employeesWithSuggestions ?? []).map((employee) => {
              const pendingBadges = employee.suggestions?.badges.length ?? 0;
              const pendingPromotion = employee.suggestions?.promotion ? 1 : 0;
              const pendingSkill = employee.suggestions?.skillUpdates.length ?? 0;
              const total = pendingBadges + pendingPromotion + pendingSkill;
              return (
                <Button
                  key={employee.id}
                  variant={selectedEmployee === employee.id ? 'secondary' : 'ghost'}
                  className="flex w-full items-center justify-between gap-2"
                  onClick={() => {
                    setSelectedEmployee(employee.id);
                    setActiveTab('suggestions');
                  }}
                >
                  <div className="flex flex-col items-start">
                    <span className="text-sm font-semibold">
                      {employee.firstName} {employee.lastName}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {employee.role ?? 'General'} · Level {employee.level}
                    </span>
                  </div>
                  <Badge variant="outline" className="ml-auto text-xs">
                    {total} items
                  </Badge>
                </Button>
              );
            })}
            {employeesWithSuggestions.length === 0 && (
              <p className="px-2 py-4 text-xs text-muted-foreground">
                No suggestions pending review.
              </p>
            )}
          </nav>
        </ScrollArea>
      </aside>

      <main className="flex flex-col">
        <header className="border-b px-6 py-4">
          {selectedRecord ? (
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-semibold">
                  {selectedRecord.firstName} {selectedRecord.lastName}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {selectedRecord.role ?? 'Team member'} · Level {selectedRecord.level}
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <TrendingUp className="h-4 w-4" /> XP {selectedRecord.xp}
                <ArrowRight className="h-4 w-4 text-muted-foreground/60" />
                <ShieldCheck className="h-4 w-4" /> Reliability metrics available
              </div>
            </div>
          ) : (
            <div className="text-muted-foreground">Select an employee to review Copilot suggestions.</div>
          )}
        </header>

        {selectedRecord ? (
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'suggestions' | 'engagement')} className="flex-1">
            <TabsList className="mx-6 mt-4">
              <TabsTrigger value="suggestions">Suggestions</TabsTrigger>
              <TabsTrigger value="engagement">Engagement</TabsTrigger>
            </TabsList>
            <TabsContent value="suggestions" className="h-full">
              <ScrollArea className="h-[calc(100vh-200px)] px-6 pb-12">
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <BadgeCheck className="h-5 w-5 text-primary" />
                        Badge suggestions
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {(selectedRecord.suggestions?.badges ?? []).length === 0 && (
                        <p className="text-sm text-muted-foreground">No badge suggestions.</p>
                      )}
                      {(selectedRecord.suggestions?.badges ?? []).map((badge) => (
                        <div key={badge.badgeCode} className="flex items-center justify-between rounded border p-3">
                          <div className="flex flex-col gap-1">
                            <span className="font-semibold">{badge.badgeCode}</span>
                            <span className="text-xs text-muted-foreground">{badge.reason}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              Confidence {Math.round(badge.confidence * 100)}%
                            </Badge>
                            <Button
                              size="sm"
                              onClick={() =>
                                approveBadgeMutation.mutate({
                                  employeeId: selectedRecord.id,
                                  badgeCode: badge.badgeCode,
                                  reason: badge.reason,
                                })
                              }
                            >
                              Approve
                            </Button>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <BarChart3 className="h-5 w-5 text-primary" />
                        Skill updates
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {(selectedRecord.suggestions?.skillUpdates ?? []).length === 0 && (
                        <p className="text-sm text-muted-foreground">No skill updates.</p>
                      )}
                      {(selectedRecord.suggestions?.skillUpdates ?? []).map((update, index) => (
                        <div key={`${update.role}-${index}`} className="flex items-center justify-between rounded border p-3">
                          <div className="flex flex-col gap-1">
                            <span className="font-semibold">
                              {update.role} · {update.deltaXP >= 0 ? '+' : ''}
                              {update.deltaXP} XP
                            </span>
                            {update.levelUp && update.newLevel && (
                              <span className="text-xs text-emerald-600">
                                Level up to {update.newLevel}
                              </span>
                            )}
                            {update.note && (
                              <span className="text-xs text-muted-foreground">{update.note}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">Skill</Badge>
                            <Button
                              size="sm"
                              onClick={() =>
                                applySkillMutation.mutate({
                                  employeeId: selectedRecord.id,
                                  role: update.role,
                                  deltaXP: update.deltaXP,
                                  levelUp: update.levelUp,
                                  newLevel: update.newLevel,
                                })
                              }
                            >
                              Apply
                            </Button>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  {selectedRecord.suggestions?.promotion && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                          <Crown className="h-5 w-5 text-primary" />
                          Promotion proposal
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex items-center justify-between rounded border p-3">
                          <div className="flex flex-col gap-1">
                            <span className="text-sm font-semibold">
                              Propose {selectedRecord.suggestions.promotion.role}
                              {' · Level '}
                              {selectedRecord.suggestions.promotion.level}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {selectedRecord.suggestions.promotion.rationale}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              Confidence {Math.round(selectedRecord.suggestions.promotion.confidence * 100)}%
                            </Badge>
                            <Button
                              size="sm"
                              onClick={() =>
                                approvePromotionMutation.mutate({
                                  employeeId: selectedRecord.id,
                                  role: selectedRecord.suggestions?.promotion?.role ?? '',
                                  level: selectedRecord.suggestions?.promotion?.level ?? 0,
                                  rationale: selectedRecord.suggestions?.promotion?.rationale ?? '',
                                })
                              }
                            >
                              Approve
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="engagement" className="h-full">
              <ScrollArea className="h-[calc(100vh-200px)] px-6 pb-12">
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Star className="h-5 w-5 text-primary" />
                        Engagement summary
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex flex-col gap-2">
                        <span className="text-sm font-semibold">
                          Current level
                        </span>
                        <div className="flex items-center gap-3">
                          <Badge variant="outline">Level {selectedRecord.level}</Badge>
                          <div className="flex-1 overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-2 rounded-full bg-primary"
                              style={{ width: `${Math.min(100, (selectedRecord.xp % 100))}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground">{selectedRecord.xp} XP</span>
                        </div>
                      </div>
                      <div>
                        <span className="text-sm font-semibold">Recent badges</span>
                        <p className="text-xs text-muted-foreground">
                          Future enhancement: show recent badge timeline and engagement metrics.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        ) : (
          <div className="flex flex-1 items-center justify-center text-muted-foreground">
            Select an employee to review suggestions.
          </div>
        )}
      </main>
    </div>
  );
}
