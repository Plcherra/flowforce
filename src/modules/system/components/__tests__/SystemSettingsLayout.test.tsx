/* @vitest-environment jsdom */

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SystemSettingsLayout } from "../../components/SystemSettingsLayout";

const useSystemSettingsMock = vi.hoisted(() => vi.fn());

vi.mock("../../hooks/useSystemSettings", () => ({
  useSystemSettings: useSystemSettingsMock,
}));

vi.mock("@/components/RoleGuard", () => ({
  __esModule: true,
  default: ({ children }: any) => children,
}));

describe("SystemSettingsLayout", () => {
  const baseTabs = [
    { key: "general", label: "General", content: <div>General Panel</div> },
  ];

  beforeEach(() => {
    useSystemSettingsMock.mockReset();
  });

  it("renders loader while fetching", () => {
    useSystemSettingsMock.mockReturnValue({
      company: null,
      settings: null,
      loading: true,
      error: null,
      canEdit: false,
      role: null,
      isCompanyAdmin: false,
      missingCompany: false,
      linkingCompany: false,
      linkCompanyError: null,
      linkCompany: vi.fn(),
      refresh: vi.fn(),
      updateSettings: vi.fn(),
    } as any);

    render(<SystemSettingsLayout tabs={baseTabs} />);
    expect(screen.getByText(/Loading system settings/i)).toBeInTheDocument();
  });

  it("renders error state when hook returns error", () => {
    useSystemSettingsMock.mockReturnValue({
      company: null,
      settings: null,
      loading: false,
      error: new Error("No active company context"),
      canEdit: false,
      role: null,
      isCompanyAdmin: false,
      missingCompany: false,
      linkingCompany: false,
      linkCompanyError: null,
      linkCompany: vi.fn(),
      refresh: vi.fn(),
      updateSettings: vi.fn(),
    } as any);

    render(<SystemSettingsLayout tabs={baseTabs} />);
    expect(screen.getByText(/No active company context/i)).toBeInTheDocument();
  });

  it("renders empty state when no settings resolved", () => {
    useSystemSettingsMock.mockReturnValue({
      company: { name: "Acme" },
      settings: null,
      loading: false,
      error: null,
      canEdit: true,
      role: "admin",
      isCompanyAdmin: true,
      missingCompany: false,
      linkingCompany: false,
      linkCompanyError: null,
      linkCompany: vi.fn(),
      refresh: vi.fn(),
      updateSettings: vi.fn(),
    } as any);

    render(<SystemSettingsLayout tabs={baseTabs} />);
    expect(screen.getByText(/No settings available/i)).toBeInTheDocument();
  });

  it("renders missing company fallback when profile lacks company context", () => {
    useSystemSettingsMock.mockReturnValue({
      company: null,
      settings: null,
      loading: false,
      error: null,
      canEdit: false,
      role: null,
      isCompanyAdmin: false,
      missingCompany: true,
      linkingCompany: false,
      linkCompanyError: null,
      linkCompany: vi.fn(),
      refresh: vi.fn(),
      updateSettings: vi.fn(),
    } as any);

    render(<SystemSettingsLayout tabs={baseTabs} />);
    expect(screen.getByText(/No company detected/i)).toBeInTheDocument();
  });
});
