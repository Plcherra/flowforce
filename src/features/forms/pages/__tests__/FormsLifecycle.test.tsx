/* @vitest-environment jsdom */

import React from "react";
import { describe, expect, it, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import Forms from "../Forms";

const mockUseForms = vi.fn();

vi.mock("react-quill", () => ({
  __esModule: true,
  default: vi.fn(() => null),
}));

vi.mock("react-quill/dist/quill.snow.css", () => ({}), { virtual: true });

vi.mock("@/features/forms/components/fields/DescriptionField", () => ({
  DescriptionField: () => null,
}));

vi.mock("@/features/forms/hooks/useForms", () => ({
  useForms: () => mockUseForms(),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "user-1" } }),
}));

vi.mock("@/hooks/useCan", () => ({
  useCan: () => ({ can: () => true }),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

describe("Forms page background loading behaviour", () => {
  beforeEach(() => {
    mockUseForms.mockReset();
    mockUseForms.mockReturnValue({
      forms: [
        {
          id: "form-1",
          title: "Safety Checklist",
          description: "Daily inspection",
          status: "published",
          created_at: "2024-01-01T00:00:00.000Z",
          updated_at: "2024-01-01T12:00:00.000Z",
          created_by: "user-1",
          created_profile: { first_name: "Avery", last_name: "Cole" },
          department: { name: "Operations" },
          submissions_count: 0,
          latest_submission_at: null,
        },
      ],
      loading: true,
      isInitialLoading: false,
      isFetching: true,
      createForm: vi.fn(),
      updateForm: vi.fn(),
      deleteForm: vi.fn(),
      getFormFields: vi.fn(),
      saveFormFields: vi.fn(),
      getFormSubmissions: vi.fn(),
      submitForm: vi.fn(),
      refetchForms: vi.fn(),
    });
  });

  it("keeps the forms list visible during background refetches", async () => {
    render(<Forms />);

    expect(await screen.findByText("Safety Checklist")).toBeInTheDocument();
    expect(screen.queryByText("Loading forms…")).toBeNull();
  });
});
