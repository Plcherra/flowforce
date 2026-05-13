import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CourseModulesForm } from "@/features/learning/components/CourseModulesForm";
import type { CourseModuleInput } from "@/types/learning";

interface StepXPRewardsProps {
  manualXpReward: number;
  modules: CourseModuleInput[];
  workloadMinutes: number;
  totalXp: number;
  onManualXpChange: (value: number) => void;
  onAddModule: (module: CourseModuleInput) => void;
  onRemoveModule: (index: number) => void;
}

export function StepXPRewards({
  manualXpReward,
  modules,
  workloadMinutes,
  totalXp,
  onManualXpChange,
  onAddModule,
  onRemoveModule,
}: StepXPRewardsProps) {
  const estimatedHours = Math.max(1, Math.round(workloadMinutes / 60));

  return (
    <div className="space-y-4">
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>XP rewards</CardTitle>
          <CardDescription>
            Ensure the XP aligns with course effort.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="manual-xp">Manual XP reward</Label>
            <Input
              id="manual-xp"
              type="number"
              min={50}
              step={10}
              value={manualXpReward}
              onChange={(event) => onManualXpChange(Number(event.target.value))}
            />
            <p className="text-xs text-muted-foreground">
              Auto-calculated XP from modules: {totalXp}
            </p>
          </div>
          <div className="space-y-2 rounded-xl border bg-muted/20 p-3 text-sm text-muted-foreground">
            <p>Estimated hours based on modules:</p>
            <p className="text-2xl font-semibold text-foreground">
              {estimatedHours}h
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Modules</CardTitle>
          <CardDescription>
            Break the course into lessons with XP awards.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CourseModulesForm
            onAdd={onAddModule}
          />
        </CardContent>
      </Card>
    </div>
  );
}

export default StepXPRewards;
