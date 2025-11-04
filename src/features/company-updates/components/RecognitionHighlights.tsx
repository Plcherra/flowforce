import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { recognitionSourceMeta } from '@/lib/recognitionMeta';
import type { RecognitionRecord } from '@/types/recognition';

interface RecognitionHighlightsProps {
  loading: boolean;
  highlights: RecognitionRecord[];
}

export function RecognitionHighlights({ loading, highlights }: RecognitionHighlightsProps) {
  const computedHighlights = useMemo(
    () => highlights.slice(0, 3),
    [highlights]
  );

  if (loading) {
    return (
      <Card className="flex items-center gap-3 p-4 border-primary/20 bg-primary/5">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
        <span className="text-sm text-primary">Gathering recognition highlights…</span>
      </Card>
    );
  }

  if (computedHighlights.length === 0) {
    return null;
  }

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-base font-semibold flex items-center gap-2">
            Team Recognition Highlights
            <Badge className="bg-primary text-primary-foreground">
              {computedHighlights.length} new
            </Badge>
          </h2>
          <p className="text-sm text-muted-foreground">
            Recent celebrations from goals, tasks, and training accomplishments.
          </p>
        </div>
        <Button variant="link" className="px-0" asChild>
          <Link to="/recognition">View all recognitions</Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {computedHighlights.map((recognition) => {
          const details = recognition.reward_details;
          const source = details?.source ?? 'manual';
          const meta = recognitionSourceMeta[source] ?? recognitionSourceMeta.manual;
          const Icon = meta.icon;
          const recipientName = recognition.recipient
            ? `${recognition.recipient.first_name ?? ''} ${recognition.recipient.last_name ?? ''}`.trim()
            : 'Team Member';
          const awardedDistance = recognition.awarded_at
            ? formatDistanceToNow(new Date(recognition.awarded_at), { addSuffix: true })
            : 'just now';

          return (
            <div key={recognition.id} className="flex items-start gap-3">
              <div className={cn('rounded-full p-2 bg-white shadow-sm', meta.color)}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{recipientName}</span>
                  <Badge variant="outline" className={meta.badgeColor}>
                    {meta.label}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{awardedDistance}</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {details?.message ?? 'Notable achievement recognised by the team.'}
                </p>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
