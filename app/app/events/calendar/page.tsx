import { redirect } from "next/navigation";

/** Events and meetings share the unified calendar route. */
export default function EventsCalendarRedirectPage() {
  redirect("/app/calendar");
}
