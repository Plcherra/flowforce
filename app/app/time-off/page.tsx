import { redirect } from "next/navigation";

export default function TimeOffRedirectPage() {
  redirect("/app/enhanced-scheduling?panel=timeoff");
}
