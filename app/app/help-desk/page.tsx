import { redirect } from "next/navigation";

/** Help Desk module removed; use Messages instead. */
export default function HelpDeskRedirectPage() {
  redirect("/app/messages");
}
