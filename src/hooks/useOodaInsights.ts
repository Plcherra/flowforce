import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Tables, TablesInsert } from '@/integrations/supabase/public-types';
import { useFeatureFlag } from './useFeatureFlags';
import { fetchConnecteamForms, fetchConnecteamFormSubmissions } from '@/integrations/connecteam/forms';

export type OodaRangeType = 'day' | 'week' | 'month' | 'custom';

export interface OodaRange {
  type: OodaRangeType;
  customStart?: Date | null;
  customEnd?: Date | null;
}

export interface OodaObservationHighlight {
  label: string;
  value: number | string;
  trend?: 'up' | 'down' | 'flat';
  helperText?: string;
}

export interface OodaDecisionSuggestion {
  title: string;
  description: string;
  priority: Tables<'tasks'>['priority'];
}

export interface OodaActionSuggestion extends OodaDecisionSuggestion {
  dueDate?: string;
  origin?: 'forms' | 'events' | 'connecteam';
}

export interface OodaInsights {
  windowLabel: string;
  range: { start: string; end: string };
  observations: {
    highlights: OodaObservationHighlight[];
    formsSample: Array<{ id: string; title: string; submittedAt: string; summary: string }>;
  };
  orientation: {
    summary: string;
    riskScore: number;
    dominantThemes: string[];
  };
  decisions: OodaDecisionSuggestion[];
  actions: OodaActionSuggestion[];
}

interface SupabaseFormSubmission extends Tables<'form_submissions'> {
  form: Pick<Tables<'forms'>, 'id' | 'title' | 'settings'> | null;
}

const MS_IN_DAY = 1000 * 60 * 60 * 24;

function normaliseRange(range: OodaRange): { start: Date; end: Date; label: string } {
  const now = new Date();
  switch (range.type) {
    case 'day': {
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      const end = new Date(now);
      end.setHours(23, 59, 59, 999);
      return { start, end, label: `Today (${start.toLocaleDateString()})` };
    }
    case 'week': {
      const start = new Date(now);
      const day = start.getDay();
      const diff = start.getDate() - day + (day === 0 ? -6 : 1); // Monday start
      start.setDate(diff);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start.getTime() + MS_IN_DAY * 7 - 1);
      return { start, end, label: `Week of ${start.toLocaleDateString()}` };
    }
    case 'month': {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      return { start, end, label: `${start.toLocaleString('default', { month: 'long' })} ${start.getFullYear()}` };
    }
    case 'custom': {
      const start = range.customStart ?? new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      const end = range.customEnd ?? new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      return { start, end, label: `${start.toLocaleString()} → ${end.toLocaleString()}` };
    }
    default:
      return normaliseRange({ type: 'week' });
  }
}

function flattenSubmission(submission: SupabaseFormSubmission): string {
  try {
    if (!submission.submission_data) return '';
    if (typeof submission.submission_data === 'string') return submission.submission_data;
    return JSON.stringify(submission.submission_data).toLowerCase();
  } catch (error) {
    console.warn('Failed to flatten submission', error);
    return '';
  }
}

function deriveThemes(samples: SupabaseFormSubmission[], connecteamPayloads: Record<string, unknown>[] = []) {
  const keywords = new Map<string, number>();
  const register = (text: string) => {
    const words = text.toLowerCase().match(/[a-zA-Z]{4,}/g);
    if (!words) return;
    for (const word of words) {
      keywords.set(word, (keywords.get(word) ?? 0) + 1);
    }
  };

  samples.forEach((submission) => register(flattenSubmission(submission)));
  connecteamPayloads.forEach((payload) => register(JSON.stringify(payload ?? {}).toLowerCase()));

  return Array.from(keywords.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([word]) => word);
}

function buildDecisions(themes: string[], highSeverityEvents: Tables<'events'>[]): OodaDecisionSuggestion[] {
  const suggestions: OodaDecisionSuggestion[] = [];

  if (highSeverityEvents.length > 0) {
    suggestions.push({
      title: 'Escalate critical incidents',
      description: `${highSeverityEvents.length} high severity event${highSeverityEvents.length === 1 ? '' : 's'} detected. Ensure ownership and post-mortems are in place for each incident reported during this window.`,
      priority: 'urgent',
    });
  }

  if (themes.some((word) => ['training', 'onboarding', 'knowledge'].includes(word))) {
    suggestions.push({
      title: 'Refresh training workflows',
      description: 'Frequent training-related notes surfaced. Schedule refresher sessions and ensure SOPs are accessible.',
      priority: 'high',
    });
  }

  if (themes.some((word) => ['inventory', 'stock', 'waste', 'spoilage'].includes(word))) {
    suggestions.push({
      title: 'Stabilize inventory controls',
      description: 'Multiple submissions reference inventory friction. Review par levels and receiving checks.',
      priority: 'high',
    });
  }

  if (suggestions.length === 0) {
    suggestions.push({
      title: 'Maintain cadence',
      description: 'No urgent patterns detected. Continue monitoring feedback and close outstanding action items.',
      priority: 'medium',
    });
  }

  return suggestions;
}

