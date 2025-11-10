import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CalendarIcon, Loader2, ShieldAlert } from 'lucide-react';
import { useAutoScheduler } from '@/hooks/scheduling/useAutoScheduler';
import { describeAvailableRuleSets } from '@/services/scheduling/autoScheduler';
import { addDays, format, startOfWeek } from 'date-fns';

interface AutoScheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultLocationId?: string;
  companyId?: string;
}

function formatCoverage(coverage: Record<string, { required: number; assigned: number; ratio: number }>) {
  return Object.entries(coverage)
    .map(([key, value]) => ({ key, ...value }))
    .sort((a, b) => a.key.localeCompare(b.key));
}

export function AutoScheduleDialog({ open, onOpenChange, defaultLocationId, companyId }: AutoScheduleDialogProps) {
  const [ruleSets, setRuleSets] = useState<
    Array<{ id: string; name: string; timezone: string; weeklyCoverageTemplate: number; employeeCount: number }>
  >([]);
  const [rulesLoading, setRulesLoading] = useState(false);
  const [rulesError, setRulesError] = useState<string | null>(null);
  const [locationId, setLocationId] = useState<string>(defaultLocationId ?? '');
  const defaultWeekStart = useMemo(() => startOfWeek(new Date(), { weekStartsOn: 1 }), []);
  const [weekStart, setWeekStart] = useState<string>(format(defaultWeekStart, 'yyyy-MM-dd'));

  const { autoScheduleWeek, loading, lastResult, error } = useAutoScheduler();

  useEffect(() => {
    if (!companyId) {
      setRuleSets([]);
      return;
    }
    setRulesLoading(true);
    setRulesError(null);
    describeAvailableRuleSets(companyId)
      .then((sets) => {
        setRuleSets(sets);
      })
      .catch((err) => {
        setRuleSets([]);
        setRulesError(err instanceof Error ? err.message : 'Unable to load coverage templates.');
      })
      .finally(() => {
        setRulesLoading(false);
      });
  }, [companyId]);

  useEffect(() => {
    if (locationId) return;
    if (defaultLocationId) {
      setLocationId(defaultLocationId);
      return;
    }
    if (ruleSets[0]?.id) {
      setLocationId(ruleSets[0].id);
    }
  }, [defaultLocationId, locationId, ruleSets]);

  const handleRun = async () => {
    if (!locationId || !weekStart) return;
    const parsed = new Date(weekStart);
    await autoScheduleWeek({ locationId, weekStart: parsed });
  };

  const selectedRuleSet = ruleSets.find((rule) => rule.id === locationId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Auto-schedule next week</DialogTitle>
          <DialogDescription>
            Copilot drafts a manager-only schedule using the location rule set and compliance guardrails.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Select
                value={locationId}
                onValueChange={setLocationId}
                disabled={rulesLoading || ruleSets.length === 0}
              >
                <SelectTrigger id="location">
                  <SelectValue placeholder={rulesLoading ? 'Loading locations...' : 'Select a location'} />
                </SelectTrigger>
                <SelectContent>
                  {rulesLoading ? (
                    <SelectItem value="loading" disabled>
                      Loading locations...
                    </SelectItem>
                  ) : (
                    ruleSets.map((rule) => (
                      <SelectItem key={rule.id} value={rule.id}>
                        {rule.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {rulesError && (
                <p className="text-xs text-destructive">
                  {rulesError}
                </p>
              )}
              {selectedRuleSet && !rulesError && (
                <p className="text-xs text-muted-foreground">
                  {selectedRuleSet.employeeCount} active profiles • Templates: {selectedRuleSet.weeklyCoverageTemplate}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="weekStart" className="flex items-center gap-2">
                Week starting
                <CalendarIcon className="h-4 w-4 text-muted-foreground" />
              </Label>
              <Input
                id="weekStart"
                type="date"
                value={weekStart}
                onChange={(event) => setWeekStart(event.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Draft covers {format(new Date(weekStart), 'MMM d')} – {format(addDays(new Date(weekStart), 6), 'MMM d')}.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button onClick={handleRun} disabled={loading || rulesLoading || !locationId}>
              {(loading || rulesLoading) && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? 'Generating…' : 'Run Copilot'}
            </Button>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          {lastResult && !loading && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <Badge variant="outline">Run {lastResult.runId.slice(0, 8)}</Badge>
                <Badge variant="outline">{lastResult.schedulesCreated.length} shifts drafted</Badge>
                <Badge variant={lastResult.summary.warningCounts.hard > 0 ? 'destructive' : 'secondary'}>
                  {lastResult.summary.warningCounts.hard} blockers • {lastResult.summary.warningCounts.soft} soft alerts
                </Badge>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-lg border p-4">
                  <h4 className="text-sm font-medium mb-2">Coverage by area</h4>
                  <dl className="space-y-2 text-sm">
                    {Object.entries(lastResult.summary.coverageByArea).map(([area, stats]) => (
                      <div key={area} className="flex items-center justify-between">
                        <dt className="text-muted-foreground">{area}</dt>
                        <dd>
                          {stats.assigned}/{stats.required} ({Math.round(stats.ratio * 100)}%)
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>
                <div className="rounded-lg border p-4">
                  <h4 className="text-sm font-medium mb-2">Warnings</h4>
                  <ScrollArea className="max-h-40">
                    <div className="space-y-2 text-sm">
                      {lastResult.warnings.length === 0 && (
                        <p className="text-muted-foreground">No conflicts detected.</p>
                      )}
                      {lastResult.warnings.map((warning, index) => (
                        <div
                          key={`${warning.code}-${warning.slotId ?? warning.employeeId ?? index}`}
                          className="flex items-start gap-2 rounded border border-muted-foreground/20 p-2"
                        >
                          <ShieldAlert className={`h-4 w-4 mt-0.5 ${warning.severity === 'hard' ? 'text-destructive' : 'text-amber-500'}`} />
                          <div>
                            <p className="font-medium text-sm">
                              {warning.severity === 'hard' ? 'Blocking' : 'Advisory'} • {warning.code.replace(/_/g, ' ')}
                            </p>
                            <p className="text-xs text-muted-foreground">{warning.message}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
