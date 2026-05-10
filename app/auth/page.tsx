"use client";

export const dynamic = "force-dynamic";
export const runtime = "edge";

import AuthPage from "@/features/auth/pages/Auth";

export default function Auth() {
  return <AuthPage />;
}
