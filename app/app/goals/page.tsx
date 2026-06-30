import { redirect } from "next/navigation";

/** Goals module removed; task execution lives under Tasks. */
export default function GoalsRedirectPage() {
  redirect("/app/tasks");
}
