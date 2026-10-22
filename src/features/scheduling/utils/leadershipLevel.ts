import { normalizeProductRoleKey } from "@/features/roles/constants/productRoles";

export type LeadershipLevelInput = {
  productLevel?: string | null;
  name?: string | null;
  hierarchyLevel?: number | null;
};

const LEADERSHIP = new Set(["manager", "admin", "owner"]);

export function isLeadershipLevel(input: LeadershipLevelInput): boolean {
  const named = normalizeProductRoleKey(input.name);
  const product = normalizeProductRoleKey(input.productLevel);
  if (named === "staff" || product === "staff") return false;
  if ((named && LEADERSHIP.has(named)) || (product && LEADERSHIP.has(product))) {
    return true;
  }
  const hierarchy = input.hierarchyLevel;
  return hierarchy != null && hierarchy >= 2 && hierarchy <= 4;
}
