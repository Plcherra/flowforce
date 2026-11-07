"use client";

import { Suspense } from "react";
import { useParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import { PackDetail } from "@/features/packs/components/PackDetail";

function PackFallback() {
  const { t } = useTranslation();
  return <p className="p-6 text-sm text-muted-foreground">{t("packs.loading")}</p>;
}

export default function PackDetailPage() {
  const params = useParams<{ pack: string }>();
  const pack = typeof params.pack === "string" ? params.pack : "";

  return (
    <div className="p-6 md:p-10">
      <Suspense fallback={<PackFallback />}>
        <PackDetail pack={pack} />
      </Suspense>
    </div>
  );
}
