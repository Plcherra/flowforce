import React, { useMemo, useState } from "react";
import { Link } from "@/lib/router-adapter";
import {
  Users,
  UserCheck,
  UserCog,
  CalendarRange,
  Sparkles,
  Shield,
  Layers,
  Plus,
  Edit,
  Trash2,
  AlertTriangle,
  Link2,
} from "lucide-react";

import RoleGuard from "@/app-shell/guards/RoleGuard";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

import { usePositions, type Position } from "@/hooks/usePositions";
import { useCompanyRoles } from "@/hooks/useCompanyRoles";
import { useShiftTemplates } from "@/features/scheduling/hooks/useShiftTemplates";
import CreatePositionDialog from "@/features/positions/components/CreatePositionDialog";
import EditPositionDialog from "@/features/positions/components/EditPositionDialog";
import { PositionManagementDialog } from "@/features/positions/components/PositionManagementDialog";
import { UserPositionAssignment } from "@/features/positions/components/UserPositionAssignment";
import { AVAILABLE_SECTIONS } from "@/data/availableSections";

const ROLE_ORDER = ["staff", "supervisor", "manager", "admin"] as const;
type RoleKey = (typeof ROLE_ORDER)[number];

const ROLE_LABELS: Record<RoleKey, string> = {
  staff: "Staff",
  supervisor: "Supervisor",
  manager: "Manager",
  admin: "Admin",
};

const ROLE_BADGE_CLASSES: Record<RoleKey, string> = {
  staff: "bg-gray-100 text-gray-800",
  supervisor: "bg-green-100 text-green-800",
  manager: "bg-blue-100 text-blue-800",
  admin: "bg-red-100 text-red-800",
};

interface RoleAccessSummary {
  id: string;
  name: string;
  color: string;
  hierarchyLevel: number;
  permissions: Record<string, boolean>;
  positionCount: number;
  accessibleSections: string[];
  lockedSections: string[];
}

interface CopilotSuggestion {
  id: string;
  title: string;
  description: string;
}

type ShiftTemplateRecord = ReturnType<
  typeof useShiftTemplates
>["templates"][number];

const getRoleBadgeClass = (role: RoleKey) =>
  ROLE_BADGE_CLASSES[role] || "bg-gray-100 text-gray-800";

const formatPermissionKey = (key: string) =>
  key
    .replace(/([A-Z])/g, " $1")
    .replace(/\./g, " • ")
    .replace(/^./, (str) => str.toUpperCase());

