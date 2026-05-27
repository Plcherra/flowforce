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

export async function analyzeEngagement({
  title,
  body,
  metrics,
}: AnalyzeEngagementInput): Promise<AnalyzeEngagementResult> {
  const { likes, comments, views } = metrics;
  const engagementScore = Math.round(
    (likes * 2 + comments * 3 + views * 0.5) / 10,
  );

  const normalizedText = `${title} ${body}`.toLowerCase();
  const positiveSignals = ["great", "win", "thank", "improve", "celebrate"];
  const negativeSignals = ["issue", "delay", "problem", "miss", "urgent"];
  const sentimentScore =
    positiveSignals.filter((signal) => normalizedText.includes(signal)).length *
      0.2 -
    negativeSignals.filter((signal) => normalizedText.includes(signal)).length *
      0.2;

  return {
    engagementScore,
    sentimentScore: Math.max(-1, Math.min(1, sentimentScore)),
    summary:
      engagementScore >= 50
        ? "This update is generating strong engagement."
        : "This update has room for clearer follow-up and manager visibility.",
  };
}
