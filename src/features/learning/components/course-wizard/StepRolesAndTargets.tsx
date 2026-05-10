import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

interface RoleOption {
  value: string;
  label: string;
}

interface CertificationOption {
  id: string;
  title: string;
  unlocksRole: string | null;
}

interface StepRolesAndTargetsProps {
  targetRoles: string[];
  levelRequirement: number;
  certificationId: string | null;
  roleUnlock: string[];
  autoScheduleEligible: boolean;
  certificationOptions: CertificationOption[];
  loadingCertifications: boolean;
  roleOptions: RoleOption[];
  unlockOptions: RoleOption[];
  noCertificationValue: string;
  onChange: (
    updates: Partial<{
      targetRoles: string[];
      levelRequirement: number;
      certificationId: string | null;
      roleUnlock: string[];
      autoScheduleEligible: boolean;
    }>,
  ) => void;
}

export function StepRolesAndTargets({
  targetRoles,
  levelRequirement,
  certificationId,
  roleUnlock,
  autoScheduleEligible,
  certificationOptions,
  loadingCertifications,
  roleOptions,
  unlockOptions,
  noCertificationValue,
  onChange,
}: StepRolesAndTargetsProps) {
  const toggleTargetRole = (role: string) => {
    const next = targetRoles.includes(role)
      ? targetRoles.filter((value) => value !== role)
      : [...targetRoles, role];
    onChange({ targetRoles: next });
  };

  const toggleRoleUnlock = (role: string) => {
    const next = roleUnlock.includes(role)
      ? roleUnlock.filter((value) => value !== role)
      : [...roleUnlock, role];
    onChange({ roleUnlock: next });
  };

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle>Audience & certifications</CardTitle>
        <CardDescription>
          Target the right roles and connect certification unlocks.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Target roles</Label>
          <div className="flex flex-wrap gap-2">
            {roleOptions.map((option) => (
              <Button
                key={option.value}
                type="button"
                variant={
                  targetRoles.includes(option.value) ? "default" : "outline"
                }
                onClick={() => toggleTargetRole(option.value)}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="level-requirement">Level requirement</Label>
            <Input
              id="level-requirement"
              type="number"
              min={1}
              max={10}
              value={levelRequirement}
              onChange={(event) =>
                onChange({ levelRequirement: Number(event.target.value) })
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Auto-schedule eligible</Label>
            <div className="flex items-center gap-3 rounded-xl border p-3">
              <Switch
                checked={autoScheduleEligible}
                onCheckedChange={(value) =>
                  onChange({ autoScheduleEligible: value })
                }
              />
              <p className="text-sm text-muted-foreground">
                Allow Copilot to schedule this course automatically.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Linked certification</Label>
          <Select
            value={certificationId ?? noCertificationValue}
            onValueChange={(value) =>
              onChange({
                certificationId: value === noCertificationValue ? null : value,
              })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select certification" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={noCertificationValue}>
                No certification
              </SelectItem>
              {loadingCertifications ? (
                <SelectItem value="loading" disabled>
                  Loading…
                </SelectItem>
              ) : (
                certificationOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.title}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Role unlocks</Label>
          <div className="flex flex-wrap gap-2">
            {unlockOptions.map((option) => (
              <Badge
                key={option.value}
                variant={
                  roleUnlock.includes(option.value) ? "default" : "outline"
                }
                className="cursor-pointer px-3 py-1"
                onClick={() => toggleRoleUnlock(option.value)}
              >
                {option.label}
              </Badge>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default StepRolesAndTargets;
