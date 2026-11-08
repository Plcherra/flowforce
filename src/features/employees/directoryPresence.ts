export function accessLevelKey(role: string | null | undefined) {
  const value = (role ?? "").toLowerCase();
  if (value === "employee" || value === "staff") return "hireActivity.accessStaff";
  if (value === "manager" || value === "supervisor") return "hireActivity.accessManager";
  if (value === "administrator" || value === "admin") return "hireActivity.accessAdmin";
  if (value === "owner") return "hireActivity.accessOwner";
  return null;
}

export function directoryMembership(employee: {
  invitePending?: boolean;
  employment_status?: string | null;
}) {
  if (employee.invitePending) return "invited" as const;
  if ((employee.employment_status ?? "").toLowerCase() === "active") return "active" as const;
  return "other" as const;
}
