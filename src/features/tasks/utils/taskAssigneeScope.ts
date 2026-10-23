import {
  effectiveTaskCreateScope,
  type TaskCreateGrant,
  type TaskCreateScope,
} from "@/features/roles/constants/taskCreateScope";

export type ScopedPerson = {
  id: string;
  level: number;
  name: string;
};

export function readTaskCreateGrants(config: unknown): TaskCreateGrant[] {
  let record: Record<string, unknown> | null = null;
  if (typeof config === "string") {
    try {
      record = JSON.parse(config) as Record<string, unknown>;
    } catch {
      record = null;
    }
  } else if (config && typeof config === "object" && !Array.isArray(config)) {
    record = config as Record<string, unknown>;
  }
  const raw = record?.taskCreateGrants;
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((entry) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) return [];
    const grant = entry as Record<string, unknown>;
    if (typeof grant.id !== "string" || typeof grant.granteeId !== "string") return [];
    const levels = Array.isArray(grant.levels)
      ? grant.levels.filter((level): level is number => typeof level === "number")
      : [];
    const userIds = Array.isArray(grant.userIds)
      ? grant.userIds.filter((id): id is string => typeof id === "string")
      : [];
    return [
      {
        id: grant.id,
        granteeId: grant.granteeId,
        canGrant: grant.canGrant === true,
        levels,
        userIds,
        revoked: grant.revoked === true,
      },
    ];
  });
}

export function peopleWithinTaskCreateScope(input: {
  selfId: string;
  scope: TaskCreateScope;
  people: readonly ScopedPerson[];
}): ScopedPerson[] {
  const levels = new Set(input.scope.levels);
  const users = new Set(input.scope.userIds);
  return input.people.filter(
    (person) =>
      (input.scope.self && person.id === input.selfId) ||
      levels.has(person.level) ||
      users.has(person.id),
  );
}

export function scopeForPerson(input: {
  level: number;
  personId: string;
  grants: readonly TaskCreateGrant[];
}): TaskCreateScope {
  return effectiveTaskCreateScope(input.level, input.personId, input.grants);
}