function buildActions(decisions: OodaDecisionSuggestion[], rangeEnd: Date): OodaActionSuggestion[] {
  return decisions.map((decision, index) => ({
    ...decision,
    origin: 'forms',
    dueDate: new Date(rangeEnd.getTime() + MS_IN_DAY * (index + 1)).toISOString(),
  }));
}

export function useOodaInsights(range: OodaRange) {
  const connecteamEnabled = useFeatureFlag('intelligence.connecteamFormsSync');
  const { start, end, label } = useMemo(() => normaliseRange(range), [range]);
  const startIso = start.toISOString();
  const endIso = end.toISOString();

  return useQuery<OodaInsights>({
    queryKey: ['ooda-insights', range.type, range.customStart?.toISOString(), range.customEnd?.toISOString()],
    queryFn: async () => {
      const [submissionsResponse, eventsResponse] = await Promise.all([
        supabase
          .from('form_submissions')
          .select('id, submission_data, submitted_at, form:forms(id,title,settings)')
          .gte('submitted_at', startIso)
          .lte('submitted_at', endIso),
        supabase
          .from('events')
          .select('*')
          .gte('occurred_at', startIso)
          .lte('occurred_at', endIso),
      ]);

      if (submissionsResponse.error) {
        throw submissionsResponse.error;
      }
      if (eventsResponse.error) {
        throw eventsResponse.error;
      }

      const submissions = (submissionsResponse.data ?? []) as SupabaseFormSubmission[];
      const events = (eventsResponse.data ?? []) as Tables<'events'>[];

      // Fetch optional Connecteam data
      let connecteamPayloads: Record<string, unknown>[] = [];
      if (connecteamEnabled) {
        try {
          const forms = await fetchConnecteamForms({ start: startIso, end: endIso });
          const submissionsPromises = forms.slice(0, 3).map((form) =>
            fetchConnecteamFormSubmissions(form.id, { start: startIso, end: endIso }),
          );
          const connecteamSubmissions = (await Promise.all(submissionsPromises)).flat();
          connecteamPayloads = connecteamSubmissions.map((submission) => submission.payload ?? {});
        } catch (error) {
          console.warn('Connecteam data unavailable', error);
        }
      }

      const totalSubmissions = submissions.length;
      const uniqueForms = new Set(submissions.map((submission) => submission.form?.id ?? submission.form_id));
      const highSeverity = events.filter((event) => event.severity === 'high');
      const mediumSeverity = events.filter((event) => event.severity === 'medium');

      const riskScore = Math.min(100, highSeverity.length * 25 + mediumSeverity.length * 10 + totalSubmissions * 2);

      const themes = deriveThemes(submissions, connecteamPayloads);
      const decisions = buildDecisions(themes, highSeverity);
      const actions = buildActions(decisions, end);

      const observations = submissions.slice(0, 5).map((submission) => ({
        id: submission.id,
        title: submission.form?.title ?? 'Untitled form',
        submittedAt: submission.submitted_at,
        summary: flattenSubmission(submission).slice(0, 140) || 'No summary available',
      }));

      return {
        windowLabel: label,
        range: { start: startIso, end: endIso },
        observations: {
          highlights: [
            {
              label: 'Form submissions',
              value: totalSubmissions,
              helperText: `${uniqueForms.size} unique forms in this window`,
            },
            {
              label: 'High severity events',
              value: highSeverity.length,
              trend: highSeverity.length > 0 ? 'up' : 'flat',
              helperText: 'Derived from incident and complaint logs',
            },
            {
              label: 'Connecteam payloads',
              value: connecteamPayloads.length,
              helperText: connecteamEnabled ? 'Synced from Connecteam API' : 'Integration disabled',
            },
          ],
          formsSample: observations,
        },
        orientation: {
          summary:
            totalSubmissions === 0 && events.length === 0
              ? 'No data captured for this window. Encourage teams to submit daily walkthrough forms.'
              : `Feedback volume is ${totalSubmissions > 0 ? 'active' : 'quiet'}, with ${highSeverity.length} critical event${
                  highSeverity.length === 1 ? '' : 's'
                } recorded. Dominant discussion points: ${themes.join(', ') || 'none'}.`,
          riskScore,
          dominantThemes: themes,
        },
        decisions,
        actions,
      } satisfies OodaInsights;
    },
  });
}

export type CreateOodaCycleInput = TablesInsert<'ooda_cycles'>;

export async function persistOodaCycle(input: CreateOodaCycleInput) {
  const { data, error } = await supabase.from('ooda_cycles').insert(input).select().single();
  if (error) throw error;
  return data;
}
