/**
 * Barrel export for calendar feature
 */

// Components
export * from "./components/CreateEventDialog";
export * from "./components/CreateVendorVisitDialog";
export * from "./components/EventsCalendarContent";

// Hooks
export * from "./hooks/useCalendarEvents";
export * from "./hooks/useEventMutations";
export * from "./hooks/useEventQueries";
export * from "./hooks/useVendorVisits";

// Types
export * from "./types";

// Pages
export { default as EventsCalendarPage } from "./pages/events/Calendar";
export { default as EventsHubPage } from "./pages/events/EventsHub";
export { default as EventsMeetingsPage } from "./pages/events/Meetings";
