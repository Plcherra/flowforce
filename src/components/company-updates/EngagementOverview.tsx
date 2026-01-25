import React, { useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/loading-states';
import { useEngagementAnalytics } from '@/hooks/useEngagementAnalytics';
import { formatDistanceToNow } from 'date-fns';
import { logger } from '@/utils/logger';

function Sparkline({ data }: { data: number[] }) {
  const max = Math.max(...data, 1);
  const normalized = data.map((value) => (value / max) * 100);

  const points = normalized
    .map((value, index) => {
      const x = data.length === 1 ? 100 : (index / (data.length - 1)) * 100;
      const y = 100 - value;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg viewBox="0 0 100 100" className="h-8 w-16 text-primary">
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinejoin="round"
        strokeLinecap="round"
        points={points || '0,100 100,100'}
      />
    </svg>
  );
}

export default function EngagementOverview() {
  const { updates, isLoading, analyze, isAnalyzing } = useEngagementAnalytics();

  useEffect(() => {
    if (!updates.length) {
      return;
    }

    updates
      .filter((update) => !update.aiSummary && !isAnalyzing)
      .forEach((update) => {
        analyze(update).catch((error) => {
          logger.warn('Failed to analyze engagement', { error, tags: ['warning'] });
        });
      });
  }, [updates, analyze, isAnalyzing]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <LoadingSpinner text="Analyzing engagement…" />
      </div>
    );
  }

  if (!updates.length) {
    return (
      <Card className="p-6 text-sm text-muted-foreground">
        AI engagement analytics will appear after your team publishes updates.
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {updates.map((update) => (
        <Card key={update.id} className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-medium">{update.title}</h3>
              <p className="text-xs text-muted-foreground">
                {update.lastAnalyzed
                  ? `Last analyzed ${formatDistanceToNow(new Date(update.lastAnalyzed), { addSuffix: true })}`
                  : 'Awaiting AI analysis'}
              </p>
            </div>
            <Sparkline data={[update.metrics.likes, update.metrics.comments, update.metrics.views]} />
          </div>

          <p className="text-sm text-muted-foreground">
            {update.aiSummary ?? 'Analyzing engagement intelligence…'}
          </p>

          <div className="text-xs text-muted-foreground flex flex-wrap gap-4">
            <span>Engagement: {update.engagementScore ?? '–'}</span>
            <span>Sentiment: {update.sentimentScore ?? '–'}</span>
            <span>Likes: {update.metrics.likes}</span>
            <span>Comments: {update.metrics.comments}</span>
            <span>Views: {update.metrics.views}</span>
          </div>
        </Card>
      ))}
    </div>
  );
}
