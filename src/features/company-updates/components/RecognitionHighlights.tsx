import React, { useMemo } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { recognitionSourceMeta } from "@/lib/recognitionMeta";
import type { RecognitionRecord } from "@/types/recognition";
import { Skeleton } from "@/components/ui/skeleton";

interface RecognitionHighlightsProps {
  loading: boolean;
  highlights: RecognitionRecord[];
  error?: string | null;
}

export function RecognitionHighlights({
  loading,
  highlights,
  error,
}: RecognitionHighlightsProps) {
  const computedHighlights = useMemo(
    () => highlights.slice(0, 3),
    [highlights],
  );

  if (loading) {
    return (
      <Card className="border-primary/20 bg-muted/40">
        <CardHeader className="space-y-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-48 animate-pulse" />
            <Skeleton className="h-4 w-20 animate-pulse" />
          </div>
          <Skeleton className="h-3 w-2/3 animate-pulse" />
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 3 }).map((_, idx) => (
            <div key={idx} className="flex items-start gap-3">
              <Skeleton className="h-10 w-10 rounded-full animate-pulse" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-1/3 animate-pulse" />
                <Skeleton className="h-3 w-3/4 animate-pulse" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive/20 bg-destructive/5">
        <CardHeader>
          <h2 className="text-base font-semibold text-destructive">
            Recognitions unavailable
          </h2>
          <p className="text-sm text-muted-foreground">{error}</p>
        </CardHeader>
        <CardContent>
          <Button variant="link" className="px-0" asChild>
            <Link to="/recognition">Open recognition history</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (computedHighlights.length === 0) {
    return (
      <Card className="border-dashed">
        <CardHeader>
          <h2 className="text-base font-semibold">No recognitions yet</h2>
          <p className="text-sm text-muted-foreground">
            Celebrate your team&apos;s wins by sharing the first recognition.
          </p>
        </CardHeader>
        <CardContent>
          <Button variant="outline" asChild>
            <Link to="/recognition">Create recognition</Link>
          </Button>
        </CardContent>
      </Card>
    );
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
          const source = details?.source ?? "manual";
          const meta =
            recognitionSourceMeta[source] ?? recognitionSourceMeta.manual;
          const Icon = meta.icon;
          const recipientName = recognition.recipient
            ? `${recognition.recipient.first_name ?? ""} ${recognition.recipient.last_name ?? ""}`.trim()
            : "Team Member";
          const awardedDistance = recognition.awarded_at
            ? formatDistanceToNow(new Date(recognition.awarded_at), {
                addSuffix: true,
              })
            : "just now";

          return (
            <div key={recognition.id} className="flex items-start gap-3">
              <div
                className={cn(
                  "rounded-full p-2 bg-white shadow-sm",
                  meta.color,
                )}
              >
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{recipientName}</span>
                  <Badge variant="outline" className={meta.badgeColor}>
                    {meta.label}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {awardedDistance}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {details?.message ??
                    "Notable achievement recognised by the team."}
                </p>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
