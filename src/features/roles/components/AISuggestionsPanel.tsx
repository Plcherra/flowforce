/**
 * AI suggestions panel component
 */

import { Sparkles } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Suggestion } from "../types/permissions";
import { ROLE_LABELS, ROLE_ACCENTS } from "../constants/roles";
import { ROLE_MODULES } from "../constants/modules";

interface AISuggestionsPanelProps {
  suggestions: Suggestion[];
  onSuggestionAction: (
    suggestion: Suggestion,
    action: "apply" | "dismiss",
  ) => void;
}

export function AISuggestionsPanel({
  suggestions,
  onSuggestionAction,
}: AISuggestionsPanelProps) {
  if (suggestions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                AI Suggestions
              </CardTitle>
              <CardDescription>
                Performance and risk-based adjustments generated in real time.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-dashed p-4 text-xs text-muted-foreground">
            No active suggestions. Keep monitoring performance for fresh
            insights.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              AI Suggestions
            </CardTitle>
            <CardDescription>
              Performance and risk-based adjustments generated in real time.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {suggestions.map((suggestion) => {
          const module = ROLE_MODULES.find(
            (item) => item.id === suggestion.moduleId,
          );
          return (
            <div key={suggestion.id} className="rounded-lg border p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Badge
                      className={cn("border", ROLE_ACCENTS[suggestion.role])}
                    >
                      {ROLE_LABELS[suggestion.role]}
                    </Badge>
                    {module && <Badge variant="outline">{module.label}</Badge>}
                    <Badge
                      variant={
                        suggestion.risk === "high" ? "destructive" : "secondary"
                      }
                    >
                      {suggestion.risk.charAt(0).toUpperCase() +
                        suggestion.risk.slice(1)}{" "}
                      risk
                    </Badge>
                    <Badge variant="secondary">
                      {(suggestion.confidence * 100).toFixed(0)}% confidence
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm text-gray-800">
                    {suggestion.reason}
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => onSuggestionAction(suggestion, "apply")}
                  >
                    Apply
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onSuggestionAction(suggestion, "dismiss")}
                  >
                    Dismiss
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
