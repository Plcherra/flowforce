import { resolveProductLevel } from "@/features/roles/constants/productLevels";
import type { CompanyPolicyRecord } from "@/features/scheduling/utils/companyPolicy";
import {
  teamRequestBalanceLabel,
  type TimeOffUsage,
} from "@/features/scheduling/utils/timeOffPolicy";
import type { TimeOffRequest } from "@/types/scheduling-unified";

type PersonRow = {
  id: string;
  role_id?: string | null;
  location_id?: string | null;
};

type RoleRow = {
  id: string;
  product_level?: string | null;
  name?: string | null;
  hierarchy_level?: number | null;
};

export function usageByRequester(requests: TimeOffRequest[]): Map<string, TimeOffUsage[]> {
  const usage = new Map<string, TimeOffUsage[]>();
  for (const row of requests) {
    if (!row.user_id) continue;
    const list = usage.get(row.user_id) ?? [];
    list.push({
      policyId: row.policy_id ?? "",
      startDate: row.start_date ?? "",
      endDate: row.end_date ?? "",
      status: row.status ?? "",
      userId: row.user_id,
    });
    usage.set(row.user_id, list);
  }
  return usage;
}

function personSubject(employees: PersonRow[], roles: RoleRow[], userId: string) {
  const employee = employees.find((person) => person.id === userId);
  const role = roles.find((item) => item.id === employee?.role_id);
  return {
    roleId: employee?.role_id ?? null,
    locationId: employee?.location_id ?? null,
    level: role
      ? resolveProductLevel({
          product_level: role.product_level,
          name: role.name,
          hierarchy_level: role.hierarchy_level,
        })
      : null,
  };
}

export function TeamRequestBalance({
  request,
  companyId,
  employees,
  roles,
  policies,
  usageByUser,
  asOf,
}: {
  request: TimeOffRequest;
  companyId: string;
  employees: PersonRow[];
  roles: RoleRow[];
  policies: CompanyPolicyRecord[];
  usageByUser: Map<string, TimeOffUsage[]>;
  asOf: string;
}) {
  if (!request.policy_id || !request.user_id) return null;
  const label = teamRequestBalanceLabel({
    policyId: request.policy_id,
    userId: request.user_id,
    companyId,
    ...personSubject(employees, roles, request.user_id),
    policies,
    usage: usageByUser.get(request.user_id) ?? [],
    asOf,
  });
  if (!label) return null;
  return (
    <p className="text-sm text-muted-foreground" data-testid="time-off-requester-balance">
      {label}
    </p>
  );
}
