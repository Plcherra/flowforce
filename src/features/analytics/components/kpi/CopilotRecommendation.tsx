/**
 * Co-Pilot recommendation section component
 */

import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CopilotRecommendationProps {
  message: string;
  actions: Array<{
    label: string;
    onClick: () => void;
    variant?: "default" | "outline" | "ghost";
  }>;
}

export function CopilotRecommendation({
  message,
  actions,
}: CopilotRecommendationProps) {
  return (
    <div className="space-y-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-primary">
        <Sparkles className="h-4 w-4" />
        Co-Pilot Recommendation
      </div>
      <p className="text-sm leading-relaxed text-muted-foreground">{message}</p>
      <div className="flex flex-wrap gap-2">
        {actions.map((action, index) => (
          <Button
            key={index}
            size="sm"
            variant={action.variant ?? "default"}
            onClick={action.onClick}
          >
            {action.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
