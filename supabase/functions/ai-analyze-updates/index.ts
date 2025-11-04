import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const openai = new OpenAI({
  apiKey: Deno.env.get('OPENAI_API_KEY') ?? '',
});

type CompanyUpdateRow = {
  id: string;
  title: string;
  body: string | null;
  likes: number | null;
  comments_count: number | null;
  views_count: number | null;
  company_id: string | null;
};

Deno.serve(async () => {
  const since = new Date(Date.now() - 86_400_000).toISOString();

  const { data: updates, error } = await supabase
    .from('company_updates')
    .select('id, title, body, likes, comments_count, views_count, company_id, updated_at')
    .eq('status', 'published')
    .gte('updated_at', since);

  if (error) {
    console.error('Failed to fetch company updates', error);
    return new Response('❌ Unable to fetch company updates', { status: 500 });
  }

  if (!updates?.length) {
    return new Response('✅ No updates to analyze');
  }

  for (const update of updates as CompanyUpdateRow[]) {
    const likes = update.likes ?? 0;
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

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'system', content: prompt }],
    });

    const summary = completion.choices[0]?.message?.content ?? '';

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

  return new Response('✅ Engagement analysis complete');
});
