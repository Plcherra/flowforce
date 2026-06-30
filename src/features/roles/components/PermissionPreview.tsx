/**
 * Permission preview component
 */

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { RoleKey } from "../types/permissions";
import { ROLE_LABELS, ROLE_ACCENTS } from "../constants/roles";
import { formatPermissionLabel } from "../utils/permissionHelpers";

interface PermissionPreviewProps {
  selectedRole: RoleKey;
  activeModules: Array<{
    id: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }>;
  activePermissions: string[];
  dirtySelectedRole: boolean;
  onResetRole: (role: RoleKey) => void;
}

export function PermissionPreview({
  selectedRole,
  activeModules,
  activePermissions,
  dirtySelectedRole,
  onResetRole,
}: PermissionPreviewProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>Live Permission Preview</CardTitle>
            <CardDescription>
              Real-time view of permissions granted to the selected role.
            </CardDescription>
          </div>
          {selectedRole !== "owner" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onResetRole(selectedRole)}
            >
              Reset {ROLE_LABELS[selectedRole]}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-center gap-2">
          <Badge className={cn("border", ROLE_ACCENTS[selectedRole])}>
            {ROLE_LABELS[selectedRole]}
          </Badge>
          {dirtySelectedRole && <Badge variant="secondary">Pending save</Badge>}
        </div>
        <div className="mt-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Active modules
          </p>
          {activeModules.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">
              No modules enabled.
            </p>
          ) : (
            <div className="mt-2 flex flex-wrap gap-2">
              {activeModules.map((module) => (
                <Badge key={`${selectedRole}-${module.id}`} variant="outline">
                  <module.icon className="mr-1 h-3 w-3" />
                  {module.label}
                </Badge>
              ))}
            </div>
          )}
        </div>

        <div className="mt-6 space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Permissions granted ({activePermissions.length})
          </p>
          {activePermissions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Toggle modules on to grant feature access for this role.
            </p>
          ) : (
            <ScrollArea className="max-h-48 rounded-md border">
              <div className="flex flex-wrap gap-2 p-3 text-xs">
                {activePermissions.slice(0, 24).map((permission) => (
                  <Badge
                    key={permission}
                    variant="secondary"
                    className="text-[11px]"
                  >
                    {formatPermissionLabel(permission)}
                  </Badge>
                ))}
                {activePermissions.length > 24 && (
                  <Badge variant="outline" className="text-[11px]">
                    +{activePermissions.length - 24} more
                  </Badge>
                )}
              </div>
            </ScrollArea>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
