"use client";

import { useCan } from "@/hooks/useCan";
import { useProfile } from "@/hooks/useProfile";

const BILLING_ROLES = new Set(["owner", "admin", "company_admin"]);

/** Matches pack checkout auth: billing.manage, or an owner/admin role, unless billing is denied. */
export function useCanPurchasePacks() {
  const { profile, loading: profileLoading } = useProfile();
  const { can, isLoading, getSource } = useCan();
  const loading = profileLoading || isLoading;
  const denied = !loading && getSource("billing.manage") === "deny_override";
  const role = (profile?.role ?? "").toLowerCase();
  const canBuy =
    !loading &&
    !denied &&
    (can("billing.manage") || BILLING_ROLES.has(role));

  return { canBuy, loading };
}
