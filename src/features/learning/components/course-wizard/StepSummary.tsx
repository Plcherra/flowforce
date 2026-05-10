import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { CourseModuleInput, LearningDeliveryMode } from "@/types/learning";

interface StepSummaryProps {
  title: string;
  description: string;
  category: string;
  deliveryMode: LearningDeliveryMode;
  targetRoles: string[];
  levelRequirement: number;
  xpReward: number;
  estimatedHours: number;
  modules: CourseModuleInput[];
}

export function StepSummary({
  title,
  description,
  category,
  deliveryMode,
  targetRoles,
  levelRequirement,
  xpReward,
  estimatedHours,
  modules,
}: StepSummaryProps) {
  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle>Review and publish</CardTitle>
        <CardDescription>
          Double-check the experience before deploying
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-lg font-semibold">{title}</p>
          <p className="text-sm text-muted-foreground">
            {description || "No description provided."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          <Badge variant="outline">{category}</Badge>
          <Badge variant="secondary">{deliveryMode.replace("_", " ")}</Badge>
          <Badge variant="outline">Level {levelRequirement}+</Badge>
        </div>
        <div className="rounded-xl border bg-muted/20 p-4 text-sm">
          <p className="font-semibold text-foreground">
            {xpReward.toLocaleString()} XP · {estimatedHours}h estimated
          </p>
          <p className="text-muted-foreground">
            Target roles:{" "}
            {targetRoles.length > 0 ? targetRoles.join(", ") : "All employees"}
          </p>
        </div>
        <div>
          <p className="text-sm font-semibold text-muted-foreground">
            Modules ({modules.length})
          </p>
          <ul className="mt-2 space-y-2 text-sm">
            {modules.map((module, index) => (
              <li
                key={`${module.title}-${index}`}
                className="rounded-lg border bg-muted/20 p-3"
              >
                <p className="font-medium text-foreground">{module.title}</p>
                <p className="text-xs text-muted-foreground">
                  {module.estimatedMinutes} minutes · {module.xpAward} XP
                </p>
              </li>
            ))}
          </ul>
          {modules.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Add at least one module to launch the course.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default StepSummary;
