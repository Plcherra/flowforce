import { redirect } from "next/navigation";

export default function ItemsSetupRedirectPage() {
  redirect("/app/inventory/items");
}
