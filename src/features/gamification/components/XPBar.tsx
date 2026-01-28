import { useMemo } from "react";
import { motion } from "framer-motion";
import { Sparkles, Target } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export interface XPBarMilestone {
  label: string;
  xpRequired: number;
  description?: string;
}

interface XPBarProps {
  currentXP: number;
  nextMilestone: XPBarMilestone;
  previousMilestone?: XPBarMilestone;
  loading?: boolean;
  className?: string;
}

const gradientClass =
  "bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 shadow-[0_0_20px_rgba(192,132,252,0.55)]";

export function XPBar({
  currentXP,
  nextMilestone,
  previousMilestone,
  loading,
  className,
}: XPBarProps) {
  const { progress, xpToGo, baseline } = useMemo(() => {
    const min = previousMilestone?.xpRequired ?? 0;
    const max = Math.max(nextMilestone.xpRequired, min + 1);
    const clampedCurrent = Math.min(
      Math.max(currentXP, min),
      nextMilestone.xpRequired,
    );
    const ratio = ((clampedCurrent - min) / (max - min)) * 100;
    return {
      progress: Number.isFinite(ratio) ? Math.min(Math.max(ratio, 0), 100) : 0,
      xpToGo: Math.max(nextMilestone.xpRequired - currentXP, 0),
      baseline: min,
    };
  }, [currentXP, nextMilestone, previousMilestone]);

  if (loading) {
    return (
      <Card className={cn("overflow-hidden", className)}>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
          <Skeleton className="mt-2 h-4 w-48" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-3 w-full rounded-full" />
          <Skeleton className="h-4 w-32" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("overflow-hidden border border-primary/20", className)}>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-4 w-4 text-primary" />
          XP Progress
        </CardTitle>
        <CardDescription className="text-xs">
          {previousMilestone ? `${previousMilestone.label} · ` : null}
          Next milestone unlocks <strong>{nextMilestone.label}</strong>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="text-3xl font-semibold text-foreground">
            {currentXP.toLocaleString()}{" "}
            <span className="text-base text-muted-foreground">XP</span>
          </div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Need {xpToGo.toLocaleString()} XP to reach {nextMilestone.label}
          </p>
        </div>
        <div className="relative h-4 rounded-full bg-muted/70">
          <motion.div
            aria-hidden
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className={cn(
              "absolute left-0 top-0 h-full rounded-full",
              gradientClass,
            )}
          />
          <motion.div
            initial={{ x: 0, opacity: 0 }}
            animate={{ x: `${progress}%`, opacity: 1 }}
            transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
            className="absolute -top-2 flex -translate-x-1/2 items-center"
          >
            <div className="h-6 w-6 rounded-full border border-white/70 bg-white/90 text-center text-[10px] font-semibold text-primary shadow-lg dark:border-white/20 dark:bg-slate-900">
              {Math.round(progress)}
              <span className="text-[8px]">%</span>
            </div>
          </motion.div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Target className="h-3.5 w-3.5 text-primary" />
            <div>
              <p className="font-medium text-foreground">
                {nextMilestone.label}
              </p>
              <p>
                {nextMilestone.description ??
                  "Complete goals, tasks, and training to level up."}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-medium text-foreground">
              {nextMilestone.xpRequired.toLocaleString()} XP goal
            </p>
            {baseline > 0 ? (
              <p>Baseline {baseline.toLocaleString()} XP</p>
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
