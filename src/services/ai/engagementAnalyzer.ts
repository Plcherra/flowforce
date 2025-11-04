import OpenAI from 'openai';

const apiKey = import.meta.env.VITE_OPENAI_API_KEY;

const openai = new OpenAI({
  apiKey,
  dangerouslyAllowBrowser: true,
});

type AnalyzeEngagementInput = {
  title: string;
  body: string;
  metrics: {
    likes: number;
    comments: number;
    views: number;
  };
};

type AnalyzeEngagementResult = {
  engagementScore: number;
  sentimentScore: number;
  summary: string;
};

export async function analyzeEngagement({ title, body, metrics }: AnalyzeEngagementInput): Promise<AnalyzeEngagementResult> {
  const { likes, comments, views } = metrics;
  const engagementScore = Math.round((likes * 2 + comments * 3 + views * 0.5) / 10);

  const prompt = `
  You are an HR analytics assistant.
  Analyze this company update and provide:
  1. Sentiment (from -1 to +1)
  2. A short motivational summary of the impact.
  3. Advice for improving communication engagement.

  ---
  Title: ${title}
  Body: ${body}
  Likes: ${likes}
  Comments: ${comments}
  Views: ${views}
  Engagement score baseline: ${engagementScore}
  `;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'system', content: prompt }],
  });

  const text = completion.choices[0]?.message?.content ?? '';
  const normalizedText = text.toLowerCase();
  const sentimentScore = normalizedText.includes('positive')
    ? 0.8
    : normalizedText.includes('neutral')
      ? 0.0
      : -0.5;

  return {
    engagementScore,
    sentimentScore,
    summary: text.trim(),
  };
}
