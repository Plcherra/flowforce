import { Suspense } from "react";
import { notFound } from "next/navigation";
import { FormsPreviewScreen } from "@/features/forms/components/FormsFlowPreview";

export default function FormsPreviewPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <Suspense fallback={null}>
      <FormsPreviewScreen />
    </Suspense>
  );
}
