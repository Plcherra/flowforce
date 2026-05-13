/**
 * Barrel export for calendar feature
 */

// Components
export * from "./components/CreateEventDialog";
export * from "./components/CreateVendorVisitDialog";
export * from "./components/CalendarView";
export * from "./components/EventDetailsDrawer";
export * from "./components/EventDetailsPanel";
export * from "./components/EventsCalendarContent";
export * from "./components/LinkShiftsPanel";
export * from "./components/NetworkStatusBanner";

// Hooks
export * from "./hooks/useCalendarMutationError";
export * from "./hooks/useCreateCalendarEvent";
export * from "./hooks/useCreateVendorVisit";

// Types
export * from "./types";

// Pages
export { default as EventsCalendarPage } from "./pages/events/Calendar";
export { default as EventsHubPage } from "./pages/events/EventsHub";
export { default as EventsMeetingsPage } from "./pages/events/Meetings";
