import { useTranslation } from "react-i18next";
import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useSearchParams } from "@/lib/router-adapter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, SearchX, Users } from "lucide-react";
import { useProfile } from "@/hooks/useProfile";
import { useCan } from "@/hooks/useCan";
import type { PermissionKey } from "@/hooks/useUserPermissions";
import { directoryTools } from "../utils/directoryTools";
import { useIsMobile } from "@/hooks/use-mobile";
import { useInventorySuppliers, useCreateSupplier } from "@/hooks/useInventory";
import {
  useEmployees,
  type Employee as DirectoryEmployee,
} from "@/hooks/useEmployees";
import type { EmployeeDrawerTab } from "@/features/employees/components/EmployeeDrawer";
import { TeamActionsBar } from "@/features/employees/components/TeamActionsBar";
import { InviteEmployeeDialog } from "@/features/employees/components/InviteEmployeeDialog";
import { useEmployeesCacheInvalidation } from "@/features/employees/hooks/useEmployeesCacheInvalidation";
import {
  useVendorForm,
  type VendorFormValues,
} from "@/features/inventory/hooks/useVendorForm";
import { EmptyStateCard } from "@/components/common/EmptyStateCard";
import { TableSkeleton } from "@/components/common/TableSkeleton";
import { logger } from "@/utils/logger";
import { useTeamDirectoryFilters } from "../hooks/useTeamDirectoryFilters";
import { useDepartments } from "../hooks/useDepartments";
import { createDepartmentNameMap } from "../utils/departmentHelpers";
import { exportEmployeesToCSV } from "../utils/csvExport";
import {
  EmployeeTable,
  VendorTable,
  DirectoryFilters,
  DirectoryPagination,
  AddVendorDialog,
} from "./";
import { HrReadinessPanel } from "./HrReadinessPanel";
import type { EmployeesTab } from "../types/directory";

