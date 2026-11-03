export type SchedulablePosition = {
  id: string;
  name: string | null | undefined;
  department_id?: string | null;
};

export type DepartmentLabel = {
  id: string;
  name: string | null | undefined;
};

export type PositionDepartmentGroup = {
  departmentId: string | null;
  departmentName: string | null;
  positions: { id: string; name: string }[];
};

function clean(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : null;
}

/** Company positions, grouped by department. Positions with no department come last. */
export function groupPositionsByDepartment(
  positions: readonly SchedulablePosition[],
  departments: readonly DepartmentLabel[],
): PositionDepartmentGroup[] {
  const nameById = new Map<string, string | null>();
  for (const department of departments) {
    const id = clean(department.id);
    if (!id) continue;
    nameById.set(id, clean(department.name));
  }

  const groups = new Map<string, PositionDepartmentGroup>();
  for (const position of positions) {
    const id = clean(position.id);
    const name = clean(position.name);
    if (!id || !name) continue;
    const departmentId = clean(position.department_id);
    const key = departmentId ?? "";
    let group = groups.get(key);
    if (!group) {
      group = {
        departmentId,
        departmentName: departmentId ? (nameById.get(departmentId) ?? null) : null,
        positions: [],
      };
      groups.set(key, group);
    }
    group.positions.push({ id, name });
  }

  for (const group of groups.values()) {
    group.positions.sort((left, right) =>
      left.name.localeCompare(right.name, undefined, { sensitivity: "base" }),
    );
  }

  return [...groups.values()].sort((left, right) => {
    if (!left.departmentName && right.departmentName) return 1;
    if (left.departmentName && !right.departmentName) return -1;
    const byName = (left.departmentName ?? "").localeCompare(
      right.departmentName ?? "",
      undefined,
      { sensitivity: "base" },
    );
    if (byName !== 0) return byName;
    return (left.departmentId ?? "").localeCompare(right.departmentId ?? "");
  });
}
