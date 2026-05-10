import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import type { ReactNode } from "react";
import { TeamDirectory } from "@/features/employees/components/TeamDirectory";
import type { Employee } from "@/hooks/useEmployees";

vi.mock("@/components/ui/form", () => {
  const MockWrapper = ({ children }: { children: ReactNode }) => (
    <>{children}</>
  );
  const FormField = ({
    render,
  }: {
    render: (args: {
      field: { value: string; onChange: () => void };
    }) => ReactNode;
  }) => render({ field: { value: "", onChange: () => {} } });

  return {
    Form: MockWrapper,
    FormItem: MockWrapper,
    FormLabel: MockWrapper,
    FormControl: MockWrapper,
    FormMessage: () => null,
    FormField,
  };
});

vi.mock("@/features/employees/components/EmployeeDrawer", () => ({
  EmployeeDrawer: () => null,
}));
vi.mock("@/features/employees/components/InviteEmployeeDialog", () => ({
  InviteEmployeeDialog: () => null,
}));
vi.mock("@/features/employees/components/RoleManagerDialog", () => ({
  RoleManagerDialog: () => null,
}));
vi.mock("@/features/employees/components/PermissionManagerDialog", () => ({
  PermissionManagerDialog: () => null,
}));
vi.mock("@/features/employees/components/TeamActionsBar", () => ({
  TeamActionsBar: () => <div data-testid="team-actions-bar" />,
}));

const mockUseEmployees = vi.fn();
vi.mock("@/hooks/useEmployees", () => ({
  useEmployees: (...args: unknown[]) => mockUseEmployees(...args),
}));

vi.mock("@/hooks/useProfile", () => ({
  useProfile: () => ({
    profile: { role: "admin", company_id: "company-123" },
    loading: false,
  }),
}));

vi.mock("@/hooks/use-mobile", () => ({
  useIsMobile: () => false,
}));

vi.mock("@/hooks/useInventory", () => ({
  useInventorySuppliers: () => ({ data: [], isLoading: false, error: null }),
  useCreateSupplier: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock("@/features/employees/hooks/useEmployeesCacheInvalidation", () => ({
  useEmployeesCacheInvalidation: () => vi.fn(),
}));

vi.mock("@/features/inventory/hooks/useVendorForm", () => ({
  useVendorForm: () => ({
    form: {
      control: {},
      handleSubmit:
        (cb: (values: unknown) => void) =>
        (event?: { preventDefault?: () => void }) => {
          event?.preventDefault?.();
          cb({
            name: "",
            contact_name: "",
            email: "",
            phone: "",
            address: "",
            notes: "",
          });
        },
      formState: { errors: {} },
      setError: vi.fn(),
    },
    reset: vi.fn(),
  }),
}));

describe("Employees page", () => {
  beforeEach(() => {
    mockUseEmployees.mockReturnValue({
      employees: [],
      loading: false,
      error: null,
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders empty state when there are no employees", () => {
    render(<TeamDirectory />);
    expect(screen.getByTestId("employees-empty-state")).toBeInTheDocument();
    expect(screen.getByText(/No team members yet/i)).toBeInTheDocument();
  });

  it("does not render empty state when employees exist", () => {
    const employees: Employee[] = [
      {
        id: "emp-1",
        first_name: "Alice",
        last_name: "Anderson",
        email: "alice@example.com",
        role: "manager",
        employment_status: "active",
        department_id: null,
        avatar_url: null,
        company_id: "company-123",
        created_at: "",
        updated_at: "",
        hire_date: null,
        phone: null,
        employee_id: null,
      },
    ];
    mockUseEmployees.mockReturnValue({
      employees,
      loading: false,
      error: null,
    });

    render(<TeamDirectory />);
    expect(
      screen.queryByTestId("employees-empty-state"),
    ).not.toBeInTheDocument();
    expect(screen.getByText(/Alice Anderson/)).toBeInTheDocument();
  });
});