export function TeamDirectory() {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const { profile: currentUserProfile, loading: profileLoading } = useProfile();
  const { can } = useCan();
  const tools = directoryTools((key) => can(key as PermissionKey));
  const companyId =
    currentUserProfile?.company_id ?? currentUserProfile?.companyId ?? null;
  const {
    employees,
    loading,
    error: employeesError,
  } = useEmployees({ includeInactive: true, companyId });
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<EmployeesTab>("all");
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [showAddVendorDialog, setShowAddVendorDialog] = useState(false);
  const [selectedEmployee, setSelectedEmployee] =
    useState<DirectoryEmployee | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState<EmployeeDrawerTab>("profile");
  const [searchParams, setSearchParams] = useSearchParams();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [roleManagerOpen, setRoleManagerOpen] = useState(false);
  const [permissionManagerOpen, setPermissionManagerOpen] = useState(false);
  const { form: vendorForm, reset: resetVendorForm } = useVendorForm();
  const invalidateEmployeeQueries = useEmployeesCacheInvalidation(companyId);

  // Vendor hooks
  const {
    data: vendors = [],
    isLoading: vendorsLoading,
    error: vendorsError,
  } = useInventorySuppliers(companyId);
  const createVendor = useCreateSupplier();

  // Departments
  const { departments, departmentError } = useDepartments({
    companyId,
    profileLoading,
  });

  // Filters and pagination
  const {
    filteredEmployees,
    filteredVendors,
    paginatedEmployees,
    paginatedVendors,
    pagination,
    employeeCounts,
  } = useTeamDirectoryFilters({
    employees: employees ?? [],
    vendors: vendors ?? [],
    searchTerm,
    activeTab,
    departmentFilter,
    page,
    pageSize,
  });

  const departmentNameMap = useMemo(
    () => createDepartmentNameMap(departments),
    [departments],
  );

  useEffect(() => {
    const inviteParam = searchParams.get("invite");
    if (
      tools.invitations &&
      inviteParam &&
      ["1", "true", "open"].includes(inviteParam.toLowerCase())
    ) {
      setInviteOpen(true);
    }
  }, [searchParams, tools.invitations]);

  const clearInviteParam = () => {
    const inviteParam = searchParams.get("invite");
    if (!inviteParam) return;
    const next = new URLSearchParams(searchParams);
    next.delete("invite");
    setSearchParams(next);
  };

  const handleInviteChange = (open: boolean) => {
    setInviteOpen(open);
    if (!open) {
      clearInviteParam();
    }
  };

  const handleDrawerChange = (open: boolean) => {
    setDrawerOpen(open);
    if (!open) {
      setSelectedEmployee(null);
      setDrawerTab("profile");
    }
  };

  const openEmployeeDrawer = (employee: DirectoryEmployee) => {
    setSelectedEmployee(employee);
    setDrawerTab("profile");
    setDrawerOpen(true);
    clearInviteParam();
  };

  const handleCreateVendor = async (
    values: VendorFormValues,
  ): Promise<void> => {
    try {
      await createVendor.mutateAsync({
        name: values.name.trim(),
        contact_name: values.contact_name?.trim() || undefined,
        email: values.email?.trim() || undefined,
        phone: values.phone?.trim() || undefined,
        address: values.address?.trim() || undefined,
        notes: values.notes?.trim() || undefined,
      });
      setShowAddVendorDialog(false);
      resetVendorForm();
    } catch (error) {
      logger.error("Error creating vendor", { error, tags: ["error"] });
      vendorForm.setError("root", {
        message:
          error instanceof Error
            ? error.message
            : t("employees.unableToCreateVendor"),
      });
    }
  };

  useEffect(() => {
    setPage((prev) => (prev === 1 ? prev : 1));
  }, [activeTab, searchTerm, departmentFilter]);

  const { totalPages, displayRangeStart, displayRangeEnd, hasResults } =
    pagination;
  const combinedError = employeesError ?? departmentError;
  const combinedErrorMessage = useMemo(() => {
    if (!combinedError) return null;
    if (typeof combinedError === "string") return combinedError;
    const errorValue = combinedError as unknown;
    if (errorValue instanceof Error) return errorValue.message;
    try {
      return JSON.stringify(errorValue);
    } catch {
      return t("employees.unableToLoadTeamDirectory");
    }
  }, [combinedError, t]);
  const vendorErrorMessage = useMemo(() => {
    if (!companyId && !profileLoading) {
      return t("employees.connectProfileForVendors");
    }
    if (!vendorsError) return null;
    if (vendorsError instanceof Error) return vendorsError.message;
    if (typeof vendorsError === "string") return vendorsError;
    return t("employees.unableToLoadVendorRefresh");
  }, [companyId, profileLoading, vendorsError, t]);
  const showEmptyState = !loading && !combinedError && employees.length === 0;
  const showEmployeeFilterEmptyState =
    !loading &&
    !combinedError &&
    activeTab !== "vendors" &&
    employees.length > 0 &&
    filteredEmployees.length === 0;
  const showVendorEmptyState =
    activeTab === "vendors" &&
    !vendorsLoading &&
    !vendorsError &&
    filteredVendors.length === 0;

  useEffect(() => {
    setPage((current) => (current > totalPages ? totalPages : current));
  }, [totalPages]);

  const handleTabChange = useCallback((value: string) => {
    setActiveTab(value as EmployeesTab);
  }, []);

  const handlePageSizeChange = useCallback((value: number) => {
    setPageSize(value);
    setPage(1);
  }, []);

  useEffect(() => {
    if (!tools.vendors && activeTab === "vendors") {
      setActiveTab("all");
    }
  }, [activeTab, tools.vendors]);

  const {
    active: activeEmployeesCount,
    inactive: inactiveEmployeesCount,
    leaders: leaderCount,
  } = employeeCounts;

  return (
    <div>
      <div className={`${isMobile ? "p-4 space-y-4" : "p-6 space-y-6"}`}>
        {/* Header */}
        <div
          className={`${isMobile ? "flex flex-col space-y-3" : "flex items-center justify-between gap-3"}`}
        >
          <div>
            <h1
              className={`${isMobile ? "text-2xl" : "text-3xl"} font-bold text-foreground`}
            >
              {t("sections.teamDirectory")}
            </h1>
            <p className="text-muted-foreground mt-1">
              {t("employees.browseFilterAndExportYourCompanyRoster")}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {tools.addVendor && activeTab === "vendors" && (
              <AddVendorDialog
                open={showAddVendorDialog}
                onOpenChange={setShowAddVendorDialog}
                form={vendorForm}
                onSubmit={handleCreateVendor}
                onReset={resetVendorForm}
                isMobile={isMobile}
              />
            )}
            <TeamActionsBar
              canInvite={tools.invitations}
              canManageRoles={tools.roles}
              canManagePermissions={tools.permissions}
              onOpenInvite={() => handleInviteChange(true)}
              onOpenRoles={() => setRoleManagerOpen(true)}
              onOpenPermissions={() => setPermissionManagerOpen(true)}
              onExportFiltered={() => exportEmployeesToCSV(filteredEmployees)}
              onExportAll={() => exportEmployeesToCSV(employees ?? [])}
            />
          </div>
        </div>

        <HrReadinessPanel
          companyId={companyId}
          employees={employees}
          loading={loading}
          canManageEmployees={tools.invitations}
          onOpenInvite={() => handleInviteChange(true)}
        />

        {combinedErrorMessage && (
          <Alert
            variant="destructive"
            className="border-destructive/40 bg-destructive/5"
          >
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 flex-shrink-0 text-destructive" />
              <div className="space-y-1">
                <AlertTitle>{t("employees.liveDataUnavailable")}</AlertTitle>
                <AlertDescription>{combinedErrorMessage}</AlertDescription>
              </div>
            </div>
          </Alert>
        )}

        {showEmptyState && (
          <EmptyStateCard
            data-testid="employees-empty-state"
            icon={<Users className="h-6 w-6" />}
            title={t("employees.noTeamMembersYet")}
            description={t("employees.inviteFirstTeammate")}
            action={
              <Button
                onClick={() => handleInviteChange(true)}
                className="self-center sm:self-auto"
              >
                {t("employees.inviteTeammates")}
              </Button>
            }
          />
        )}

        {/* Toolbar */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={handleTabChange}>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <TabsList>
                  <TabsTrigger value="all">
                    {t("employees.allCount", { count: employees.length })}
                  </TabsTrigger>
                  <TabsTrigger value="managers">
                    {t("employees.leadsCount", { count: leaderCount })}
                  </TabsTrigger>
                  <TabsTrigger value="inactive">
                    {t("employees.inactiveCount", {
                      count: inactiveEmployeesCount,
                    })}
                  </TabsTrigger>
                  {tools.vendors ? (
                    <TabsTrigger value="vendors">{t("employees.vendors")}</TabsTrigger>
                  ) : null}
                </TabsList>

                <DirectoryFilters
                  searchTerm={searchTerm}
                  departmentFilter={departmentFilter}
                  departments={departments}
                  onSearchChange={setSearchTerm}
                  onDepartmentChange={setDepartmentFilter}
                  isMobile={isMobile}
                />
              </div>

              {/* Content for different tabs */}
              <TabsContent value={activeTab}>
                {activeTab === "vendors" ? (
                  vendorsError ? (
                    <Alert
                      variant="destructive"
                      className="border-destructive/40 bg-destructive/5"
                    >
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="h-5 w-5 flex-shrink-0 text-destructive" />
                        <div className="space-y-1">
                          <AlertTitle>{t("employees.vendorDataUnavailable")}</AlertTitle>
                          <AlertDescription>
                            {vendorErrorMessage ??
                              t("employees.unableToLoadVendorData")}
                          </AlertDescription>
                        </div>
                      </div>
                    </Alert>
                  ) : vendorsLoading ? (
                    <TableSkeleton />
                  ) : showVendorEmptyState ? (
                    <EmptyStateCard
                      icon={<SearchX className="h-5 w-5" />}
                      title={t("employees.noVendorsFound")}
                      description={
                        searchTerm
                          ? t("employees.noVendorsMatchSearch")
                          : t("employees.addVendorsHint")
                      }
                      action={
                        tools.addVendor ? (
                          <Button
                            type="button"
                            onClick={() => setShowAddVendorDialog(true)}
                          >
                            {t("employees.addVendor2")}
                          </Button>
                        ) : undefined
                      }
                    />
                  ) : (
                    <VendorTable
                      vendors={paginatedVendors}
                      isLoading={vendorsLoading}
                    />
                  )
                ) : loading ? (
                  <TableSkeleton />
                ) : showEmployeeFilterEmptyState ? (
                  <EmptyStateCard
                    icon={<SearchX className="h-5 w-5" />}
                    title={t("employees.noTeammatesMatchTheseFilters")}
                    description={t("employees.tryDifferentSearch")}
                    action={
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setSearchTerm("");
                          setDepartmentFilter("all");
                          setActiveTab("all");
                        }}
                      >
                        {t("tasks.clearFilters")}
                      </Button>
                    }
                  />
                ) : (
                  <EmployeeTable
                    employees={paginatedEmployees}
                    departmentMap={departmentNameMap}
                    onEmployeeClick={openEmployeeDrawer}
                  />
                )}
              </TabsContent>
            </Tabs>

            {/* Pagination controls */}
            {hasResults && (
              <DirectoryPagination
                page={page}
                pageSize={pageSize}
                totalPages={totalPages}
                displayRangeStart={displayRangeStart}
                displayRangeEnd={displayRangeEnd}
                totalRecords={
                  activeTab === "vendors"
                    ? filteredVendors.length
                    : filteredEmployees.length
                }
                onPageChange={setPage}
                onPageSizeChange={handlePageSizeChange}
              />
            )}
          </CardContent>
        </Card>

        {/* Summary Card */}
        <Card>
          <CardHeader>
            <CardTitle>{t("employees.teamSnapshot")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`grid ${isMobile ? "grid-cols-2 gap-3" : "grid-cols-2 md:grid-cols-4 gap-4"} text-center`}
            >
              <div>
                <div className="text-2xl font-bold text-primary">
                  {employees.length}
                </div>
                <div className="text-sm text-muted-foreground">{t("schedule.people")}</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-success">
                  {activeEmployeesCount}
                </div>
                <div className="text-sm text-muted-foreground">{t("sections.active")}</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-warning">
                  {leaderCount}
                </div>
                <div className="text-sm text-muted-foreground">{t("employees.leads")}</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-secondary">
                  {departments.length}
                </div>
                <div className="text-sm text-muted-foreground">{t("updates.departments")}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Employee Drawer */}
        <Suspense fallback={null}>
          <EmployeeDrawer
            employee={selectedEmployee}
            open={drawerOpen}
            initialTab={drawerTab}
            onOpenChange={handleDrawerChange}
          />
        </Suspense>

        <InviteEmployeeDialog
          open={inviteOpen}
          onOpenChange={handleInviteChange}
          onSuccess={invalidateEmployeeQueries}
        />

        <Suspense fallback={null}>
          <RoleManagerDialog
            open={roleManagerOpen}
            onOpenChange={setRoleManagerOpen}
            employees={employees}
            onRoleUpdated={invalidateEmployeeQueries}
          />
        </Suspense>

        <Suspense fallback={null}>
          <PermissionManagerDialog
            open={permissionManagerOpen}
            onOpenChange={setPermissionManagerOpen}
          />
        </Suspense>
      </div>
    </div>
  );
}

const EmployeeDrawer = lazy(async () =>
  import("@/features/employees/components/EmployeeDrawer").then((module) => ({
    default: module.EmployeeDrawer,
  })),
);

const RoleManagerDialog = lazy(async () => {
  const module = await import("@/features/employees/components/RoleManagerDialog");
  return { default: module.RoleManagerDialog };
});

const PermissionManagerDialog = lazy(async () => {
  const module = await import("@/features/employees/components/PermissionManagerDialog");
  return { default: module.PermissionManagerDialog };
});
