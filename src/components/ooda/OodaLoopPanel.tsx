import { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { CalendarRange, CheckCircle2, Compass, Crosshair, Loader2, Map, Sparkles } from 'lucide-react';
import { useOodaInsights, type OodaRange, type OodaRangeType, persistOodaCycle } from '@/hooks/useOodaInsights';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

const RANGE_OPTIONS: Array<{ label: string; type: OodaRangeType }> = [
  { label: 'Day', type: 'day' },
  { label: 'Week', type: 'week' },
  { label: 'Month', type: 'month' },
  { label: 'Custom', type: 'custom' },
];

function formatDateTimeLocal(date: Date) {
  const pad = (value: number) => value.toString().padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function OodaLoopPanel() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [range, setRange] = useState<OodaRange>({ type: 'week' });
  const [customStart, setCustomStart] = useState<string | null>(null);
  const [customEnd, setCustomEnd] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const queryRange = useMemo(() => {
    if (range.type !== 'custom') return range;
    return {
      type: 'custom' as const,
      customStart: customStart ? new Date(customStart) : undefined,
      customEnd: customEnd ? new Date(customEnd) : undefined,
    } satisfies OodaRange;
  }, [range, customStart, customEnd]);

  const { data, isLoading, refetch } = useOodaInsights(queryRange);

  const handleSaveCycle = async () => {
    if (!user || !data) return;
    setSaving(true);
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (!profile?.company_id) {
        throw new Error('No company associated with current profile.');
      }

      await persistOodaCycle({
        company_id: profile.company_id,
        period: range.type === 'day' ? 'daily' : range.type === 'week' ? 'weekly' : range.type === 'month' ? 'monthly' : 'daily',
        start_at: data.range.start,
        end_at: data.range.end,
        status: 'open',
        owner_id: user.id,
        context: {
          orientation: data.orientation,
          decisions: data.decisions,
          actions: data.actions,
        },
      });

      toast({
        title: 'OODA cycle saved',
        description: 'The current analysis has been captured for future reference.',
      });
    } catch (error) {
      console.error('Failed to persist OODA cycle', error);
      toast({
        title: 'Unable to save OODA cycle',
        description: error instanceof Error ? error.message : 'Unexpected error occurred.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="mt-4">
      <CardHeader className="space-y-4">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-xl font-semibold">
              <Crosshair className="h-5 w-5 text-primary" />
              OODA Operations Snapshot
            </CardTitle>
            <CardDescription>
              Observe, orient, decide, and act based on the latest form activity and incident signals.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {RANGE_OPTIONS.map((option) => (
              <Button
                key={option.type}
                variant={range.type === option.type ? 'default' : 'outline'}
                size="sm"
                onClick={() => setRange({ type: option.type })}
              >
                {option.label}
              </Button>
            ))}
            <Button variant="outline" size="sm" onClick={() => refetch()} className="flex items-center gap-1">
              <Loader2 className="h-4 w-4" />
              Refresh
            </Button>
          </div>
        </div>

        {range.type === 'custom' && (
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Start</label>
              <Input
                type="datetime-local"
                value={customStart ?? formatDateTimeLocal(new Date())}
                onChange={(event) => setCustomStart(event.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">End</label>
              <Input
                type="datetime-local"
                value={customEnd ?? formatDateTimeLocal(new Date())}
                onChange={(event) => setCustomEnd(event.target.value)}
              />
            </div>
          </div>
        )}

        {data && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CalendarRange className="h-4 w-4" />
            {data.windowLabel}
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-6">
        {isLoading && (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Crunching signal from forms and events…
          </div>
        )}

        {!isLoading && data && (
          <div className="space-y-6">
            <section>
              <header className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Crosshair className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold tracking-wide">Observe</h3>
                </div>
                <Badge variant="outline">Highlights</Badge>
              </header>
              <div className="grid gap-3 md:grid-cols-3">
                {data.observations.highlights.map((highlight) => (
                  <Card key={highlight.label}>
                    <CardContent className="space-y-1 p-4">
                      <p className="text-xs uppercase text-muted-foreground">{highlight.label}</p>
                      <p className="text-2xl font-semibold">{highlight.value}</p>
                      {highlight.helperText && <p className="text-xs text-muted-foreground">{highlight.helperText}</p>}
                    </CardContent>
                  </Card>
                ))}
              </div>
              {data.observations.formsSample.length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-xs font-medium uppercase text-muted-foreground">Recent entries</p>
                  <div className="space-y-2">
                    {data.observations.formsSample.map((sample) => (
                      <div key={sample.id} className="rounded-md border bg-muted/30 p-3 text-sm">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium text-foreground">{sample.title}</span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(sample.submittedAt).toLocaleString()}
                          </span>
                        </div>
                        <p className="mt-1 text-muted-foreground text-xs leading-relaxed">{sample.summary}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>

            <Separator />

            <section>
              <header className="mb-3 flex items-center gap-2">
                <Compass className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold tracking-wide">Orient</h3>
              </header>
              <div className="grid gap-4 md:grid-cols-[1fr_220px]">
                <Card>
                  <CardContent className="space-y-3 p-4">
                    <p className="text-sm text-muted-foreground leading-relaxed">{data.orientation.summary}</p>
                    {data.orientation.dominantThemes.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {data.orientation.dominantThemes.map((theme) => (
                          <Badge key={theme} variant="secondary" className="text-xs">
                            #{theme}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
                <Card className="flex flex-col justify-between">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Risk score</CardTitle>
                    <CardDescription>{data.orientation.riskScore}/100</CardDescription>
                  </CardHeader>
                  <CardContent className="pb-4">
                    <Progress value={data.orientation.riskScore} />
                    <p className="mt-2 text-xs text-muted-foreground">
                      Higher score indicates more urgent attention needed.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </section>

            <Separator />

            <section>
              <header className="mb-3 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold tracking-wide">Decide</h3>
              </header>
              <div className="space-y-3">
                {data.decisions.map((decision) => (
                  <Card key={decision.title}>
                    <CardContent className="flex flex-col gap-2 p-4 md:flex-row md:items-start md:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-foreground">{decision.title}</p>
                        <p className="text-sm text-muted-foreground leading-relaxed">{decision.description}</p>
                      </div>
                      <Badge variant="outline" className="self-start uppercase text-xs">
                        {decision.priority}
                      </Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>

            <Separator />

            <section>
              <header className="mb-3 flex items-center gap-2">
                <Map className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold tracking-wide">Act</h3>
              </header>
              <div className="space-y-3">
                {data.actions.map((action) => (
                  <Card key={action.title}>
                    <CardContent className="flex flex-col gap-2 p-4 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-foreground">{action.title}</p>
                        <p className="text-sm text-muted-foreground leading-relaxed">{action.description}</p>
                        {action.dueDate && (
                          <p className="mt-1 text-xs text-muted-foreground">
                            Due {new Date(action.dueDate).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      <Badge variant="secondary" className="self-start uppercase text-xs">
                        {action.priority}
                      </Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>

            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <p className="text-xs text-muted-foreground">
                Save this summary as an OODA cycle to revisit decisions and actions during retrospectives.
              </p>
              <Button onClick={handleSaveCycle} disabled={saving || !data} className="flex items-center gap-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                Save OODA cycle
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
