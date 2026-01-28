"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function InviteEmployeeRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/app/employees?invite=1");
  }, [router]);

  return null;
}
