import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Users, UserPlus, RefreshCw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useCompanyRoles } from "@/hooks/useCompanyRoles";
import { usePositions } from "@/hooks/usePositions";
import { useEmployees, type Employee } from "@/hooks/useEmployees";
import type {
  ViewMode,
  StatusFilter,
  InviteFormState,
} from "../types/userManagement";
import { DEFAULT_ROLES } from "../utils/userHelpers";
import { isInviteExpired } from "../utils/userHelpers";
import { calculateRoleSummaries } from "../utils/roleSummaries";
import { calculatePositionCoverage } from "../utils/positionCoverage";
import {
  generateRoleGapInsights,
  generateInactiveInsights,
  aggregateInsights,
} from "../utils/insightAggregation";
import { useUserManagementQueries } from "../hooks/useUserManagementQueries";
import { useUserManagementFilters } from "../hooks/useUserManagementFilters";
import { useUserManagementMutations } from "../hooks/useUserManagementMutations";
import { useCopilotInsights } from "../hooks/useCopilotInsights";
import {
  UserManagementStats,
  UserManagementFilters,
  EmployeeGroupCard,
  InviteFormSidebar,
  RoleSummarySidebar,
  CopilotInsightsPanel,
} from "./";

export default function UserManagement() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { can } = useCan();
  const { resetPassword } = useAuth();
  const {
    employees: activeEmployees = [],
    loading: activeLoading,
    refetchEmployees,
  } = useEmployees();
  const { roles = [], isLoading: rolesLoading } = useCompanyRoles();
  const { positions, assignments, loading: positionsLoading } = usePositions();

  const [viewMode, setViewMode] = useState<ViewMode>("department");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("active");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [inviteForm, setInviteForm] = useState<InviteFormState>({
    firstName: "",
    lastName: "",
    email: "",
    role: "staff",
  });
  const [generatedInviteLink, setGeneratedInviteLink] = useState<string | null>(
    null,
  );

  const employeeSample = useMemo(
    () => activeEmployees.slice(0, 6),
    [activeEmployees],
  );
  const employeeSampleKey = useMemo(
    () =>
      employeeSample
        .map((employee) => employee.id)
        .sort()
        .join(","),
    [employeeSample],
  );

  // Queries
  const { departmentsQuery, inactiveEmployeesQuery, invitesQuery } =
    useUserManagementQueries();

  const copilotInsightsQuery = useCopilotInsights({
    employeeSample,
    employeeSampleKey,
  });

  // Mutations
  const {
    updateRoleMutation,
    deactivateMutation,
    createInviteMutation,
    resetPassword: resetPasswordMutation,
  } = useUserManagementMutations({
    onEmployeesRefetch: refetchEmployees,
    onInviteCreated: (link) => setGeneratedInviteLink(link),
    onInviteFormReset: () =>
      setInviteForm((prev) => ({
        firstName: "",
        lastName: "",
        email: "",
        role: prev.role,
      })),
  });

  const handleRoleChange = (
    userId: string,
    newRole: string,
    currentRole: string,
  ) => {
    if (newRole === currentRole) return;
    updateRoleMutation.mutate({ userId, newRole });
  };

  const handleResetPassword = async (email: string) => {
    await resetPasswordMutation(email);
  };

  const handleStatusToggle = (employee: Employee) => {
    const nextStatus =
      employee.employment_status === "active" ? "inactive" : "active";
    deactivateMutation.mutate({ userId: employee.id, status: nextStatus });
  };

  const handleReactivate = (userId: string) => {
    deactivateMutation.mutate({ userId, status: "active" });
  };

  const handleCreateInvite = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!inviteForm.email || !inviteForm.firstName || !inviteForm.lastName) {
      toast({
        title: "Missing information",
        description: "Email, first name, and last name are required.",
        variant: "destructive",
      });
      return;
    }
    createInviteMutation.mutate(inviteForm);
  };

  const handleCopyLink = async () => {
    if (!generatedInviteLink) return;
    try {
      await navigator.clipboard?.writeText(generatedInviteLink);
      toast({
        title: "Copied invite link",
        description:
          "Share this link with the employee to complete their setup.",
      });
    } catch {
      toast({
        title: "Unable to copy link",
        description: "Copy the link manually from the field below.",
        variant: "destructive",
      });
    }
  };

  const departments = useMemo(
    () => departmentsQuery.data ?? [],
    [departmentsQuery.data],
  );
  const inactiveEmployees = useMemo(
    () => inactiveEmployeesQuery.data ?? [],
    [inactiveEmployeesQuery.data],
  );

  // Filters and grouping
  const { groupedEmployees } = useUserManagementFilters({
    activeEmployees,
    inactiveEmployees,
    searchTerm,
    statusFilter,
    roleFilter,
    departmentFilter,
    viewMode,
  });

  const pendingInvites = useMemo(
    () =>
      (invitesQuery.data ?? []).filter(
        (invite) => !invite.used_at && !isInviteExpired(invite),
      ),
    [invitesQuery.data],
  );

  const roleOptions = useMemo(() => {
    const availableRoles = Array.isArray(roles)
      ? roles.map((role) => role.name.toLowerCase())
      : [];
    const combined = new Set([...DEFAULT_ROLES, ...availableRoles]);
    return Array.from(combined.values());
  }, [roles]);

  const positionCoverage = useMemo(
    () => calculatePositionCoverage(positions, assignments ?? []),
    [positions, assignments],
  );

  const roleSummaries = useMemo(
    () =>
      calculateRoleSummaries(roles, [...activeEmployees, ...inactiveEmployees]),
    [roles, activeEmployees, inactiveEmployees],
  );

  const roleGapInsights = useMemo(
    () => generateRoleGapInsights(positions, assignments ?? []),
    [positions, assignments],
  );

  const inactiveInsights = useMemo(
    () => generateInactiveInsights(inactiveEmployees),
    [inactiveEmployees],
  );

  const aggregatedInsights = useMemo(
    () =>
      aggregateInsights(
        copilotInsightsQuery.data ?? [],
        roleGapInsights,
        inactiveInsights,
      ),
    [copilotInsightsQuery.data, roleGapInsights, inactiveInsights],
  );

  const isBusy =
    activeLoading ||
    departmentsQuery.isLoading ||
    rolesLoading ||
    positionsLoading ||
    deactivateMutation.isPending;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Team Management</h2>
          <p className="text-muted-foreground">
            Search, filter, and manage your entire team from one dashboard.
            Invite new hires, adjust roles, and keep permissions aligned.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refetchEmployees()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button onClick={() => navigate("/employees?invite=1")}>
            <UserPlus className="mr-2 h-4 w-4" />
            Full Invite Flow
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-6">
          <UserManagementStats
            activeCount={activeEmployees.length}
            inactiveCount={inactiveEmployees.length}
            pendingInvites={pendingInvites}
            departments={departments}
          />

          <div className="my-6">
            <UserManagementFilters
              searchTerm={searchTerm}
              statusFilter={statusFilter}
              roleFilter={roleFilter}
              departmentFilter={departmentFilter}
              viewMode={viewMode}
              roleOptions={roleOptions}
              departments={departments}
              onSearchChange={setSearchTerm}
              onStatusChange={setStatusFilter}
              onRoleChange={setRoleFilter}
              onDepartmentChange={setDepartmentFilter}
              onViewModeChange={setViewMode}
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr),minmax(0,1fr)]">
        <div className="space-y-6">
          {isBusy ? (
            <Card>
              <CardContent className="flex h-48 items-center justify-center">
                <div className="text-sm text-muted-foreground">
                  Loading team data…
                </div>
              </CardContent>
            </Card>
          ) : groupedEmployees.length === 0 ? (
            <Card>
              <CardContent className="flex h-48 flex-col items-center justify-center text-center">
                <Users className="mb-3 h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  No employees match your filters. Adjust filters or invite a
                  new team member.
                </p>
              </CardContent>
            </Card>
          ) : (
            groupedEmployees.map(([groupName, members]) => (
              <EmployeeGroupCard
                key={groupName}
                groupName={groupName}
                members={members}
                roleOptions={roleOptions}
                onRoleChange={handleRoleChange}
                onStatusToggle={handleStatusToggle}
                onResetPassword={handleResetPassword}
                onNavigateToEmployee={(id) =>
                  navigate(`/employees?focus=${id}`)
                }
                onNavigateToPerformance={(id) =>
                  navigate(`/performance?focus=${id}`)
                }
              />
            ))
          )}
        </div>

        <div className="space-y-6">
          <InviteFormSidebar
            inviteForm={inviteForm}
            onInviteFormChange={setInviteForm}
            onSubmit={handleCreateInvite}
            generatedInviteLink={generatedInviteLink}
            isPending={createInviteMutation.isPending}
            pendingInvites={pendingInvites}
            isLoading={invitesQuery.isLoading}
            roleOptions={roleOptions}
            onCopyLink={handleCopyLink}
          />

          <RoleSummarySidebar
            roleSummaries={roleSummaries}
            positionCoverage={positionCoverage}
          />

          <CopilotInsightsPanel
            insights={aggregatedInsights}
            isLoading={copilotInsightsQuery.isLoading}
            isFetching={copilotInsightsQuery.isFetching}
            onRefresh={() => copilotInsightsQuery.refetch()}
            onReactivate={handleReactivate}
          />
        </div>
      </div>
    </div>
  );
}
