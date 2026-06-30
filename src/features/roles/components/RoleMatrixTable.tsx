/**
 * Role matrix table component
 */

import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import type { RoleKey, ModuleId } from "../types/permissions";
import { ROLE_ORDER, ROLE_LABELS, ROLE_ACCENTS } from "../constants/roles";
import { ROLE_MODULES } from "../constants/modules";

interface RoleMatrixTableProps {
  matrix: Record<RoleKey, Record<ModuleId, boolean>>;
  selectedRole: RoleKey;
  onRoleSelect: (role: RoleKey) => void;
  onModuleToggle: (role: RoleKey, moduleId: ModuleId, value: boolean) => void;
  dirtyRoles: Set<RoleKey>;
  assignmentByRole: Map<RoleKey, { positions: unknown[]; employees: string[] }>;
}

export function RoleMatrixTable({
  matrix,
  selectedRole,
  onRoleSelect,
  onModuleToggle,
  dirtyRoles,
  assignmentByRole,
}: RoleMatrixTableProps) {
  return (
    <table className="min-w-[720px] w-full text-sm">
      <thead>
        <tr className="border-b">
          <th className="text-left py-3 pr-4 font-medium text-muted-foreground">
            Module
          </th>
          {ROLE_ORDER.map((role) => {
            const assignmentInfo = assignmentByRole.get(role);
            return (
              <th
                key={role}
                className="text-left py-3 px-2 font-medium text-muted-foreground"
              >
                <button
                  className={cn(
                    "flex w-full flex-col items-start rounded-md border px-3 py-2 text-left transition",
                    selectedRole === role
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-transparent hover:border-border",
                    ROLE_ACCENTS[role],
                  )}
                  type="button"
                  onClick={() => onRoleSelect(role)}
                >
                  <span className="text-sm font-semibold">
                    {ROLE_LABELS[role]}
                  </span>
                  <span className="text-xs font-normal opacity-80">
                    {assignmentInfo?.positions.length || 0} positions ·{" "}
                    {assignmentInfo?.employees.length || 0} employees
                  </span>
                  {dirtyRoles.has(role) && (
                    <span className="mt-1 text-xs font-semibold text-primary">
                      Unsaved
                    </span>
                  )}
                </button>
              </th>
            );
          })}
        </tr>
      </thead>
      <tbody>
        {ROLE_MODULES.map((module) => (
          <tr key={module.id} className="border-b last:border-0">
            <td className="align-top py-4 pr-4">
              <div className="flex items-start gap-3">
                <module.icon className="mt-0.5 h-5 w-5 text-muted-foreground" />
                <div>
                  <div className="font-medium text-gray-900">
                    {module.label}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {module.description}
                  </div>
                  {module.sections && module.sections.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {module.sections.map((section) => (
                        <Badge
                          key={section}
                          variant="outline"
                          className="text-[10px] uppercase tracking-wide"
                        >
                          {section.replace(/-/g, " ")}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </td>
            {ROLE_ORDER.map((role) => {
              const isOwner = role === "owner";
              const value = matrix[role]?.[module.id] ?? module.defaults[role];
              const isHighRisk = module.risk === "high" && value;
              return (
                <td key={role} className="py-4 px-2 align-middle">
                  <div className="flex flex-col items-start gap-2">
                    <Switch
                      checked={value}
                      disabled={isOwner}
                      onCheckedChange={(checked) =>
                        onModuleToggle(role, module.id, Boolean(checked))
                      }
                    />
                    <div className="text-xs text-muted-foreground">
                      {value ? "Enabled" : "Disabled"}
                    </div>
                    {isHighRisk && (
                      <Badge variant="destructive" className="text-[10px]">
                        Elevated Risk
                      </Badge>
                    )}
                    {!value &&
                      module.risk === "high" &&
                      role !== "owner" &&
                      (role === "admin" || role === "manager") && (
                        <Badge variant="outline" className="text-[10px]">
                          Critical module off
                        </Badge>
                      )}
                  </div>
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
