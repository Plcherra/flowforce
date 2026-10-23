export type TaskCreateScope = {
  self: boolean;
  levels: number[];
  userIds: string[];
};

export type TaskCreateGrant = {
  id: string;
  granteeId: string;
  canGrant: boolean;
  levels: number[];
  userIds: string[];
  revoked: boolean;
};

export function defaultTaskCreateScope(level: number): TaskCreateScope {
  if (level <= 1) return { self: true, levels: [], userIds: [] };
  return { self: true, levels: [level - 1], userIds: [] };
}

export function grantTaskCreation(input: {
  grants: readonly TaskCreateGrant[];
  grant: TaskCreateGrant;
  actorCanGrant: boolean;
}): TaskCreateGrant[] {
  if (!input.actorCanGrant) return [...input.grants];
  return [...input.grants, { ...input.grant, revoked: false }];
}

export function revokeTaskCreationGrant(
  grants: readonly TaskCreateGrant[],
  grantId: string,
): TaskCreateGrant[] {
  return grants.map((grant) =>
    grant.id === grantId ? { ...grant, revoked: true } : grant,
  );
}

export function effectiveTaskCreateScope(
  level: number,
  granteeId: string,
  grants: readonly TaskCreateGrant[],
): TaskCreateScope {
  const base = defaultTaskCreateScope(level);
  const levels = new Set(base.levels);
  const userIds = new Set(base.userIds);
  for (const grant of grants) {
    if (grant.granteeId !== granteeId || grant.revoked) continue;
    for (const targetLevel of grant.levels) levels.add(targetLevel);
    for (const userId of grant.userIds) userIds.add(userId);
  }
  return {
    self: base.self,
    levels: [...levels].sort((left, right) => left - right),
    userIds: [...userIds].sort(),
  };
}

export function canGrantTaskCreation(
  grants: readonly TaskCreateGrant[],
  personId: string,
  isOwner: boolean,
): boolean {
  if (isOwner) return true;
  return grants.some(
    (grant) => grant.granteeId === personId && grant.canGrant && !grant.revoked,
  );
}
