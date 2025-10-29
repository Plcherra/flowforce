
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, Users, FileText, Calendar, Download, Activity } from 'lucide-react';
import { useForms } from '@/hooks/useForms';
import { FormSubmission } from '@/types/common';
import type { AssistantContext } from '@/types/ai';

interface FormAnalyticsProps {
  formId?: string;
  onContextChange?: (context: AssistantContext | null) => void;
  onFormSelect?: (formId: string) => void;
  onSummaryChange?: (summary: {
    formId: string;
    submissionCount: number;
    completionRate: number;
    fieldData: AnalyticsData['fieldAnalysis'];
  }) => void;
}

interface AnalyticsData {
  totalSubmissions: number;
  completionRate: number;
  averageTime: number;
  topFields: { field: string; interactions: number }[];
  dailySubmissions: { date: string; submissions: number }[];
  fieldAnalysis: { field: string; completion: number; dropoff: number }[];
  deviceBreakdown: { device: string; count: number; percentage: number }[];
}

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#0088fe'];

export default function FormAnalytics({ formId, onContextChange, onFormSelect, onSummaryChange }: FormAnalyticsProps) {
  const { forms, getFormSubmissions, getFormFields } = useForms();
  const [selectedForm, setSelectedForm] = useState(formId || '');
  const [timeRange, setTimeRange] = useState('7d');
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (formId) {
      setSelectedForm(formId);
      return;
    }
    if (!selectedForm && forms.length) {
      setSelectedForm(forms[0].id);
    }
  }, [formId, forms, selectedForm]);

  useEffect(() => {
    if (selectedForm) {
      onFormSelect?.(selectedForm);
    }
  }, [selectedForm, onFormSelect]);

  useEffect(() => {
    if (selectedForm) {
      setAnalyticsData(null);
      loadAnalytics();
    } else if (onContextChange) {
      onContextChange(null);
    }
  }, [selectedForm, timeRange, onContextChange]);

  const loadAnalytics = async () => {
    if (!selectedForm) return;
    
    setLoading(true);
    try {
      const [submissionsResult, fieldsResult] = await Promise.all([
        getFormSubmissions(selectedForm),
        getFormFields(selectedForm)
      ]);

      if (!submissionsResult.error && !fieldsResult.error) {
        const submissions = submissionsResult.data || [];
        const fields = fieldsResult.data || [];

        const fieldCounts = fields.reduce<Record<string, number>>((acc, f) => {
          acc[f.id] = 0;
          return acc;
        }, {});

        submissions.forEach((s: any) => {
          const data = (s.submission_data || {}) as Record<string, any>;
          for (const f of fields) {
            const val = data[f.id];
            const hasValue = Array.isArray(val) ? val.length > 0 : (val ?? '') !== '';
            if (hasValue) fieldCounts[f.id] = (fieldCounts[f.id] || 0) + 1;
          }
        });

        const requiredFields = fields.filter((field) => field.is_required);

        const completedSubmissions = submissions.filter((submission: any) => {
          if (!requiredFields.length) return true;
          const data = (submission.submission_data || {}) as Record<string, unknown>;
          return requiredFields.every((field) => {
            const value = data[field.id];
            if (Array.isArray(value)) return value.length > 0;
            return (value ?? '') !== '';
          });
        });

        const completionRate = submissions.length > 0
          ? Math.round((completedSubmissions.length / submissions.length) * 100)
          : 0;

        const topFields = fields.slice(0, 5).map(f => ({
          field: f.label,
          interactions: fieldCounts[f.id] || 0,
        }));

        const fieldAnalysis = fields.map(f => {
          const count = fieldCounts[f.id] || 0;
          const completion = submissions.length > 0 ? Math.round((count / submissions.length) * 100) : 0;
          return { field: f.label, completion, dropoff: Math.max(0, 100 - completion) };
        });

        const breakdownCounts = { desktop: 0, mobile: 0, tablet: 0 };
        submissions.forEach((s: any) => {
          const ua = String(s.user_agent || '').toLowerCase();
          if (/ipad|tablet/.test(ua)) breakdownCounts.tablet += 1;
          else if (/mobi|iphone|android/.test(ua)) breakdownCounts.mobile += 1;
          else breakdownCounts.desktop += 1;
        });
        const totalDevices = Math.max(1, submissions.length);
        const deviceBreakdown = [
          { device: 'Desktop', count: breakdownCounts.desktop, percentage: Math.round((breakdownCounts.desktop / totalDevices) * 100) },
          { device: 'Mobile', count: breakdownCounts.mobile, percentage: Math.round((breakdownCounts.mobile / totalDevices) * 100) },
          { device: 'Tablet', count: breakdownCounts.tablet, percentage: Math.round((breakdownCounts.tablet / totalDevices) * 100) },
        ];

        const data: AnalyticsData = {
          totalSubmissions: submissions.length,
          completionRate,
          averageTime: 0,
          topFields,
          dailySubmissions: generateDailyData(submissions, timeRange),
          fieldAnalysis,
          deviceBreakdown,
        };

        setAnalyticsData(data);
      }
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateDailyData = (submissions: FormSubmission[], range: string) => {
    const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
    const counts = new Map<string, number>();
    const today = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      counts.set(key, 0);
    }
    submissions.forEach((s: any) => {
      const key = String(s.submitted_at || '').slice(0, 10);
      if (counts.has(key)) counts.set(key, (counts.get(key) || 0) + 1);
    });
    return Array.from(counts.entries()).map(([iso, count]) => ({
      date: new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      submissions: count,
    }));
  };

  const exportData = () => {
    if (!analyticsData) return;
    
    const csvData = [
      ['Metric', 'Value'],
      ['Total Submissions', analyticsData.totalSubmissions],
      ['Completion Rate', `${analyticsData.completionRate}%`],
      ['Average Time (seconds)', analyticsData.averageTime],
      ...analyticsData.topFields.map(field => [`Field: ${field.field}`, field.interactions])
    ];

    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `form-analytics-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    if (!onContextChange) return;

    if (!analyticsData || !selectedForm) {
      onContextChange(null);
      if (selectedForm) {
        onSummaryChange?.({
          formId: selectedForm,
          submissionCount: 0,
          completionRate: 0,
          fieldData: [],
        });
      }
      return;
    }

    const formMeta = forms.find((form) => form.id === selectedForm);
    if (!formMeta) {
      onContextChange(null);
      onSummaryChange?.({
        formId: selectedForm,
        submissionCount: 0,
        completionRate: 0,
        fieldData: [],
      });
      return;
    }

    const lowCompletionFields = analyticsData.fieldAnalysis.filter((field) => field.completion < 70);
    const averageFieldCompletion = analyticsData.fieldAnalysis.length
      ? Math.round(
          analyticsData.fieldAnalysis.reduce((sum, field) => sum + field.completion, 0) /
            analyticsData.fieldAnalysis.length
        )
      : analyticsData.completionRate;

    const accuracyScore = Math.min(100, Math.round((analyticsData.completionRate + averageFieldCompletion) / 2));

    const engagementDivisor = timeRange === '7d' ? 12 : timeRange === '30d' ? 45 : 90;
    const engagementScore = Math.min(
      100,
      Math.round((analyticsData.totalSubmissions / Math.max(1, engagementDivisor)) * 100)
    );

    const contextPayload: AssistantContext = {
      type: 'form',
      title: formMeta.title ?? 'Form analytics',
      subtitle: `Window: ${timeRange}`,
      metrics: [
        { label: 'Completion rate', value: `${analyticsData.completionRate}%` },
        {
          label: 'Engagement',
          value: `${engagementScore}%`,
          helperText: `${analyticsData.totalSubmissions} submissions`,
        },
        {
          label: 'Accuracy',
          value: `${accuracyScore}%`,
          helperText: 'Based on field completion',
        },
        {
          label: 'Follow-ups',
          value: `${lowCompletionFields.length}`,
          helperText: 'Fields below 70% completion',
        },
      ],
      insights: [
        analyticsData.completionRate < 60
          ? {
              title: 'Completion warning',
              detail:
                'Completion rate dipped below 60%. Consider trimming required fields or delivering targeted reminders.',
            }
          : {
              title: 'Healthy flow',
              detail: 'Form completion is outperforming benchmarks. Maintain the current configuration.',
            },
        ...(lowCompletionFields.length
          ? [
              {
                title: 'Field friction',
                detail: `${lowCompletionFields.length} fields show material drop-off and may need adjustments.`,
              },
            ]
          : []),
      ],
      recommendedActions: [
        ...(lowCompletionFields.length
          ? [
              {
                label: 'Launch field optimization playbook',
                action: 'Trigger the form optimization playbook for low performing fields',
                intent: 'copilot' as const,
              },
            ]
          : []),
        {
          label: 'Send reminder sequence',
          action: 'Draft a reminder email sequence to boost submissions',
          intent: 'analysis' as const,
        },
        {
          label: 'Ask for AI improvement tips',
          action: 'Share improvement tips I should prioritize',
          intent: 'optimization' as const,
        },
      ],
    };

    onSummaryChange?.({
      formId: selectedForm,
      submissionCount: analyticsData.totalSubmissions,
      completionRate: analyticsData.completionRate,
      fieldData: analyticsData.fieldAnalysis,
    });

    onContextChange(contextPayload);
  }, [analyticsData, selectedForm, forms, timeRange, onContextChange, onSummaryChange]);

  if (!forms.length) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Forms Available</h3>
          <p className="text-muted-foreground">Create a form first to view analytics</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Select value={selectedForm} onValueChange={setSelectedForm}>
            <SelectTrigger className="w-[300px]">
              <SelectValue placeholder="Select a form" />
            </SelectTrigger>
            <SelectContent>
              {forms.map((form) => (
                <SelectItem key={form.id} value={form.id}>
                  {form.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">7 days</SelectItem>
              <SelectItem value="30d">30 days</SelectItem>
              <SelectItem value="90d">90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {analyticsData && (
          <Button onClick={exportData} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        )}
      </div>

      {loading ? (
        <Card>
          <CardContent className="py-8 text-center">
            <Activity className="h-8 w-8 animate-pulse mx-auto text-muted-foreground mb-4" />
            <p>Loading analytics...</p>
          </CardContent>
        </Card>
      ) : analyticsData ? (
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="fields">Field Analysis</TabsTrigger>
            <TabsTrigger value="devices">Device Breakdown</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Submissions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="text-2xl font-bold">{analyticsData.totalSubmissions}</div>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Completion Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="text-2xl font-bold">{analyticsData.completionRate}%</div>
                    <TrendingUp className="h-4 w-4 text-green-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Avg. Time</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="text-2xl font-bold">{Math.floor(analyticsData.averageTime / 60)}m {analyticsData.averageTime % 60}s</div>
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <Badge variant={analyticsData.completionRate > 80 ? "default" : "secondary"}>
                    {analyticsData.completionRate > 80 ? "Excellent" : "Good"}
                  </Badge>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Submissions Over Time</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={analyticsData.dailySubmissions}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="submissions" stroke="#8884d8" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="performance" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Field Interactions</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analyticsData.topFields}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="field" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="interactions" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="fields" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Field Completion Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analyticsData.fieldAnalysis.map((field, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded">
                      <div className="font-medium">{field.field}</div>
                      <div className="flex items-center gap-4">
                        <div className="text-sm text-muted-foreground">
                          Completion: <span className="font-medium text-green-600">{field.completion}%</span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Drop-off: <span className="font-medium text-red-600">{field.dropoff}%</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="devices" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Device Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={analyticsData.deviceBreakdown}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        dataKey="count"
                        label={({ device, percentage }) => `${device} (${percentage}%)`}
                      >
                        {analyticsData.deviceBreakdown.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>

                  <div className="space-y-4">
                    {analyticsData.deviceBreakdown.map((device, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded">
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-4 h-4 rounded" 
                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                          />
                          <span className="font-medium">{device.device}</span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {device.count} ({device.percentage}%)
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      ) : (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">Select a form to view analytics</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
