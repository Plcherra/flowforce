"use client";

import { Suspense } from "react";
import { useTranslation } from "react-i18next";
import { PacksPanel } from "@/features/packs/components/PacksPanel";

function PacksFallback() {
  const { t } = useTranslation();
  return <p className="p-6 text-sm text-muted-foreground">{t("packs.loading")}</p>;
}

export default function PacksPage() {
  return (
    <div className="p-6 md:p-10">
      <Suspense fallback={<PacksFallback />}>
        <PacksPanel />
      </Suspense>
    </div>
  );
}
