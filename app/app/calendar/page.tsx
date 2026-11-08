import { redirect } from "next/navigation";

/** Old calendar links open Overview. */
export default function CalendarRedirectPage() {
  redirect("/app/dashboard");
}
