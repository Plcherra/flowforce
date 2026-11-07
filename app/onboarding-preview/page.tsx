"use client";

import { Suspense } from "react";
import { notFound } from "next/navigation";
import { OnboardingPreview } from "@/features/employee-onboarding/components/OnboardingPreview";

export default function OnboardingPreviewPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <Suspense fallback={null}>
      <OnboardingPreview />
    </Suspense>
  );
}
