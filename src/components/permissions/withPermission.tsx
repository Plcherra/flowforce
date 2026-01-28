import React, { ComponentType } from "react";
import { useCan } from "@/hooks/useCan";
import { type PermissionKey } from "@/hooks/useUserPermissions";

// Props that will be injected by the HOC
export interface WithPermissionInjectedProps {
  hasPermission: boolean;
  permissionSource: "role" | "allow_override" | "deny_override";
  canCheck: (key: PermissionKey) => boolean;
}

// Configuration for the HOC
export interface WithPermissionConfig {
  permissionKey: PermissionKey;
  fallback?: React.ComponentType<any> | React.ReactElement | null;
  renderWhenDenied?: boolean; // If true, render component but with hasPermission: false
  loadingComponent?: React.ComponentType<any> | React.ReactElement;
}

/**
 * Higher-Order Component for permission-based rendering
 * @param config - Permission configuration
 * @returns HOC function
 */
export function withPermission<P extends object>(config: WithPermissionConfig) {
  const {
    permissionKey,
    fallback = null,
    renderWhenDenied = false,
    loadingComponent = null,
  } = config;

  return function WithPermissionHOC(
    WrappedComponent: ComponentType<P & WithPermissionInjectedProps>,
  ): ComponentType<P> {
    const ComponentWithPermission = (props: P) => {
      const { can, getSource, isLoading } = useCan();

      // Show loading component if provided and still loading
      if (isLoading && loadingComponent) {
        if (React.isValidElement(loadingComponent)) {
          return loadingComponent;
        }
        // TypeScript knows it's a ComponentType now
        const LoadingComponent = loadingComponent as ComponentType<any>;
        return <LoadingComponent />;
      }

      const hasPermission = can(permissionKey);
      const permissionSource = getSource(permissionKey);

      // If no permission and not rendering when denied, show fallback
      if (!hasPermission && !renderWhenDenied) {
        if (fallback === null) return null;

        if (React.isValidElement(fallback)) {
          return fallback;
        }
        // TypeScript knows it's a ComponentType now
        const FallbackComponent = fallback as ComponentType<any>;
        return <FallbackComponent {...props} />;
      }

      // Render the wrapped component with injected props
      return (
        <WrappedComponent
          {...props}
          hasPermission={hasPermission}
          permissionSource={permissionSource}
          canCheck={can}
        />
      );
    };

    ComponentWithPermission.displayName = `withPermission(${
      WrappedComponent.displayName || WrappedComponent.name || "Component"
    })`;

    return ComponentWithPermission;
  };
}

/**
 * Simple permission guard component
 */
interface PermissionGuardProps {
  permission: PermissionKey;
  fallback?: React.ReactNode;
  children: React.ReactNode;
  renderWhenDenied?: boolean;
}

export function PermissionGuard({
  permission,
  fallback = null,
  children,
  renderWhenDenied = false,
}: PermissionGuardProps) {
  const { can, isLoading } = useCan();

  if (isLoading) return null;

  const hasPermission = can(permission);

  if (!hasPermission && !renderWhenDenied) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

/**
 * Multiple permission guard with AND/OR logic
 */
interface MultiPermissionGuardProps {
  permissions: PermissionKey[];
  strategy?: "any" | "all";
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export function MultiPermissionGuard({
  permissions,
  strategy = "any",
  fallback = null,
  children,
}: MultiPermissionGuardProps) {
  const { canAny, canAll, isLoading } = useCan();

  if (isLoading) return null;

  const hasPermission =
    strategy === "any" ? canAny(permissions) : canAll(permissions);

  if (!hasPermission) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

/**
 * Route guard for protecting entire pages/routes
 */
interface RouteGuardProps {
  permission: PermissionKey;
  redirectTo?: string;
  fallbackComponent?: React.ComponentType;
  children: React.ReactNode;
}

export function RouteGuard({
  permission,
  redirectTo = "/unauthorized",
  fallbackComponent: FallbackComponent,
  children,
}: RouteGuardProps) {
  const { can, isLoading } = useCan();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const hasPermission = can(permission);

  if (!hasPermission) {
    if (FallbackComponent) {
      return <FallbackComponent />;
    }

    // In a real app, you might want to use React Router's Navigate component
    // For now, just show a simple unauthorized message
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">
            Access Denied
          </h2>
          <p className="text-gray-600">
            You don't have permission to access this page.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
