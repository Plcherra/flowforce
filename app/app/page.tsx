import { redirect } from "next/navigation";

export default function AppHomeRedirect() {
  redirect("/app/dashboard");
}
