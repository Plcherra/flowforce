import { redirect } from "next/navigation";

/** Meetings lived on the calendar. Old links open Overview. */
export default function MeetingsRedirectPage() {
  redirect("/app/dashboard");
}
