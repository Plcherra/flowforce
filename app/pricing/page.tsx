import { Suspense } from "react";
import PricingPage from "@/features/marketing/pages/Pricing";

export default function Pricing() {
  return (
    <Suspense fallback={null}>
      <PricingPage />
    </Suspense>
  );
}
