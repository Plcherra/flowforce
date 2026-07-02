import { redirect } from "next/navigation";

export default function SchedulingTimeOffRedirectPage() {
  redirect("/app/enhanced-scheduling?panel=timeoff");
}
