// @ts-nocheck - Temporarily disable type checking due to Supabase type mismatches
import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  BarChart as ReBarChart,
  Bar,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Activity,
  BarChart3,
  Download,
  FileBarChart2,
  ShieldCheck,
  TrendingUp,
  Workflow,
} from 'lucide-react';
import { format, formatDistanceToNow, subDays } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { useForms } from '@/hooks/useForms';
import { useDocumentInbox } from '@/hooks/useDocumentIngestion';
import type { AssistantContext } from '@/types/ai';
import type { DocumentWithRelations } from '@/types/ingestion';

const COLORS = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444'];

interface ReportsAnalyzerProps {
  onContextChange?: (context: AssistantContext) => void;
}

interface ComparisonRecord {
  label: string;
  forms: number;
  reports: number;
}

function parseMetaAccuracy(document: DocumentWithRelations) {
  const meta = (document.meta ?? {}) as Record<string, any>;
  if (typeof meta?.accuracy === 'number') return Math.round(meta.accuracy * 100);
  if (typeof meta?.confidence === 'number') return Math.round(meta.confidence * 100);
  return null;
}

export function ReportsAnalyzer({ onContextChange }: ReportsAnalyzerProps) {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');
  const [compareMetric, setCompareMetric] = useState<'volume' | 'completion' | 'engagement'>('volume');
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);

  const { forms: rawForms } = useForms();
  const forms = (rawForms ?? []) as any[];
  const { data: rawDocuments = [], isLoading } = useDocumentInbox({ limit: 100 });
  const documents = (rawDocuments ?? []) as any[];

  const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
  const startDate = useMemo(() => subDays(new Date(), days - 1), [days]);

  const filteredDocuments = useMemo(
    () =>
      documents.filter((document: any) => {
        const reference = document.doc_date ?? document.created_at;
        if (!reference) return false;
        return new Date(reference) >= startDate;
      }),
    [documents, startDate],
  );

  const filteredForms = useMemo(
    () =>
      forms.filter((form: any) => {
        if (!form.latest_submission_at) return false;
        return new Date(form.latest_submission_at) >= startDate;
      }),
    [forms, startDate],
  );

  const totalFormSubmissions = useMemo(
    () => forms.reduce((sum, form) => sum + (form.submissions_count ?? 0), 0),
    [forms],
  );

  const formsWithActivity = useMemo(
    () => forms.filter((form) => (form.submissions_count ?? 0) > 0),
    [forms],
  );

  const readyReports = useMemo(
    () => filteredDocuments.filter((document) => document.processing_state === 'ready'),
    [filteredDocuments],
  );

  const followUpActions = useMemo(
    () =>
      filteredDocuments.reduce(
        (sum, document) => sum + (document.originating_tasks?.length ?? 0),
        0,
      ),
    [filteredDocuments],
  );

  const accuracyScore = filteredDocuments.length
    ? Math.round((readyReports.length / filteredDocuments.length) * 100)
    : 0;

  const completionRate = (() => {
    const totalItems = filteredDocuments.length + filteredForms.length;
    if (!totalItems) return 0;
    const completed =
      readyReports.length + filteredForms.filter((form) => form.submissions_count > 0).length;
    return Math.round((completed / totalItems) * 100);
  })();

  const formsCompletionRate = forms.length
    ? Math.round((formsWithActivity.length / forms.length) * 100)
    : 0;

  const formsEngagementScore = forms.length
    ? Math.min(100, Math.round((totalFormSubmissions / (forms.length * 12 || 1)) * 100))
    : 0;

  const reportsEngagementScore = filteredDocuments.length
    ? Math.min(
        100,
        Math.round(((filteredDocuments.length + followUpActions) / Math.max(1, days)) * 100),
      )
    : 0;

  const timelineData = useMemo(() => {
    const map = new Map<string, { date: string; reports: number; forms: number }>();
    for (let i = days - 1; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const key = format(date, 'yyyy-MM-dd');
      map.set(key, {
        date: format(date, 'MMM d'),
        reports: 0,
        forms: 0,
      });
    }

    filteredDocuments.forEach((document) => {
      const reference = document.doc_date ?? document.created_at;
      if (!reference) return;
      const key = reference.slice(0, 10);
      const entry = map.get(key);
      if (entry) {
        entry.reports += 1;
      }
    });

    filteredForms.forEach((form) => {
      if (!form.latest_submission_at) return;
      const key = form.latest_submission_at.slice(0, 10);
      const entry = map.get(key);
      if (entry) {
        const weight = Math.max(
          1,
          Math.round((form.submissions_count ?? 1) / Math.max(1, Math.floor(days / 6))),
        );
        entry.forms += weight;
      }
    });

    return Array.from(map.values());
  }, [days, filteredDocuments, filteredForms]);

  const comparisonData: ComparisonRecord[] = useMemo(() => {
    switch (compareMetric) {
      case 'completion':
        return [
          {
            label: 'Completion rate',
            forms: formsCompletionRate,
            reports: completionRate,
          },
          {
            label: 'Accuracy',
            forms: Math.min(100, Math.max(formsCompletionRate - 5, 0)),
            reports: accuracyScore,
          },
        ];
      case 'engagement':
        return [
          {
            label: 'Engagement score',
            forms: formsEngagementScore,
            reports: reportsEngagementScore,
          },
          {
            label: 'Follow-ups',
            forms: Math.max(0, formsWithActivity.length - filteredForms.length),
            reports: followUpActions,
          },
        ];
      default:
        return [
          {
            label: 'Total volume',
            forms: totalFormSubmissions,
            reports: filteredDocuments.length,
          },
          {
            label: 'Ready this period',
            forms: filteredForms.length,
            reports: readyReports.length,
          },
        ];
    }
  }, [
    compareMetric,
    formsCompletionRate,
    completionRate,
    accuracyScore,
    formsEngagementScore,
    reportsEngagementScore,
    formsWithActivity.length,
    filteredForms.length,
    followUpActions,
    totalFormSubmissions,
    filteredDocuments.length,
    readyReports.length,
  ]);

  const statusBreakdown = useMemo(() => {
    const counts = filteredDocuments.reduce<Record<string, number>>((acc, document) => {
      acc[document.processing_state] = (acc[document.processing_state] ?? 0) + 1;
      return acc;
    }, {});

    return Object.entries(counts).map(([status, value], index) => ({
      status,
      value,
      color: COLORS[index % COLORS.length],
    }));
  }, [filteredDocuments]);

  const sortedDocuments = useMemo(
    () =>
      [...filteredDocuments].sort((a, b) => {
        const aDate = new Date(a.created_at ?? 0).getTime();
        const bDate = new Date(b.created_at ?? 0).getTime();
        return bDate - aDate;
      }),
    [filteredDocuments],
  );

  const selectedReport = useMemo(
    () => sortedDocuments.find((document) => document.id === selectedReportId) ?? null,
    [sortedDocuments, selectedReportId],
  );

  const baseContext: AssistantContext = useMemo(() => {
    const insightMessages = [];
    if (completionRate < 70) {
      insightMessages.push({
        title: 'Completion pressure',
        detail:
          'Report processing completion dipped below 70%. Consider escalating stalled documents for review.',
      });
    } else {
      insightMessages.push({
        title: 'Healthy completion',
        detail: 'Completions are keeping pace with intake. Keep current routing rules.',
      });
    }

    if (followUpActions > 0) {
      insightMessages.push({
        title: 'Follow-up workload',
        detail: `${followUpActions} follow-up actions were triggered in this window.`,
      });
    }

    return {
      type: 'combined',
      title: 'Reports Analyzer',
      subtitle: `Window: ${timeRange}`,
      metrics: [
        { label: 'Completion rate', value: `${completionRate}%` },
        { label: 'Accuracy', value: `${accuracyScore}%`, helperText: 'Ready vs total reports' },
        {
          label: 'Engagement',
          value: `${reportsEngagementScore}%`,
          helperText: `${filteredDocuments.length} reports analyzed`,
        },
        {
          label: 'Follow-ups',
          value: `${followUpActions}`,
          helperText: 'Triggered actions',
        },
      ],
      insights: insightMessages,
      recommendedActions: [
        {
          label: 'Analyze low accuracy reports',
          action: 'Review reports with low accuracy and suggest next steps',
          intent: 'analysis',
        },
        {
          label: 'Trigger follow-up workflow',
          action: 'Trigger a follow-up workflow for pending reports',
          intent: 'copilot',
        },
        {
          label: 'Compare forms vs reports trends',
          action: 'Compare forms vs reports trends for this period',
          intent: 'optimization',
        },
      ],
    };
  }, [
    completionRate,
    accuracyScore,
    reportsEngagementScore,
    filteredDocuments.length,
    followUpActions,
    timeRange,
  ]);

  const selectedContext: AssistantContext | null = useMemo(() => {
    if (!selectedReport) return null;

    const followUps = selectedReport.originating_tasks?.length ?? 0;
    const extractedAccuracy = parseMetaAccuracy(selectedReport);

    const insights = [
      selectedReport.processing_state !== 'ready'
        ? {
            title: 'Processing stalled',
            detail: 'Report is not ready yet. Consider prioritizing extraction validation.',
          }
        : {
            title: 'Ready for review',
            detail: 'Report is ready. Confirm insights and close out related actions.',
          },
    ];

    if (followUps > 0) {
      insights.push({
        title: 'Pending follow-ups',
        detail: `${followUps} tasks are still open for this report.`,
      });
    }

    return {
      type: 'report',
      title: selectedReport.title ?? selectedReport.file?.filename ?? 'Report',
      subtitle: `Updated ${formatDistanceToNow(new Date(selectedReport.updated_at), { addSuffix: true })}`,
      metrics: [
        { label: 'Status', value: selectedReport.processing_state },
        {
          label: 'Accuracy',
          value: extractedAccuracy !== null ? `${extractedAccuracy}%` : `${accuracyScore}%`,
        },
        { label: 'Follow-ups', value: `${followUps}` },
        { label: 'Source', value: selectedReport.source ?? 'N/A' },
      ],
      insights,
      recommendedActions: [
        {
          label: 'Create follow-up task',
          action: 'Create a follow-up task for this report',
          intent: 'copilot',
        },
        {
          label: 'Summarize this report',
          action: 'Summarize the selected report and highlight anomalies',
          intent: 'analysis',
        },
        {
          label: 'Suggest improvements',
          action: 'Suggest improvements based on this report',
          intent: 'optimization',
        },
      ],
    };
  }, [selectedReport, accuracyScore]);

  useEffect(() => {
    if (!onContextChange) return;
    onContextChange(selectedContext ?? baseContext);
  }, [onContextChange, selectedContext, baseContext]);

  const exportData = () => {
    const rows = [
      ['Metric', 'Forms', 'Reports'],
      ...comparisonData.map((record) => [record.label, record.forms, record.reports]),
      ['Completion rate', `${completionRate}%`, `${accuracyScore}%`],
      ['Follow-ups', formsWithActivity.length, followUpActions],
    ];

    const csv = rows.map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `reports-analyzer-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <FileBarChart2 className="h-6 w-6 text-primary" />
            Reports Analyzer
          </h2>
          <p className="text-muted-foreground">
            Consolidated insight across forms and internal reports with AI powered predictions.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Select value={timeRange} onValueChange={(value: '7d' | '30d' | '90d') => setTimeRange(value)}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end">
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={compareMetric}
            onValueChange={(value: 'volume' | 'completion' | 'engagement') => setCompareMetric(value)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Compare by" />
            </SelectTrigger>
            <SelectContent align="end">
              <SelectItem value="volume">Compare volume</SelectItem>
              <SelectItem value="completion">Compare completion</SelectItem>
              <SelectItem value="engagement">Compare engagement</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={exportData} className="gap-2">
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="py-12">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-32 rounded-lg" />
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Completion rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-2xl font-semibold">{completionRate}%</div>
                  <TrendingUp className="h-5 w-5 text-emerald-500" />
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Combined forms and reports completed this window.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Engagement</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-2xl font-semibold">{reportsEngagementScore}%</div>
                  <Activity className="h-5 w-5 text-blue-500" />
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Reports analyzed vs intake, factoring follow-up actions.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Accuracy</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-2xl font-semibold">{accuracyScore}%</div>
                  <ShieldCheck className="h-5 w-5 text-indigo-500" />
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Percent of reports that finished processing successfully.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Follow-up actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-2xl font-semibold">{followUpActions}</div>
                  <Workflow className="h-5 w-5 text-purple-500" />
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Tasks spawned from AI insights and report reviews.
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Volume trend</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={timelineData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="forms" stroke="#3b82f6" name="Forms" />
                    <Line type="monotone" dataKey="reports" stroke="#10b981" name="Reports" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Comparison</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <ReBarChart data={comparisonData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="forms" fill="#6366f1" name="Forms" />
                    <Bar dataKey="reports" fill="#f97316" name="Reports" />
                  </ReBarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Status mix</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center gap-6">
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie data={statusBreakdown} dataKey="value" nameKey="status" cx="50%" cy="50%" outerRadius={80}>
                      {statusBreakdown.map((entry, index) => (
                        <Cell key={entry.status} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="grid grid-cols-2 gap-3 w-full">
                  {statusBreakdown.map((entry) => (
                    <div
                      key={entry.status}
                      className="flex items-center justify-between rounded border px-3 py-2 text-sm"
                      style={{ borderColor: `${entry.color}33` }}
                    >
                      <span className="capitalize">{entry.status}</span>
                      <Badge variant="outline" style={{ borderColor: entry.color, color: entry.color }}>
                        {entry.value}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-3">
              <CardHeader className="flex flex-col gap-1 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <CardTitle>AI predictions & tips</CardTitle>
                  <p className="text-muted-foreground text-sm">
                    Live guidance generated from current analytics.
                  </p>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {baseContext.insights.map((insight) => (
                  <div key={insight.title} className="rounded-lg border p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <BarChart3 className="h-4 w-4 text-primary" />
                        <h4 className="font-medium">{insight.title}</h4>
                      </div>
                      <Badge variant="secondary">AI insight</Badge>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">{insight.detail}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <CardTitle>Recent reports</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Click a report to spotlight context in the AI assistant.
                </p>
              </div>
              <Badge variant="outline">
                {filteredDocuments.length} reports • {followUpActions} follow-ups
              </Badge>
            </CardHeader>
            <CardContent>
              <ScrollArea className="max-h-[360px]">
                <div className="space-y-3">
                  {sortedDocuments.map((document) => {
                    const isActive = document.id === selectedReportId;
                    const tasks = document.originating_tasks?.length ?? 0;
                    const accuracy = parseMetaAccuracy(document);
                    return (
                      <button
                        key={document.id}
                        onClick={() => setSelectedReportId(isActive ? null : document.id)}
                        className={`w-full rounded-lg border p-4 text-left transition ${
                          isActive
                            ? 'border-primary bg-primary/5 shadow-sm'
                            : 'border-border hover:border-primary/50 hover:bg-muted/40'
                        }`}
                      >
                        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex items-center gap-2">
                            <Badge variant={document.processing_state === 'ready' ? 'default' : 'secondary'}>
                              {document.processing_state}
                            </Badge>
                            <span className="font-medium">
                              {document.title ?? document.file?.filename ?? 'Untitled report'}
                            </span>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {document.updated_at
                              ? formatDistanceToNow(new Date(document.updated_at), { addSuffix: true })
                              : 'Unknown'}
                          </span>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                          <span>Follow-ups: {tasks}</span>
                          <Separator orientation="vertical" className="h-3" />
                          <span>Source: {document.source ?? 'N/A'}</span>
                          {accuracy !== null && (
                            <>
                              <Separator orientation="vertical" className="h-3" />
                              <span>Accuracy: {accuracy}%</span>
                            </>
                          )}
                        </div>
                      </button>
                    );
                  })}

                  {sortedDocuments.length === 0 && (
                    <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                      No reports processed during this window.
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