const generateCopilotSuggestions = (
  positions: Position[],
  assignmentsByPosition: Map<string, number>,
  shiftTemplates: ShiftTemplateRecord[],
  roleAccessSummaries: RoleAccessSummary[],
): CopilotSuggestion[] => {
  const suggestions: CopilotSuggestion[] = [];

  if (positions.length === 0) {
    suggestions.push({
      id: "create-first",
      title: "Create your first position template",
      description:
        "Co-Pilot recommends starting with your core frontline roles so scheduling templates can link automatically.",
    });
  }

  const unlinkedTemplates = shiftTemplates.filter(
    (template) => !(template.position_id ?? template.job_position?.id),
  );

  if (unlinkedTemplates.length > 0) {
    suggestions.push({
      id: "link-templates",
      title: "Link scheduling templates to positions",
      description: `${unlinkedTemplates.length} shift ${
        unlinkedTemplates.length === 1 ? "template is" : "templates are"
      } not connected to a position. Linking them keeps headcount plans and permissions in sync.`,
    });
  }

  ROLE_ORDER.forEach((role) => {
    const rolePositions = positions.filter(
      (position) => position.role === role,
    );
    const templatesForRole = shiftTemplates.filter((template) => {
      const templateRole = template.job_position?.role as RoleKey | undefined;
      return templateRole === role;
    });

    if (
      templatesForRole.length > rolePositions.length * 2 &&
      templatesForRole.length > 0
    ) {
      suggestions.push({
        id: `increase-${role}-capacity`,
        title: `Add ${ROLE_LABELS[role]} capacity`,
        description: `Weekly coverage requires ${templatesForRole.length} ${ROLE_LABELS[
          role
        ].toLowerCase()} shifts but only ${
          rolePositions.length
        } position ${rolePositions.length === 1 ? "template exists" : "templates exist"}.`,
      });
    }

    if (templatesForRole.length > 0 && rolePositions.length === 0) {
      suggestions.push({
        id: `missing-${role}-position`,
        title: `Create a ${ROLE_LABELS[role]} position`,
        description: `Scheduling already references ${
          templatesForRole.length
        } ${ROLE_LABELS[role].toLowerCase()} shifts. Co-Pilot suggests adding a position template for assignments.`,
      });
    }
  });

  const overloadedPositions = positions
    .map((position) => ({
      position,
      count: assignmentsByPosition.get(position.id) ?? 0,
    }))
    .filter((item) => item.count >= 4);

  if (overloadedPositions.length > 0) {
    const nameList = overloadedPositions
      .slice(0, 2)
      .map((item) => item.position.name)
      .join(", ");

    suggestions.push({
      id: "rebalance",
      title: "Rebalance workload across positions",
      description: `${overloadedPositions.length} position${
        overloadedPositions.length > 1 ? "s have" : " has"
      } 4+ team members assigned (${nameList}${
        overloadedPositions.length > 2 ? ", …" : ""
      }). Consider splitting responsibilities or creating an additional template.`,
    });
  }

  const rolesMissingSections = roleAccessSummaries.filter(
    (summary) => summary.accessibleSections.length === 0,
  );

  if (rolesMissingSections.length > 0) {
    suggestions.push({
      id: "section-access",
      title: "Review section access defaults",
      description: `${rolesMissingSections.length} role${
        rolesMissingSections.length > 1 ? "s" : ""
      } currently ${
        rolesMissingSections.length > 1 ? "lack" : "lacks"
      } section access defaults. Align them with Sections & Permissions to avoid onboarding gaps.`,
    });
  }

  if (suggestions.length === 0) {
    suggestions.push({
      id: "healthy",
      title: "Team structure looks balanced",
      description:
        "Co-Pilot does not see any structural risks right now. Keep monitoring scheduling coverage and permission alignment as you scale.",
    });
  }

  return suggestions.slice(0, 4);
};

