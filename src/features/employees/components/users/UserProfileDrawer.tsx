import { Suspense, lazy, useEffect, useState } from "react";
import { User, Shield, FileText, Crown, Users } from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { UserOverviewTab } from "./UserOverviewTab";
import type { Tables } from "@/integrations/supabase/public-types";
import { useFeatureFlag } from "@/hooks/useFeatureFlags";

type Profile = Tables<"profiles">;

interface UserProfileDrawerProps {
  user: Profile | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const UserPermissionsTabLazy = lazy(() =>
  import("./UserPermissionsTab").then((module) => ({
    default: module.UserPermissionsTab,
  })),
);

const UserAuditTabLazy = lazy(() =>
  import("./UserAuditTab").then((module) => ({ default: module.UserAuditTab })),
);

export function UserProfileDrawer({
  user,
  open,
  onOpenChange,
}: UserProfileDrawerProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const auditEnabled = useFeatureFlag("admin.auditLogs");

  useEffect(() => {
    if (!auditEnabled && activeTab === "audit") {
      setActiveTab("overview");
    }
  }, [auditEnabled, activeTab]);

  useEffect(() => {
    if (user) {
      setActiveTab("overview");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- stable hook deps
  }, [user?.id]);

  if (!user) return null;

  const getRoleIcon = (role: string) => {
    switch (role.toLowerCase()) {
      case "owner":
        return <Crown className="h-4 w-4" />;
      case "manager":
      case "admin":
        return <Shield className="h-4 w-4" />;
      case "supervisor":
        return <Users className="h-4 w-4" />;
      default:
        return <User className="h-4 w-4" />;
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role.toLowerCase()) {
      case "owner":
        return "default";
      case "manager":
      case "admin":
        return "secondary";
      case "supervisor":
        return "outline";
      default:
        return "secondary";
    }
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[95vh]">
        <div className="flex h-full flex-col">
          <DrawerHeader className="border-b px-6 py-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={user.avatar_url || undefined} />
                  <AvatarFallback className="text-lg">
                    {user.first_name[0]}
                    {user.last_name[0]}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <DrawerTitle className="text-2xl">
                    {user.first_name} {user.last_name}
                  </DrawerTitle>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Badge
                      variant={getRoleBadgeVariant(user.role)}
                      className="flex items-center gap-1"
                    >
                      {getRoleIcon(user.role)}
                      <span className="capitalize">{user.role}</span>
                    </Badge>
                    <Badge
                      variant={
                        user.employment_status === "active"
                          ? "default"
                          : "secondary"
                      }
                      className="capitalize"
                    >
                      {user.employment_status}
                    </Badge>
                    {user.employee_id && (
                      <Badge
                        variant="outline"
                        className="text-[11px] uppercase tracking-wide"
                      >
                        ID {user.employee_id}
                      </Badge>
                    )}
                  </div>
                  <p className="mt-2 break-all text-sm text-muted-foreground">
                    {user.email}
                  </p>
                </div>
              </div>
              <DrawerClose asChild>
                <Button variant="outline" size="sm">
                  Close
                </Button>
              </DrawerClose>
            </div>
          </DrawerHeader>

          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="flex h-full flex-col"
          >
            <div className="space-y-4 px-6 pt-4">
              <TabsList
                className={`grid w-full gap-2 ${auditEnabled ? "grid-cols-3" : "grid-cols-2"}`}
              >
                <TabsTrigger
                  value="overview"
                  className="flex items-center gap-2"
                >
                  <User className="h-4 w-4" />
                  Profile
                </TabsTrigger>
                <TabsTrigger
                  value="permissions"
                  className="flex items-center gap-2"
                >
                  <Shield className="h-4 w-4" />
                  Access
                </TabsTrigger>
                {auditEnabled && (
                  <TabsTrigger
                    value="audit"
                    className="flex items-center gap-2"
                  >
                    <FileText className="h-4 w-4" />
                    Activity
                  </TabsTrigger>
                )}
              </TabsList>
              <Separator />
            </div>

            <div className="flex-1 overflow-hidden">
              <div className="h-full overflow-y-auto px-6 pb-6">
                <TabsContent value="overview" className="mt-4 space-y-4">
                  <UserOverviewTab user={user} />
                </TabsContent>

                <TabsContent value="permissions" className="mt-4 space-y-4">
                  <Suspense
                    fallback={
                      <TabPanelSkeleton message="Loading access controls..." />
                    }
                  >
                    <UserPermissionsTabLazy user={user} />
                  </Suspense>
                </TabsContent>

                {auditEnabled && (
                  <TabsContent value="audit" className="mt-4 space-y-4">
                    <Suspense
                      fallback={
                        <TabPanelSkeleton message="Loading activity timeline..." />
                      }
                    >
                      <UserAuditTabLazy user={user} />
                    </Suspense>
                  </TabsContent>
                )}
              </div>
            </div>
          </Tabs>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

function TabPanelSkeleton({ message }: { message: string }) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">{message}</p>
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-24 w-full" />
    </div>
  );
}
