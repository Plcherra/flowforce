import { Zap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { AIRecommendation } from './types';

interface AISidebarProps {
  recommendations: AIRecommendation[];
  onAssign: (recommendation: AIRecommendation) => void;
}

export function AISidebar({ recommendations, onAssign }: AISidebarProps) {
  return (
    <Card className="lg:w-80 flex-shrink-0 relative z-30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-primary" />
          AI Recommendations
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {recommendations.slice(0, 5).map((recommendation, index) => (
          <div key={`${recommendation.name}-${index}`} className="p-3 border rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-sm">{recommendation.name}</span>
              <Badge variant={recommendation.score > 80 ? 'default' : recommendation.score > 60 ? 'secondary' : 'outline'}>
                {recommendation.score}%
              </Badge>
            </div>
            <div className="space-y-1 text-xs text-muted-foreground">
              {recommendation.reasons?.map((reason, idx) => (
                <div key={`${recommendation.name}-reason-${idx}`}>• {reason}</div>
              ))}
            </div>
            <Button
              size="sm"
              className="w-full mt-2"
              onClick={() => onAssign(recommendation)}
            >
              Assign Staff
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