export default function PositionManagement() {
  const { positions, assignments, loading, deletePosition } = usePositions();
  const { roles, loading: rolesLoading } = useCompanyRoles();
  const { templates: shiftTemplates, loading: templatesLoading } =
    useShiftTemplates();

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(
    null,
  );
  const [activeTab, setActiveTab] = useState<
    "overview" | "positions" | "permissions"
  >("overview");

  const rolesArray = useMemo(
    () => (Array.isArray(roles) ? roles : []),
    [roles],
  );

  const assignmentsByPosition = useMemo(() => {
    const map = new Map<string, number>();
    assignments.forEach((assignment) => {
      if (!assignment?.is_active || !assignment?.position_id) {
        return;
      }
      map.set(
        assignment.position_id,
        (map.get(assignment.position_id) ?? 0) + 1,
      );
    });
    return map;
  }, [assignments]);

  const shiftTemplatesByPositionId = useMemo(() => {
    const map = new Map<string, number>();
    shiftTemplates.forEach((template) => {
      const positionId = template.position_id ?? template.job_position?.id;
      if (!positionId) {
        return;
      }
      map.set(positionId, (map.get(positionId) ?? 0) + 1);
    });
    return map;
  }, [shiftTemplates]);

  const linkedShiftTemplateCount = useMemo(
    () =>
      shiftTemplates.filter(
        (template) => template.position_id ?? template.job_position?.id,
      ).length,
    [shiftTemplates],
  );
  const unlinkedShiftTemplateCount =
    shiftTemplates.length - linkedShiftTemplateCount;

  const roleAccessSummaries = useMemo<RoleAccessSummary[]>(() => {
    return rolesArray.map((role) => {
      const accessibleSections = AVAILABLE_SECTIONS.filter((section) => {
        if (!section.permissions || section.permissions.length === 0) {
          return true;
        }
        return section.permissions.every(
          (permission) => (role.permissions?.[permission] ?? false) === true,
        );
      }).map((section) => section.name);

      const lockedSections = AVAILABLE_SECTIONS.filter((section) => {
        if (!section.permissions || section.permissions.length === 0) {
          return false;
        }
        return !section.permissions.every(
          (permission) => (role.permissions?.[permission] ?? false) === true,
        );
      }).map((section) => section.name);

      const normalizedRoleName = role.name?.toLowerCase?.() ?? "";
      const matchingRoleKey =
        ROLE_ORDER.find(
          (key) => ROLE_LABELS[key].toLowerCase() === normalizedRoleName,
        ) ?? null;

      const positionCount = matchingRoleKey
        ? positions.filter((position) => position.role === matchingRoleKey)
            .length
        : 0;

      return {
        id: role.id,
        name: role.name,
        color: role.color || "#6366f1",
        hierarchyLevel: role.hierarchy_level,
        permissions: role.permissions ?? {},
        positionCount,
        accessibleSections,
        lockedSections,
      };
    });
  }, [positions, rolesArray]);

  const totalSectionCoverage = useMemo(
    () =>
      roleAccessSummaries.reduce(
        (total, summary) => total + summary.accessibleSections.length,
        0,
      ),
    [roleAccessSummaries],
  );

  const positionsByRole = useMemo(
    () =>
      ROLE_ORDER.map((role) => ({
        role,
        label: ROLE_LABELS[role],
        positions: positions.filter((position) => position.role === role),
      })),
    [positions],
  );

  const copilotSuggestions = useMemo(
    () =>
      generateCopilotSuggestions(
        positions,
        assignmentsByPosition,
        shiftTemplates,
        roleAccessSummaries,
      ),
    [positions, assignmentsByPosition, shiftTemplates, roleAccessSummaries],
  );

  const activeAssignments = useMemo(
    () => assignments.filter((assignment) => assignment?.is_active).length,
    [assignments],
  );

  const summaryCards = [
    {
      title: "Active Positions",
      value: positions.length,
      description: "Templates available across the role hierarchy",
      icon: Users,
    },
    {
      title: "Active Assignments",
      value: activeAssignments,
      description: "Team members linked to a position",
      icon: UserCheck,
    },
    {
      title: "Role Templates",
      value: rolesArray.length,
      description: "Default permissions ready to apply",
      icon: UserCog,
    },
    {
      title: "Section Coverage",
      value: totalSectionCoverage,
      description: "Section entitlements mapped from role defaults",
      icon: Layers,
    },
  ];

  const showSkeleton = loading && rolesLoading && templatesLoading;

  const handleEditPosition = (position: Position) => {
    setSelectedPosition(position);
    setEditDialogOpen(true);
  };

  const handleDeletePosition = async (positionId: string) => {
    await deletePosition(positionId);
  };

  return (
    <RoleGuard
      permission="manageUsers"
      fallback={
        <div className="p-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Access Denied
          </h1>
          <p className="text-gray-600">
            You do not have permission to manage positions.
          </p>
        </div>
      }
    >
      <div className="space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Team Management
            </h1>
            <p className="text-muted-foreground">
              Keep positions, scheduling templates, and access control moving
              together.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Position
            </Button>
            <PositionManagementDialog>
              <Button variant="outline">
                <UserCog className="mr-2 h-4 w-4" />
                Quick Manage
              </Button>
            </PositionManagementDialog>
            <UserPositionAssignment>
              <Button variant="outline">
                <Users className="mr-2 h-4 w-4" />
                Assign Team Members
              </Button>
            </UserPositionAssignment>
            <Button variant="outline" asChild>
              <Link to="/sections-permissions">
                <Link2 className="mr-2 h-4 w-4" />
                Sections & Access
              </Link>
            </Button>
          </div>
        </div>

        {showSkeleton ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-28 rounded-lg" />
            ))}
            <div className="xl:col-span-4 grid gap-4 md:grid-cols-2">
              <Skeleton className="h-72 rounded-lg" />
              <Skeleton className="h-72 rounded-lg" />
            </div>
            <Skeleton className="h-80 rounded-lg xl:col-span-4" />
          </div>
        ) : (
          <Tabs
            value={activeTab}
            onValueChange={(value) =>
              setActiveTab(value as "overview" | "positions" | "permissions")
            }
          >
            <TabsList>
              <TabsTrigger value="overview">Team Dashboard</TabsTrigger>
              <TabsTrigger value="positions">Positions</TabsTrigger>
              <TabsTrigger value="permissions">Permissions</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {summaryCards.map(
                  ({ title, value, description, icon: Icon }) => (
                    <Card key={title}>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                          {title}
                        </CardTitle>
                        <Icon className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-semibold">{value}</div>
                        <p className="text-xs text-muted-foreground">
                          {description}
                        </p>
                      </CardContent>
                    </Card>
                  ),
                )}
              </div>

              <div className="grid gap-4 xl:grid-cols-3">
                <Card className="xl:col-span-2">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CalendarRange className="h-5 w-5" />
                      Scheduling Linkage
                    </CardTitle>
                    <CardDescription>
                      Connect position templates to recurring shifts so the
                      schedule stays in sync.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-lg border p-4">
                        <div className="text-xs font-medium uppercase text-muted-foreground">
                          Linked templates
                        </div>
                        <div className="mt-2 text-2xl font-semibold">
                          {linkedShiftTemplateCount}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Shift templates mapped to a position
                        </p>
                      </div>
                      <div className="rounded-lg border p-4">
                        <div className="text-xs font-medium uppercase text-muted-foreground">
                          Needs mapping
                        </div>
                        <div className="mt-2 text-2xl font-semibold">
                          {Math.max(unlinkedShiftTemplateCount, 0)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Templates waiting for a position link
                        </p>
                      </div>
                    </div>

                    {unlinkedShiftTemplateCount > 0 && (
                      <Alert>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          Co-Pilot spotted shift templates without a position.
                          Link them so assignments inherit the right
                          permissions.
                        </AlertDescription>
                      </Alert>
                    )}

                    <div className="space-y-3">
                      {shiftTemplates.length === 0 ? (
                        <div className="text-sm text-muted-foreground">
                          No shift templates yet. Create a template from
                          Enhanced Scheduling to jump-start staffing
                          suggestions.
                        </div>
                      ) : (
                        shiftTemplates.slice(0, 5).map((template) => {
                          const linkedRole = template.job_position?.role as
                            | RoleKey
                            | undefined;
                          const positionName =
                            template.job_position?.name ??
                            "Unassigned template";
                          return (
                            <div
                              key={template.id}
                              className="flex items-center justify-between gap-3 rounded-lg border p-3"
                            >
                              <div>
                                <div className="text-sm font-medium">
                                  {template.name || "New shift template"}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {positionName}{" "}
                                  {linkedRole
                                    ? `• ${ROLE_LABELS[linkedRole]}`
                                    : "• Link required"}
                                </div>
                              </div>
                              {linkedRole ? (
                                <Badge
                                  className={getRoleBadgeClass(linkedRole)}
                                >
                                  {ROLE_LABELS[linkedRole]}
                                </Badge>
                              ) : (
                                <Badge
                                  variant="outline"
                                  className="border-amber-200 text-amber-600"
                                >
                                  Link needed
                                </Badge>
                              )}
                            </div>
                          );
                        })
                      )}
                      {shiftTemplates.length > 5 && (
                        <div className="text-xs text-muted-foreground">
                          +{shiftTemplates.length - 5} additional templates
                        </div>
                      )}
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-end">
                    <Button variant="ghost" size="sm" asChild>
                      <Link to="/enhanced-scheduling">
                        Open Enhanced Scheduling
                      </Link>
                    </Button>
                  </CardFooter>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-purple-500" />
                      Co-Pilot Suggestions
                    </CardTitle>
                    <CardDescription>
                      AI recommendations based on positions, scheduling, and
                      permissions.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {copilotSuggestions.map((suggestion) => (
                      <div
                        key={suggestion.id}
                        className="space-y-1 rounded-lg border border-dashed p-3"
                      >
                        <div className="text-sm font-medium">
                          {suggestion.title}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {suggestion.description}
                        </p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Layers className="h-5 w-5" />
                    Section Coverage Snapshot
                  </CardTitle>
                  <CardDescription>
                    Understand how role templates translate into application
                    access.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {roleAccessSummaries.length === 0 ? (
                    <div className="text-sm text-muted-foreground">
                      Configure company roles to automatically sync section
                      entitlements for each position template.
                    </div>
                  ) : (
                    roleAccessSummaries.slice(0, 4).map((summary) => (
                      <div
                        key={summary.id}
                        className="rounded-lg border p-3 space-y-3"
                        style={{
                          borderColor: summary.color
                            ? `${summary.color}33`
                            : undefined,
                          backgroundColor: summary.color
                            ? `${summary.color}0a`
                            : undefined,
                        }}
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium">{summary.name}</span>
                          <Badge variant="outline" className="text-xs">
                            Level {summary.hierarchyLevel}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {summary.positionCount} position template
                            {summary.positionCount === 1 ? "" : "s"}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {summary.accessibleSections.length === 0 ? (
                            <Badge variant="outline" className="text-xs">
                              No sections enabled
                            </Badge>
                          ) : (
                            summary.accessibleSections
                              .slice(0, 5)
                              .map((section) => (
                                <Badge
                                  variant="secondary"
                                  key={section}
                                  className="text-xs"
                                >
                                  {section}
                                </Badge>
                              ))
                          )}
                          {summary.accessibleSections.length > 5 && (
                            <Badge variant="outline" className="text-xs">
                              +{summary.accessibleSections.length - 5} more
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
                <CardFooter className="flex justify-end">
                  <Button variant="ghost" size="sm" asChild>
                    <Link to="/sections-permissions">
                      Manage Sections & Permissions
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>

            <TabsContent value="positions" className="space-y-6">
              {positions.length === 0 && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    No position templates found. Create one to start assigning
                    team members and connecting scheduling templates.
                  </AlertDescription>
                </Alert>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                {positionsByRole.map(
                  ({ role, label, positions: rolePositions }) => (
                    <Card key={role} className="h-full">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Badge className={getRoleBadgeClass(role)}>
                            {label}
                          </Badge>
                          <span className="text-base font-medium text-gray-900">
                            {label} Positions
                          </span>
                        </CardTitle>
                        <CardDescription>
                          {rolePositions.length} position template
                          {rolePositions.length === 1 ? "" : "s"} configured
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {rolePositions.length === 0 ? (
                          <div className="text-sm text-muted-foreground">
                            No {label.toLowerCase()} position templates yet.
                            Create one to unlock role defaults and scheduling
                            coverage.
                          </div>
                        ) : (
                          rolePositions.map((position) => (
                            <div
                              key={position.id}
                              className="rounded-lg border p-3 space-y-2"
                              style={{
                                borderColor: position.color
                                  ? `${position.color}33`
                                  : undefined,
                                backgroundColor: position.color
                                  ? `${position.color}0a`
                                  : undefined,
                              }}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <div className="text-sm font-semibold text-gray-900">
                                    {position.name}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {shiftTemplatesByPositionId.get(
                                      position.id,
                                    ) ?? 0}{" "}
                                    linked shift template
                                    {(shiftTemplatesByPositionId.get(
                                      position.id,
                                    ) ?? 0) === 1
                                      ? ""
                                      : "s"}{" "}
                                    •{" "}
                                    {assignmentsByPosition.get(position.id) ??
                                      0}{" "}
                                    active assignment
                                    {(assignmentsByPosition.get(position.id) ??
                                      0) === 1
                                      ? ""
                                      : "s"}
                                  </div>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => handleEditPosition(position)}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button size="icon" variant="ghost">
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>
                                          Delete Position
                                        </AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Are you sure you want to delete the “
                                          {position.name}” position? This action
                                          cannot be undone.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>
                                          Cancel
                                        </AlertDialogCancel>
                                        <AlertDialogAction
                                          onClick={() =>
                                            handleDeletePosition(position.id)
                                          }
                                        >
                                          Delete
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </div>
                              </div>

                              {position.description && (
                                <p className="text-xs text-muted-foreground">
                                  {position.description}
                                </p>
                              )}

                              <div className="flex flex-wrap gap-1">
                                {position.permissions &&
                                Object.values(position.permissions).some(
                                  Boolean,
                                ) ? (
                                  Object.entries(position.permissions)
                                    .filter(([, value]) => value)
                                    .slice(0, 4)
                                    .map(([key]) => (
                                      <Badge
                                        variant="outline"
                                        key={key}
                                        className="text-xs"
                                      >
                                        {formatPermissionKey(key)}
                                      </Badge>
                                    ))
                                ) : (
                                  <Badge variant="outline" className="text-xs">
                                    Inherits role defaults
                                  </Badge>
                                )}
                                {position.permissions &&
                                  Object.values(position.permissions).filter(
                                    Boolean,
                                  ).length > 4 && (
                                    <Badge
                                      variant="outline"
                                      className="text-xs"
                                    >
                                      +
                                      {Object.values(
                                        position.permissions,
                                      ).filter(Boolean).length - 4}{" "}
                                      more
                                    </Badge>
                                  )}
                              </div>
                            </div>
                          ))
                        )}
                      </CardContent>
                    </Card>
                  ),
                )}
              </div>
            </TabsContent>

            <TabsContent value="permissions" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Role Hierarchy & Defaults
                  </CardTitle>
                  <CardDescription>
                    Preview default permissions and section coverage for each
                    role template.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {roleAccessSummaries.length === 0 ? (
                    <div className="text-sm text-muted-foreground">
                      No company roles loaded yet. Configure role templates
                      under Sections & Permissions to unlock default access per
                      position.
                    </div>
                  ) : (
                    roleAccessSummaries.map((summary) => {
                      const activePermissions = Object.entries(
                        summary.permissions,
                      )
                        .filter(([, value]) => value)
                        .map(([key]) => key);

                      return (
                        <div
                          key={summary.id}
                          className="rounded-lg border p-4 space-y-3"
                          style={{
                            borderColor: summary.color
                              ? `${summary.color}33`
                              : undefined,
                          }}
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium text-gray-900">
                              {summary.name}
                            </span>
                            <Badge variant="secondary" className="text-xs">
                              Level {summary.hierarchyLevel}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {summary.positionCount} position template
                              {summary.positionCount === 1 ? "" : "s"}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {summary.accessibleSections.length} section
                              {summary.accessibleSections.length === 1
                                ? ""
                                : "s"}{" "}
                              enabled
                            </span>
                          </div>

                          <div className="space-y-2">
                            <div className="text-xs font-medium text-muted-foreground uppercase">
                              Default permissions
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {activePermissions.length === 0 ? (
                                <Badge variant="outline" className="text-xs">
                                  Inherits system defaults
                                </Badge>
                              ) : (
                                activePermissions
                                  .slice(0, 6)
                                  .map((permissionKey) => (
                                    <Badge
                                      variant="outline"
                                      key={permissionKey}
                                      className="text-xs"
                                    >
                                      {formatPermissionKey(permissionKey)}
                                    </Badge>
                                  ))
                              )}
                              {activePermissions.length > 6 && (
                                <Badge variant="outline" className="text-xs">
                                  +{activePermissions.length - 6} more
                                </Badge>
                              )}
                            </div>
                          </div>

                          <div className="space-y-2">
                            <div className="text-xs font-medium text-muted-foreground uppercase">
                              Section access
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {summary.accessibleSections.length === 0 ? (
                                <Badge variant="outline" className="text-xs">
                                  Not yet mapped
                                </Badge>
                              ) : (
                                summary.accessibleSections
                                  .slice(0, 6)
                                  .map((section) => (
                                    <Badge
                                      variant="secondary"
                                      key={section}
                                      className="text-xs"
                                    >
                                      {section}
                                    </Badge>
                                  ))
                              )}
                              {summary.accessibleSections.length > 6 && (
                                <Badge variant="outline" className="text-xs">
                                  +{summary.accessibleSections.length - 6} more
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </CardContent>
                <CardFooter className="flex justify-end">
                  <Button variant="ghost" size="sm" asChild>
                    <Link to="/sections-permissions">
                      Open Sections & Permissions
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>
          </Tabs>
        )}

        <CreatePositionDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
        />

        {selectedPosition && (
          <EditPositionDialog
            open={editDialogOpen}
            onOpenChange={setEditDialogOpen}
            position={selectedPosition}
            onClose={() => setSelectedPosition(null)}
          />
        )}
      </div>
    </RoleGuard>
  );
}
