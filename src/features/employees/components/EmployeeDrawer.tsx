import { useEffect, useMemo, useState } from "react";
import type { Tables } from "@/integrations/supabase/public-types";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { AccessControlPanel } from "./AccessControlPanel";
import { InviteEmployeePanel } from "./InviteEmployeePanel";
import { RoleConfigPanel } from "./RoleConfigPanel";
import { UserOverviewTab } from "@/features/employees/components/users/UserOverviewTab";
import { usePermission } from "@/hooks/usePermission";
import "@/styles/employee.css";

type Profile = Tables<"profiles">;

export type EmployeeDrawerTab = "profile" | "access" | "invite" | "roles";

interface EmployeeDrawerProps {
  employee: Profile | null;
  open: boolean;
  initialTab?: EmployeeDrawerTab;
  onOpenChange: (open: boolean) => void;
}

type DrawerTabConfig = {
  value: EmployeeDrawerTab;
  label: string;
  enabled: boolean;
};

export function EmployeeDrawer({
  employee,
  open,
  initialTab = "profile",
  onOpenChange,
}: EmployeeDrawerProps) {
  const [activeTab, setActiveTab] = useState<EmployeeDrawerTab>("profile");
  const canManageAccess = usePermission("manage_roles");
  const canInvite = usePermission("invite_employees");
  const canManageRoles = usePermission("assign_permissions");

  const hasEmployee = !!employee;

  const tabs = useMemo<DrawerTabConfig[]>(() => {
    const baseTabs: DrawerTabConfig[] = [
      { value: "profile", label: "Profile", enabled: hasEmployee },
      {
        value: "access",
        label: "Access",
        enabled: hasEmployee && canManageAccess,
      },
      { value: "invite", label: "Invitations", enabled: canInvite },
      {
        value: "roles",
        label: "Roles & Permissions",
        enabled: hasEmployee && canManageRoles,
      },
    ];
    return baseTabs.filter((tab) => tab.enabled);
  }, [canInvite, canManageAccess, canManageRoles, hasEmployee]);

  useEffect(() => {
    if (!tabs.length) {
      setActiveTab("profile");
      return;
    }

    const fallback = tabs[0]?.value ?? "profile";
    if (!tabs.some((tab) => tab.value === initialTab)) {
      setActiveTab(fallback);
      return;
    }

    setActiveTab(initialTab);
  }, [initialTab, tabs]);

  useEffect(() => {
    if (employee) {
      setActiveTab((current) => (current === "invite" ? current : "profile"));
    }
  }, [employee?.id]);

  if (!tabs.length) {
    return null;
  }

  const handleTabChange = (value: string) => {
    setActiveTab(value as EmployeeDrawerTab);
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[95vh]">
        <div className="h-full flex flex-col">
          <DrawerHeader className="flex-none border-b px-6 py-4">
            <HeaderContent employee={employee} />
          </DrawerHeader>

          <div className="flex-1 overflow-hidden px-6 py-4 drawer-body">
            <Tabs
              value={activeTab}
              onValueChange={handleTabChange}
              className="flex h-full flex-col"
            >
              <TabsList className="mb-4 flex w-full flex-wrap gap-2">
                {tabs.map((tab) => (
                  <TabsTrigger key={tab.value} value={tab.value}>
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>

              {hasEmployee && (
                <TabsContent
                  value="profile"
                  className="mt-0 flex-1 overflow-y-auto"
                >
                  <UserOverviewTab user={employee} />
                </TabsContent>
              )}

              {hasEmployee && canManageAccess && (
                <TabsContent
                  value="access"
                  className="mt-0 flex-1 overflow-y-auto"
                >
                  <AccessControlPanel
                    employeeId={employee.id}
                    employee={employee}
                  />
                </TabsContent>
              )}

              {canInvite && (
                <TabsContent
                  value="invite"
                  className="mt-0 flex-1 overflow-y-auto"
                >
                  <InviteEmployeePanel />
                </TabsContent>
              )}

              {hasEmployee && canManageRoles && (
                <TabsContent
                  value="roles"
                  className="mt-0 flex-1 overflow-y-auto"
                >
                  <RoleConfigPanel
                    employeeId={employee.id}
                    employee={employee}
                  />
                </TabsContent>
              )}
            </Tabs>
          </div>

          <footer className="flex-none border-t px-6 py-4 text-right">
            <DrawerClose asChild>
              <Button variant="outline">Close</Button>
            </DrawerClose>
          </footer>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

function HeaderContent({ employee }: { employee: Profile | null }) {
  if (!employee) {
    return (
      <div className="flex items-center justify-between gap-4">
        <div>
          <DrawerTitle className="text-2xl">Team Invitations</DrawerTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Invite teammates or resend pending invitations without leaving the
            directory.
          </p>
        </div>
      </div>
    );
  }

  const initials =
    `${employee.first_name?.[0] ?? ""}${employee.last_name?.[0] ?? ""}`.toUpperCase() ||
    "TM";

  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div className="flex items-center gap-4">
        <Avatar className="h-16 w-16">
          <AvatarImage
            src={employee.avatar_url || undefined}
            alt={`${employee.first_name} ${employee.last_name}`}
          />
          <AvatarFallback className="text-lg font-semibold">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div>
          <DrawerTitle className="text-2xl">
            {employee.first_name} {employee.last_name}
          </DrawerTitle>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {employee.role && (
              <Badge variant="secondary" className="capitalize">
                {employee.role}
              </Badge>
            )}
            {employee.employment_status && (
              <Badge
                variant={
                  employee.employment_status === "active"
                    ? "default"
                    : "outline"
                }
                className="capitalize"
              >
                {employee.employment_status}
              </Badge>
            )}
            {employee.employee_id && (
              <Badge
                variant="outline"
                className="text-xs uppercase tracking-wide"
              >
                ID {employee.employee_id}
              </Badge>
            )}
          </div>
          <p className="mt-2 break-all text-sm text-muted-foreground">
            {employee.email}
          </p>
        </div>
      </div>
    </div>
  );
}
