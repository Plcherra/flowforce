import React from "react";
import { useCan } from "@/hooks/useCan";
import type { PermissionKey } from "@/hooks/useUserPermissions";

interface IfCanProps {
  children: React.ReactNode;
  permission: PermissionKey;
  fallback?: React.ReactNode;
}

/**
 * Simple component for conditional rendering based on permissions
 * Usage: <IfCan permission="inventory.view">Content only visible with permission</IfCan>
 */
export function IfCan({ children, permission, fallback = null }: IfCanProps) {
  const { can } = useCan(permission);

  return <>{can ? children : fallback}</>;
}
