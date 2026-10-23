import {
  canGrantTaskCreation,
  grantTaskCreation,
  revokeTaskCreationGrant,
  type TaskCreateGrant,
} from "./taskCreateScope";
import { readTaskCreateGrants } from "@/features/tasks/utils/taskAssigneeScope";

function configRecord(config: unknown): Record<string, unknown> {
  if (typeof config === "string") {
    try {
      const parsed = JSON.parse(config) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return { ...(parsed as Record<string, unknown>) };
      }
    } catch {
      return {};
    }
  }
  if (config && typeof config === "object" && !Array.isArray(config)) {
    return { ...(config as Record<string, unknown>) };
  }
  return {};
}

export function writeTaskCreateGrants(
  config: unknown,
  grants: readonly TaskCreateGrant[],
): Record<string, unknown> {
  return { ...configRecord(config), taskCreateGrants: grants };
}

export function applyTaskCreateGrant(input: {
  config: unknown;
  actorId: string;
  isOwner: boolean;
  action: "grant" | "revoke";
  grant?: TaskCreateGrant;
  grantId?: string;
}):
  | { ok: true; config: Record<string, unknown>; grants: TaskCreateGrant[] }
  | { ok: false; reason: "forbidden" | "cannot-pass-grant" } {
  const current = readTaskCreateGrants(input.config);
  if (!canGrantTaskCreation(current, input.actorId, input.isOwner)) {
    return { ok: false, reason: "forbidden" };
  }
  if (input.action === "revoke") {
    const grants = revokeTaskCreationGrant(current, input.grantId ?? "");
    return { ok: true, grants, config: writeTaskCreateGrants(input.config, grants) };
  }
  if (!input.grant) return { ok: false, reason: "forbidden" };
  if (input.grant.canGrant && !input.isOwner) {
    return { ok: false, reason: "cannot-pass-grant" };
  }
  const grants = grantTaskCreation({
    grants: current,
    grant: input.grant,
    actorCanGrant: true,
  });
  return { ok: true, grants, config: writeTaskCreateGrants(input.config, grants) };
}
