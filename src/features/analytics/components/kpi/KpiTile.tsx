/**
 * Individual KPI tile component
 */

import { Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { TileDescriptor } from "../../types/kpi";
import { TREND_LABEL } from "./constants";

interface KpiTileProps {
  tile: TileDescriptor;
  onClick: () => void;
}

export function KpiTile({ tile, onClick }: KpiTileProps) {
  const TrendIcon = TREND_LABEL[tile.trend].icon;

  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onClick();
        }
      }}
      className="relative cursor-pointer border-border/70 transition hover:-translate-y-[2px] hover:border-primary/60 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
        <div className="space-y-1">
          <CardTitle className="text-sm font-semibold text-foreground">
            {tile.title}
          </CardTitle>
          <p className="text-xs text-muted-foreground">{tile.metricLabel}</p>
        </div>
        <div className={cn("rounded-full p-2", tile.accent)}>
          <tile.icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-semibold text-foreground">
            {tile.metric}
          </span>
          <span
            className={cn(
              "flex items-center text-xs font-medium",
              TREND_LABEL[tile.trend].tone,
            )}
          >
            <TrendIcon className="mr-1 h-3 w-3" />
            {tile.trendLabel}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">{tile.secondary}</p>
        <div className="rounded-md border border-dashed border-border/80 bg-muted/40 p-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-2 text-foreground">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-xs font-semibold uppercase tracking-wide text-primary">
              Co-Pilot Insight
            </span>
          </div>
          <p className="mt-2 leading-relaxed">{tile.suggestion}</p>
        </div>
      </CardContent>
    </Card>
  );
}
