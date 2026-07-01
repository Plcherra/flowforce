import { redirect } from "next/navigation";

/** Meetings live on the unified calendar; type is chosen when creating. */
export default function MeetingsRedirectPage() {
  redirect("/app/calendar");
}
