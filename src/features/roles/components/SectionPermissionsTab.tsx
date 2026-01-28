import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useCompanyRoles } from "@/hooks/useCompanyRoles";
import { usePositions } from "@/hooks/usePositions";
import type { RoleKey, Suggestion } from "../types/permissions";
import { ROLE_LABELS } from "../constants/roles";
import { ROLE_MODULES } from "../constants/modules";
import { getModuleDefaults } from "../utils/permissionHelpers";
import { usePermissionMatrix } from "../hooks/usePermissionMatrix";
import { useRoleAssignments } from "../hooks/useRoleAssignments";
import { usePermissionMutations } from "../hooks/usePermissionMutations";
import { generateSuggestions } from "../utils/suggestions";
import {
  RoleMatrixTable,
  PermissionPreview,
  PropagationSummary,
  AISuggestionsPanel,
} from "./";

export default function SectionPermissionsTab() {
  const { toast } = useToast();
  const {
    roles,
    isLoading: rolesLoading,
    updateRole,
    refetchRoles,
  } = useCompanyRoles();
  const { positions, assignments, updatePosition } = usePositions();

  const [selectedRole, setSelectedRole] = useState<RoleKey>("manager");
  const [dismissedSuggestions, setDismissedSuggestions] = useState<Set<string>>(
    new Set(),
  );

  // Permission matrix management
  const {
    matrix,
    roleMetadata,
    dirtyRoles,
    updatedPermissions,
    setDirtyRoles,
    handleModuleToggle,
    handleResetRole,
    handleResetAll,
  } = usePermissionMatrix({
    roles: roles ?? [],
    rolesLoading,
  });

  // Role assignments
  const { assignmentByRole } = useRoleAssignments({
    positions,
    assignments,
  });

  // Mutations
  const { saving, handleSave } = usePermissionMutations({
    updateRole,
    updatePosition,
    refetchRoles,
    positions,
    roleMetadata,
    matrix,
    dirtyRoles,
    setDirtyRoles,
  });

  const selectedRolePermissions = useMemo(
    () => updatedPermissions[selectedRole] || {},
    [updatedPermissions, selectedRole],
  );
  const selectedModules =
    matrix[selectedRole] || getModuleDefaults(selectedRole);
  const selectedAssignments = assignmentByRole.get(selectedRole);

  const activePermissions = useMemo(() => {
    return Object.entries(selectedRolePermissions)
      .filter(([, value]) => Boolean(value))
      .map(([key]) => key)
      .sort();
  }, [selectedRolePermissions]);

  const activeModules = useMemo(() => {
    return ROLE_MODULES.filter((module) => selectedModules?.[module.id]);
  }, [selectedModules]);

  const suggestions = useMemo(
    () => generateSuggestions(matrix, assignmentByRole),
    [matrix, assignmentByRole],
  );

  const visibleSuggestions = suggestions.filter(
    (suggestion) => !dismissedSuggestions.has(suggestion.id),
  );
  const dirtySelectedRole = dirtyRoles.has(selectedRole);

  const handleSuggestionAction = (
    suggestion: Suggestion,
    action: "apply" | "dismiss",
  ) => {
    if (action === "dismiss") {
      setDismissedSuggestions((prev) => {
        const next = new Set(prev);
        next.add(suggestion.id);
        return next;
      });
      return;
    }

    handleModuleToggle(
      suggestion.role,
      suggestion.moduleId,
      suggestion.recommendation,
    );
    setDismissedSuggestions((prev) => {
      const next = new Set(prev);
      next.add(suggestion.id);
      return next;
    });

    toast({
      title: "Suggestion applied",
      description: `${ROLE_LABELS[suggestion.role]} now ${suggestion.recommendation ? "has" : "no longer has"} access to ${ROLE_MODULES.find((m) => m.id === suggestion.moduleId)?.label}.`,
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Role Matrix</CardTitle>
              <CardDescription>
                Toggle module access per role. Changes update live previews and
                propagate to linked positions.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetAll}
                disabled={saving}
              >
                Reset All
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <RoleMatrixTable
            matrix={matrix}
            selectedRole={selectedRole}
            onRoleSelect={setSelectedRole}
            onModuleToggle={handleModuleToggle}
            dirtyRoles={dirtyRoles}
            assignmentByRole={assignmentByRole}
          />
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <PermissionPreview
          selectedRole={selectedRole}
          activeModules={activeModules}
          activePermissions={activePermissions}
          dirtySelectedRole={dirtySelectedRole}
          onResetRole={handleResetRole}
        />

        <div className="space-y-6">
          <PropagationSummary
            selectedRole={selectedRole}
            positions={selectedAssignments?.positions ?? []}
            employees={selectedAssignments?.employees ?? []}
            dirtySelectedRole={dirtySelectedRole}
          />

          <AISuggestionsPanel
            suggestions={visibleSuggestions}
            onSuggestionAction={handleSuggestionAction}
          />
        </div>
      </div>
    </div>
  );
}
