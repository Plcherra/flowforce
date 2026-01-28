"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AvailabilityManageRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace(
      "/app/enhanced-scheduling?tab=availability&availability=team",
    );
  }, [router]);

  return null;
}
