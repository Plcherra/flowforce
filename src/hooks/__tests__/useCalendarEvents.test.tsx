/* @vitest-environment jsdom */

import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useCalendarEvents } from "../useCalendarEvents";

type CalendarEventRow = {
  id: string;
  company_id: string | null;
  store_id: string | null;
  created_by: string | null;
  title: string | null;
  description: string | null;
  location: string | null;
  event_type: string | null;
  color: string | null;
  start_time: string;
  end_time: string | null;
  attendees: unknown;
  related_shift_ids: string[] | null;
  checklist: unknown;
  vendor: unknown;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  event_participants: Array<{
    id: string;
    event_id: string;
    company_id: string;
    profile_id: string | null;
    email: string | null;
    name: string | null;
    role: string | null;
    avatar_url: string | null;
    response_status: string;
    metadata: Record<string, unknown>;
    created_at: string;
    updated_at: string;
  }>;
  event_shift_links: Array<{
    id: string;
    event_id: string;
    shift_id: string;
    company_id: string;
    store_id: string | null;
    metadata: Record<string, unknown>;
    linked_at: string;
    created_at: string;
    updated_at: string;
  }>;
};

const responses = vi.hoisted(() => ({
  calendarEvents: [] as CalendarEventRow[],
}));

const scheduleGatewayMock = vi.hoisted(() => ({
  fetchEvents: vi.fn(),
}));

vi.mock("@/lib/api/scheduleGateway", () => ({
  scheduleGateway: scheduleGatewayMock,
}));

vi.mock("@/hooks/useProfile", () => ({
  useProfile: () => ({
    profile: {
      companyId: "company-1",
    },
  }),
}));

describe("useCalendarEvents", () => {
  beforeEach(() => {
    responses.calendarEvents = [
      {
        id: "event-1",
        company_id: "company-1",
        store_id: null,
        created_by: null,
        title: "Team Sync",
        description: null,
        location: "HQ",
        event_type: "meeting",
        color: "#0ea5e9",
        start_time: "2024-01-02T10:00:00.000Z",
        end_time: "2024-01-02T11:00:00.000Z",
        attendees: [],
        related_shift_ids: ["shift-1"],
        checklist: [],
        vendor: null,
        metadata: {},
        created_at: "2024-01-01T00:00:00.000Z",
        updated_at: "2024-01-01T00:00:00.000Z",
        event_participants: [
          {
            id: "participant-1",
            event_id: "event-1",
            company_id: "company-1",
            profile_id: "user-1",
            email: "alice@example.com",
            name: "Alice",
            role: "Manager",
            avatar_url: null,
            response_status: "accepted",
            metadata: {},
            created_at: "2024-01-01T00:00:00.000Z",
            updated_at: "2024-01-01T00:00:00.000Z",
          },
        ],
        event_shift_links: [
          {
            id: "link-1",
            event_id: "event-1",
            shift_id: "shift-2",
            company_id: "company-1",
            store_id: null,
            metadata: {},
            linked_at: "2024-01-01T00:00:00.000Z",
            created_at: "2024-01-01T00:00:00.000Z",
            updated_at: "2024-01-01T00:00:00.000Z",
          },
        ],
      },
    ];
    scheduleGatewayMock.fetchEvents.mockResolvedValue(responses.calendarEvents);
  });

  it("filters events by company and range while combining shift links", async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(
      () =>
        useCalendarEvents({
          range: {
            start: new Date("2024-01-01T00:00:00.000Z"),
            end: new Date("2024-01-07T23:59:59.999Z"),
          },
        }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.events).toHaveLength(1));
    queryClient.clear();

    expect(scheduleGatewayMock.fetchEvents).toHaveBeenCalledWith({
      companyId: "company-1",
      start: "2024-01-01T00:00:00.000Z",
      end: "2024-01-07T23:59:59.999Z",
      storeId: null,
    });

    expect(result.current.events).toHaveLength(1);
    const event = result.current.events[0];
    expect(event.id).toBe("event-1");
    expect(new Set(event.shiftIds)).toEqual(new Set(["shift-1", "shift-2"]));
    expect(event.participants).toHaveLength(1);
    expect(event.participants[0].name).toBe("Alice");
  });
});
