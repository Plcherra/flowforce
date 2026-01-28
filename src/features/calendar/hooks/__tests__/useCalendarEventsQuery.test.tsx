import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import { useCalendarEvents } from "@/hooks/useCalendarEvents";

vi.mock("@/hooks/useProfile", () => ({
  useProfile: () => ({ profile: { companyId: "company-1" } }),
}));

const scheduleGatewayMock = vi.hoisted(() => ({
  fetchEvents: vi.fn(),
}));

vi.mock("@/lib/api/scheduleGateway", () => ({
  scheduleGateway: scheduleGatewayMock,
}));

describe("useCalendarEvents", () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };

  it("returns events when repository resolves", async () => {
    scheduleGatewayMock.fetchEvents.mockResolvedValue([
      {
        id: "e1",
        title: "Test",
        description: null,
        location: null,
        event_type: "event",
        color: null,
        start_time: new Date().toISOString(),
        end_time: null,
        attendees: [],
        related_shift_ids: [],
        checklist: [],
        vendor: null,
        metadata: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        company_id: "company-1",
        created_by: null,
        store_id: null,
        event_participants: [],
        event_shift_links: [],
      },
    ]);

    const { result } = renderHook(
      () =>
        useCalendarEvents({
          range: { start: new Date(), end: new Date(Date.now() + 3600_000) },
        }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.events).toHaveLength(1));
  });

  it("surfaces errors from repository", async () => {
    scheduleGatewayMock.fetchEvents.mockRejectedValue(new Error("boom"));

    const { result } = renderHook(
      () =>
        useCalendarEvents({
          range: { start: new Date(), end: new Date(Date.now() + 3600_000) },
        }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.error).toBe("boom"));
  });
});
