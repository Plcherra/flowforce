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
  const isMobile = useIsMobile();
  const { profile: currentUserProfile, loading: profileLoading } = useProfile();
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
      inviteParam &&
      ["1", "true", "open"].includes(inviteParam.toLowerCase())
    ) {
      setInviteOpen(true);
    }
  }, [searchParams]);

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
            : "Unable to create vendor. Please try again.",
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
      return "We couldn’t load your team directory data. Please try again.";
    }
  }, [combinedError]);
  const vendorErrorMessage = useMemo(() => {
    if (!companyId && !profileLoading) {
      return "Connect your profile to a company to see vendor records.";
    }
    if (!vendorsError) return null;
    if (vendorsError instanceof Error) return vendorsError.message;
    if (typeof vendorsError === "string") return vendorsError;
    return "We couldn’t load vendor data. Try refreshing once Supabase is back online.";
  }, [companyId, profileLoading, vendorsError]);
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

  const currentRole = currentUserProfile?.role?.toLowerCase() ?? "";
  const isAdmin = ["owner", "admin", "manager"].includes(currentRole);
  const canManageEmployees = ["owner", "admin", "manager"].includes(
    currentRole,
  );

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
              className={`${isMobile ? "text-2xl" : "text-3xl"} font-bold text-gray-900`}
            >
              Team Directory
            </h1>
            <p className="text-gray-600 mt-1">
              Browse, filter and export your company roster
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {canManageEmployees && activeTab === "vendors" && (
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
              isAdmin={isAdmin}
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
          canManageEmployees={canManageEmployees}
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
                <AlertTitle>Live data unavailable</AlertTitle>
                <AlertDescription>{combinedErrorMessage}</AlertDescription>
              </div>
            </div>
          </Alert>
        )}

        {showEmptyState && (
          <EmptyStateCard
            data-testid="employees-empty-state"
            icon={<Users className="h-6 w-6" />}
            title="No team members yet"
            description="Invite your first teammate to unlock the full directory experience."
            action={
              <Button
                onClick={() => handleInviteChange(true)}
                className="self-center sm:self-auto"
              >
                Invite teammates
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
                    All ({employees.length})
                  </TabsTrigger>
                  <TabsTrigger value="managers">
                    Leads ({leaderCount})
                  </TabsTrigger>
                  <TabsTrigger value="inactive">
                    Inactive ({inactiveEmployeesCount})
                  </TabsTrigger>
                  <TabsTrigger value="vendors">Vendors</TabsTrigger>
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
                          <AlertTitle>Vendor data unavailable</AlertTitle>
                          <AlertDescription>
                            {vendorErrorMessage ??
                              "Unable to load vendor data"}
                          </AlertDescription>
                        </div>
                      </div>
                    </Alert>
                  ) : vendorsLoading ? (
                    <TableSkeleton />
                  ) : showVendorEmptyState ? (
                    <EmptyStateCard
                      icon={<SearchX className="h-5 w-5" />}
                      title="No vendors found"
                      description={
                        searchTerm
                          ? "No vendors match the current search. Clear the search or add a vendor."
                          : "Add vendors to keep purchasing contacts available from the team directory."
                      }
                      action={
                        canManageEmployees ? (
                          <Button
                            type="button"
                            onClick={() => setShowAddVendorDialog(true)}
                          >
                            Add vendor
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
                    title="No teammates match these filters"
                    description="Try a different search, status tab, or department filter."
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
                        Clear filters
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
            <CardTitle>Team Snapshot</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`grid ${isMobile ? "grid-cols-2 gap-3" : "grid-cols-2 md:grid-cols-4 gap-4"} text-center`}
            >
              <div>
                <div className="text-2xl font-bold text-blue-600">
                  {employees.length}
                </div>
                <div className="text-sm text-gray-600">People</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {activeEmployeesCount}
                </div>
                <div className="text-sm text-gray-600">Active</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-orange-600">
                  {leaderCount}
                </div>
                <div className="text-sm text-gray-600">Leads</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-600">
                  {departments.length}
                </div>
                <div className="text-sm text-gray-600">Departments</div>
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
