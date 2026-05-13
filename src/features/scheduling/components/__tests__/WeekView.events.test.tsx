/* @vitest-environment jsdom */

import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { WeekView } from "../WeekView";
import type { SchedulingFilterState } from "../SchedulingFilters";
import type { ShiftWithAssignments } from "@/features/scheduling/hooks/useSchedulingConsolidated";
import type { CalendarEvent } from "@/hooks/useCalendarEvents";

const filters: SchedulingFilterState = {
  positions: [],
  users: [],
  status: "all",
  published: "all",
};

const makeShift = (
  id: string,
  userId: string,
  start: string,
  end: string,
  name: string,
) =>
  ({
    id,
    company_id: "company-1",
    start_time: start,
    end_time: end,
    title: name,
    location: "Main floor",
    is_published: true,
    assignments: [
      {
        id: `${id}-assignment`,
        user_id: userId,
        user: {
          id: userId,
          first_name: userId.toUpperCase(),
          last_name: "Staff",
          email: `${userId}@example.com`,
          avatar_url: null,
        },
      },
    ],
    job_position: { name: "Operator" },
    break_minutes: null,
    created_at: "",
    created_by: null,
    hourly_rate: null,
    is_all_day: null,
    is_template: null,
    notes: null,
    position_id: null,
    required_headcount: null,
    requirements: { store_id: "store-1" },
    status: null,
    template_id: null,
    timezone: null,
    updated_at: null,
    user_id: null,
  }) as unknown as ShiftWithAssignments;

const baseEvent: CalendarEvent = {
  id: "event-1",
  title: "Team Sync",
  description: null,
  start: "2024-01-02T10:00:00.000Z",
  end: "2024-01-02T11:00:00.000Z",
  location: null,
  type: "meeting",
  color: "#0ea5e9",
  storeId: null,
  participants: [],
  shiftIds: [],
  metadata: {},
  raw: {
    id: "event-1",
    company_id: "company-1",
    store_id: null,
    created_by: null,
    title: "Team Sync",
    description: null,
    location: null,
    event_type: "meeting",
    color: "#0ea5e9",
    start_time: "2024-01-02T10:00:00.000Z",
    end_time: "2024-01-02T11:00:00.000Z",
    attendees: [],
    related_shift_ids: [],
    checklist: [],
    vendor: null,
    metadata: {},
    created_at: "2024-01-01T00:00:00.000Z",
    updated_at: "2024-01-01T00:00:00.000Z",
    event_participants: [],
    event_shift_links: [],
  },
};

describe("WeekView linked events", () => {
  it("adds chips when a meeting is linked to shifts and notifies selection", () => {
    const schedules: ShiftWithAssignments[] = [
      makeShift(
        "shift-1",
        "user-1",
        "2024-01-02T09:00:00.000Z",
        "2024-01-02T15:00:00.000Z",
        "Opening",
      ),
      makeShift(
        "shift-2",
        "user-2",
        "2024-01-02T12:00:00.000Z",
        "2024-01-02T20:00:00.000Z",
        "Closing",
      ),
    ];

    const onSelectEvent = vi.fn();
    const { rerender } = render(
      <WeekView
        schedules={schedules}
        selectedDate={new Date("2024-01-02T00:00:00.000Z")}
        onSelectShift={vi.fn()}
        onSelectEvent={onSelectEvent}
        filters={filters}
        overlayEvents={[baseEvent]}
        isMobile={false}
        hideShiftActions
        selectedEventId={null}
      />,
    );

    expect(
      screen.queryAllByRole("button", { name: /Team Sync$/ }),
    ).toHaveLength(0);

    const linkedEvent: CalendarEvent = {
      ...baseEvent,
      shiftIds: ["shift-1", "shift-2"],
      raw: {
        ...baseEvent.raw,
        related_shift_ids: ["shift-1"],
      },
    };

    rerender(
      <WeekView
        schedules={schedules}
        selectedDate={new Date("2024-01-02T00:00:00.000Z")}
        onSelectShift={vi.fn()}
        onSelectEvent={onSelectEvent}
        filters={filters}
        overlayEvents={[linkedEvent]}
        isMobile={false}
        hideShiftActions
        selectedEventId={null}
      />,
    );

    const chips = screen.getAllByRole("button", { name: /Team Sync$/ });
    expect(chips).toHaveLength(2);

    fireEvent.click(chips[0]);
    expect(onSelectEvent).toHaveBeenCalledWith("event-1");
  });
});
