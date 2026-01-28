"use client";

import { redirect } from "next/navigation";

export default function DocsRedirect() {
  redirect("/app/resources/docs/getting-started");
}
