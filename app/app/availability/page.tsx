import { redirect } from "next/navigation";

export default function AvailabilityRedirectPage() {
  redirect("/app/enhanced-scheduling?panel=availability");
}
