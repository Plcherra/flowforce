import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Sparkles } from 'lucide-react';

export interface Recommendation {
  id: string;
  name: string;
  badgeLabel: string;
  badgeClassName?: string;
  message: string;
  xpSnapshot: number;
  createdAt: string;
}

interface RecommendationsPanelProps {
  recommendations: Recommendation[];
  loading: boolean;
}

export function RecommendationsPanel({ recommendations, loading }: RecommendationsPanelProps) {
  if (loading && recommendations.length === 0) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>Recommendations</CardTitle>
          <CardDescription>AI is evaluating recent reviews…</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="space-y-2 rounded-xl border bg-muted/30 p-3">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
              <Skeleton className="h-3 w-24" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!loading && recommendations.length === 0) {
    return (
      <Card className="h-full border-dashed">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Recommendations
          </CardTitle>
          <CardDescription>Connect your goals workspace to unlock AI coaching tips.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          AI Recommendations
        </CardTitle>
        <CardDescription>Prioritized actions based on recent reviews.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {recommendations.map((recommendation) => (
          <div key={recommendation.id} className="space-y-1 rounded-2xl border bg-muted/40 p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-base font-semibold">{recommendation.name}</p>
                <p className="text-sm text-muted-foreground">{recommendation.message}</p>
              </div>
              <Badge className={recommendation.badgeClassName ?? ''}>{recommendation.badgeLabel}</Badge>
            </div>
            <div className="flex flex-col gap-1 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
              <span>Estimated XP impact: {recommendation.xpSnapshot.toLocaleString()} XP</span>
              <span>Updated {new Date(recommendation.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export default RecommendationsPanel;
