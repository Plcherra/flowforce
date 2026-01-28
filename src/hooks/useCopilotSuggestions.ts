import { useMemo } from "react";

type SuggestionRoleOption = {
  id: string;
  name: string;
};

type SuggestionContext = {
  role?: string | null;
  department?: string | null;
  engagement?: number | null;
  availableRoles?: SuggestionRoleOption[];
};

export type CopilotSuggestion = {
  id: string;
  message: string;
  roleId?: string;
  metadata?: Record<string, unknown>;
};

type CopilotOptions = {
  context?: SuggestionContext;
  onAccept?: (suggestion: CopilotSuggestion) => void;
};

type CopilotResult = {
  items: CopilotSuggestion[];
  accept: (item: CopilotSuggestion) => void;
};

export function useCopilotSuggestions(
  _namespace: string,
  options: CopilotOptions = {},
): CopilotResult {
  const { context, onAccept } = options;
  const contextKey = JSON.stringify(context ?? {});

  const items = useMemo(() => {
    if (!context) return [];

    const availableRoles = context.availableRoles ?? [];
    const lowerRole = context.role?.toLowerCase() ?? "";
    const suggestions: CopilotSuggestion[] = [];

    const findRole = (match: string) =>
      availableRoles.find((role) =>
        role.name.toLowerCase().includes(match.toLowerCase()),
      );

    const supervisorRole = findRole("supervisor");
    if (lowerRole === "staff" && supervisorRole) {
      suggestions.push({
        id: "promotion-supervisor",
        message: `Promote this employee to ${supervisorRole.name}?`,
        roleId: supervisorRole.id,
        metadata: { recommendation: "promotion" },
      });
    }

    const coverageRole = findRole("manager") ?? findRole("lead");
    if (coverageRole) {
      suggestions.push({
        id: "coverage-assignment",
        message: `Assign temporary ${coverageRole.name} permissions for coverage?`,
        roleId: coverageRole.id,
        metadata: { recommendation: "temporary-coverage" },
      });
    }

    if (context.engagement != null && context.engagement < 0.35) {
      const mentorRole = findRole("mentor") ?? supervisorRole;
      suggestions.push({
        id: "mentor-support",
        message: mentorRole
          ? `Pair with a ${mentorRole.name} mentor to boost engagement?`
          : "Schedule a development check-in to boost engagement?",
        roleId: mentorRole?.id,
        metadata: { recommendation: "engagement-support" },
      });
    }

    if (context.department) {
      suggestions.push({
        id: "department-cross-training",
        message: `Rotate this teammate to support ${context.department} for cross-training?`,
        metadata: { recommendation: "cross-training" },
      });
    }

    return suggestions;
  }, [contextKey]);

  const accept = (item: CopilotSuggestion) => {
    onAccept?.(item);
  };

  return { items, accept };
}

export function useCopilotSuggestion(
  namespace: string,
  options?: CopilotOptions,
) {
  return useCopilotSuggestions(namespace, options);
}
