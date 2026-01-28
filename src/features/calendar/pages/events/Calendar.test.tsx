import React from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { EventsCalendarContent } from "@/features/calendar/components/EventsCalendarContent";

const mockUseEvents = vi.fn();
const mockUseScheduling = vi.fn();

vi.mock("@/hooks/useEvents", () => ({
  useEvents: () => mockUseEvents(),
}));

vi.mock("@/contexts/SchedulingContext", () => ({
  SchedulingProvider: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  useScheduling: () => mockUseScheduling(),
}));

vi.mock("@/hooks/use-mobile", () => ({
  useIsMobile: () => false,
}));

vi.mock("@/components/scheduling/SchedulingCalendar", () => ({
  SchedulingCalendar: () => (
    <div data-testid="scheduling-calendar">calendar</div>
  ),
}));

describe("EventsCalendarContent", () => {
  beforeEach(() => {
    mockUseEvents.mockReturnValue({
      events: [],
      loading: false,
      error: null,
      errorCode: null,
    });
    mockUseScheduling.mockReturnValue({
      loading: false,
      error: null,
    });
  });

  it("shows a skeleton while scheduling data loads", () => {
    mockUseScheduling.mockReturnValue({
      loading: true,
      error: null,
    });

    render(<EventsCalendarContent />);

    expect(screen.getByTestId("calendar-skeleton")).toBeInTheDocument();
  });

  it("renders upcoming events when data is available", () => {
    mockUseEvents.mockReturnValue({
      events: [
        {
          id: "event-1",
          title: "Team Sync",
          start: new Date(Date.now() + 60_000).toISOString(),
          description: null,
          end: null,
          type: "meeting",
        },
      ],
      loading: false,
      error: null,
    });

    render(<EventsCalendarContent />);

    expect(screen.getByText("Team Sync")).toBeInTheDocument();
  });

  it("shows an error alert when event loading fails", () => {
    mockUseEvents.mockReturnValue({
      events: [],
      loading: false,
      error: "Network error",
      errorCode: "500",
    });

    render(<EventsCalendarContent />);

    expect(screen.getByTestId("events-network-banner")).toHaveTextContent(
      "Network error",
    );
  });

  it("shows scheduling error fallback when scheduling data fails", () => {
    mockUseScheduling.mockReturnValue({
      loading: false,
      error: "Scheduling offline",
    });

    render(<EventsCalendarContent />);

    expect(screen.getByTestId("scheduling-network-banner")).toHaveTextContent(
      "Scheduling offline",
    );
    expect(screen.getByTestId("calendar-skeleton")).toBeInTheDocument();
  });
});
