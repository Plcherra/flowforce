// Permission system exports
export {
  withPermission,
  PermissionGuard,
  MultiPermissionGuard,
  RouteGuard,
  type WithPermissionInjectedProps,
  type WithPermissionConfig,
} from "./withPermission";

export { PermissionButton, MultiPermissionButton } from "./PermissionButton";

// Hooks
export {
  useCan,
  useCanCheck,
  useCanMultiple,
  useAllPermissions,
} from "@/hooks/useCan";

// Core resolver
export {
  PermissionResolver,
  createPermissionResolver,
  serverResolvePermission,
  type PermissionContext,
  type RolePermissions,
} from "@/lib/permissions/resolver";
