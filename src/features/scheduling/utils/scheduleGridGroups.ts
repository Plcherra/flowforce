export const GROUP_EMPLOYEE_THRESHOLD = 25;

export type StoreRole = {
  store: string;
  role: string;
};

export type GridShiftLabel = {
  location?: string | null;
  role?: string | null;
  job_position?: { name?: string | null } | null;
};

export type GridRow<T> =
  | { kind: "section"; id: string; store: string; role: string; count: number }
  | { kind: "employee"; employee: T };

export function personStoreAndRole(shifts: GridShiftLabel[]): StoreRole {
  const counts = new Map<string, StoreRole & { count: number }>();
  for (const shift of shifts) {
    const store = shift.location?.trim() || "No store";
    const role = shift.role?.trim() || shift.job_position?.name?.trim() || "No role";
    const key = `${store}\0${role}`;
    const current = counts.get(key) ?? { store, role, count: 0 };
    current.count += 1;
    counts.set(key, current);
  }
  let best: StoreRole & { count: number } = {
    store: "No store",
    role: "No role",
    count: 0,
  };
  for (const value of counts.values()) {
    if (value.count > best.count) best = value;
  }
  return { store: best.store, role: best.role };
}

export function groupGridRows<T extends { id: string; store?: string; role?: string }>(
  employees: T[],
  collapsed: ReadonlySet<string>,
): GridRow<T>[] {
  if (employees.length < GROUP_EMPLOYEE_THRESHOLD) {
    return employees.map((employee) => ({ kind: "employee" as const, employee }));
  }

  const sections = new Map<string, T[]>();
  for (const employee of employees) {
    const store = employee.store?.trim() || "No store";
    const role = employee.role?.trim() || "No role";
    const id = `${store}\0${role}`;
    const list = sections.get(id) ?? [];
    list.push(employee);
    sections.set(id, list);
  }

  const rows: GridRow<T>[] = [];
  for (const id of [...sections.keys()].sort()) {
    const people = sections.get(id) ?? [];
    const [store, role] = id.split("\0");
    rows.push({
      kind: "section",
      id,
      store: store ?? "No store",
      role: role ?? "No role",
      count: people.length,
    });
    if (!collapsed.has(id)) {
      for (const employee of people) rows.push({ kind: "employee", employee });
    }
  }
  return rows;
}
