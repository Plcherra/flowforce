import { ReactNode } from "react";
import { usePermissions } from "@/hooks/usePermissions";
import { useCan } from "@/hooks/useCan";

interface RoleGuardProps {
  children: ReactNode;
  roles?: string[];
  permission?: string;
  fallback?: ReactNode;
}

export default function RoleGuard({
  children,
  roles,
  permission,
  fallback = null,
}: RoleGuardProps) {
  const { hasRole } = usePermissions();
  const { can, isLoading } = useCan();

  // Don't show fallback while loading
  if (isLoading) {
    return <>{children}</>;
  }

  if (roles && !hasRole(roles)) {
    return <>{fallback}</>;
  }

  if (permission && !can(permission as any)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
