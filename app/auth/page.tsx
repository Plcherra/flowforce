import { Suspense } from "react";

export const dynamic = "force-dynamic";

import AuthPage from "@/features/auth/pages/Auth";

export default function Auth() {
  return (
    <Suspense fallback={null}>
      <AuthPage />
    </Suspense>
  );
}
