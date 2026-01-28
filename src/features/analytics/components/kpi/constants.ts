/**
 * Constants for KPI tiles
 */

import { TrendingUp, TrendingDown } from "lucide-react";

export const TREND_LABEL: Record<
  "up" | "down" | "flat",
  { icon: typeof TrendingUp; tone: string }
> = {
  up: { icon: TrendingUp, tone: "text-emerald-500" },
  down: { icon: TrendingDown, tone: "text-destructive" },
  flat: { icon: TrendingUp, tone: "text-muted-foreground" },
};
