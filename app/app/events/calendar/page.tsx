import { redirect } from "next/navigation";

/** Old events calendar links open Overview. */
export default function EventsCalendarRedirectPage() {
  redirect("/app/dashboard");
}
