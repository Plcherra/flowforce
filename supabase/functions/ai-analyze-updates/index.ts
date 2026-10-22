import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';
import { readGrokRuntimeConfig } from '../_shared/grokProvider.ts';
import {
  AI_BUDGET_FALLBACK,
  runMeteredGrokChat,
} from '../_shared/grokUsage.ts';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

type CompanyUpdateRow = {
  id: string;
  title: string;
  body: string | null;
  likes_count: number | null;
  comments_count: number | null;
  views_count: number | null;
  company_id: string | null;
};

Deno.serve(async () => {
  const since = new Date(Date.now() - 86_400_000).toISOString();
  const grok = readGrokRuntimeConfig((name) => Deno.env.get(name) ?? undefined);

  const { data: updates, error } = await supabase
    .from('company_updates')
    .select('id, title, body, likes_count, comments_count, views_count, company_id, updated_at')
    .eq('status', 'published')
    .gte('updated_at', since);

  if (error) {
    console.error('Failed to fetch company updates', error);
    return new Response('Unable to fetch company updates', { status: 500 });
  }

  if (!updates?.length) {
    return new Response('No updates to analyze');
  }

  for (const update of updates as CompanyUpdateRow[]) {
    const likes = update.likes_count ?? 0;
    const comments = update.comments_count ?? 0;
    const views = update.views_count ?? 0;
    const engagementScore = (likes * 2 + comments * 3 + views * 0.5) / 10;
    const prompt = `
    Analyze internal engagement quality.
    Title: ${update.title}
    Text: ${update.body ?? ''}
    Likes: ${likes}
    Comments: ${comments}
    Views: ${views}
    Provide a concise AI summary and improvement advice.
    `;

    let summary = '';
    if (!update.company_id) {
      summary = 'Skipped AI summary because the update has no company.';
    } else {
      try {
        const completion = await runMeteredGrokChat({
          client: supabase,
          companyId: update.company_id,
          promptKey: 'manager_briefing',
          surface: 'company_update_engagement',
          metadata: { update_id: update.id },
          apiKey: grok.apiKey,
          model: grok.model,
          reasoningEffort: grok.reasoningEffort,
          temperature: 0.7,
          maxCompletionTokens: 400,
          messages: [{ role: 'system', content: prompt }],
        });
        summary = completion.blocked ? AI_BUDGET_FALLBACK : completion.content;
      } catch (analysisError) {
        console.error('Failed to analyze company update', analysisError);
        summary = 'AI summary was not generated.';
      }
    }

    const { error: upsertError } = await supabase.from('company_update_engagement').upsert({
      update_id: update.id,
      company_id: update.company_id,
      engagement_score: engagementScore,
      likes_count: likes,
      comments_count: comments,
      views_count: views,
      ai_summary: summary.trim(),
      last_analyzed: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    if (upsertError) {
      console.error('Failed to upsert engagement analytics', upsertError);
    }
  }

  return new Response('Engagement analysis complete');
});
