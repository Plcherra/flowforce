import { redirect } from "next/navigation";

export default function AvailabilityManageRedirectPage() {
  redirect("/app/enhanced-scheduling?panel=availability&availability=team");
}
