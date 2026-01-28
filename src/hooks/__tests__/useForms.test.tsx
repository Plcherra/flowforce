/* @vitest-environment jsdom */

import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useForms } from "../useForms";

type FormsResponse = Array<{
  id: string;
  title: string;
  status: string;
  created_by: string;
  created_profile: {
    id: string;
    first_name: string;
    last_name: string;
    company_id: string | null;
  };
  submission_stats?: { count: number | null }[];
  latest_submission?: { submitted_at: string | null }[];
}>;

const currentResponses = vi.hoisted(() => ({
  forms: [] as FormsResponse,
}));

const repositoryMocks = vi.hoisted(() => ({
  fetchFormsWithRelations: vi.fn(async () => currentResponses.forms),
  insertFormRow: vi.fn(),
  updateFormRow: vi.fn(),
  deleteFormRow: vi.fn(),
  fetchFormFields: vi.fn(),
  replaceFormFields: vi.fn(),
  fetchFormSubmissions: vi.fn(),
  insertFormSubmission: vi.fn(),
}));

vi.mock("@/repositories/formsRepository", () => ({
  fetchFormsWithRelations: repositoryMocks.fetchFormsWithRelations,
  insertFormRow: repositoryMocks.insertFormRow,
  updateFormRow: repositoryMocks.updateFormRow,
  deleteFormRow: repositoryMocks.deleteFormRow,
  fetchFormFields: repositoryMocks.fetchFormFields,
  replaceFormFields: repositoryMocks.replaceFormFields,
  fetchFormSubmissions: repositoryMocks.fetchFormSubmissions,
  insertFormSubmission: repositoryMocks.insertFormSubmission,
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "user-1" } }),
}));

vi.mock("@/hooks/useProfile", () => ({
  useProfile: () => ({
    profile: {
      companyId: "company-123",
      userId: "user-1",
      role: "manager",
    },
  }),
}));

vi.mock("@/hooks/use-toast", () => ({
  toast: vi.fn(),
}));

vi.mock("@/stores/useFormSchemaStore", () => ({
  useFormSchemaStore: {
    getState: () => ({ schema: null }),
  },
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  return { wrapper, queryClient };
};

describe("useForms", () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    currentResponses.forms = [
      {
        id: "form-tenant",
        title: "Safety Inspection",
        status: "published",
        created_by: "user-1",
        created_profile: {
          id: "user-1",
          first_name: "Alex",
          last_name: "Smith",
          company_id: "company-123",
        },
        submission_stats: [{ count: 3 }],
        latest_submission: [{ submitted_at: "2024-01-03T00:00:00.000Z" }],
      },
      {
        id: "form-foreign",
        title: "Another Form",
        status: "draft",
        created_by: "user-9",
        created_profile: {
          id: "user-9",
          first_name: "Casey",
          last_name: "Lee",
          company_id: "other-company",
        },
        submission_stats: [{ count: 10 }],
        latest_submission: [{ submitted_at: "2024-02-01T00:00:00.000Z" }],
      },
    ];
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    Object.values(repositoryMocks).forEach((mockFn) => {
      if ("mockClear" in mockFn && typeof mockFn.mockClear === "function") {
        mockFn.mockClear();
      }
    });
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it("filters out forms from other companies", async () => {
    const { wrapper, queryClient } = createWrapper();

    const { result } = renderHook(() => useForms(), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.forms).toHaveLength(1);
    expect(result.current.forms[0].id).toBe("form-tenant");
    expect(warnSpy).toHaveBeenCalledWith(
      "[useForms] Filtered out forms from other companies",
      JSON.stringify({ removed: 1, tenantCompanyId: "company-123" }),
    );

    expect(repositoryMocks.fetchFormsWithRelations).toHaveBeenCalledWith(
      "company-123",
    );

    queryClient.clear();
  });

  it("returns an empty list without error when tenant has no forms", async () => {
    currentResponses.forms = [];
    const { wrapper, queryClient } = createWrapper();

    const { result } = renderHook(() => useForms(), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.forms).toHaveLength(0);
    expect(warnSpy).not.toHaveBeenCalled();

    queryClient.clear();
  });
});
