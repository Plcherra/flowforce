"use client";

import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { usePackFlags } from "@/hooks/usePackFlags";
import { useNavigate } from "@/lib/router-adapter";
import { useCanPurchasePacks } from "@/features/packs/useCanPurchasePacks";

export function PacksDiscoveryBanner() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { flags, isReady } = usePackFlags();
  const { canBuy, loading } = useCanPurchasePacks();
  const packsLeft = !flags.team || !flags.insights || !flags.stock;

  if (!isReady || loading || !canBuy || !packsLeft) return null;

  return (
    <div
      className="flex flex-col gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between"
      data-testid="packs-discovery-banner"
    >
      <div className="space-y-1">
        <p className="font-medium">{t("packs.pageTitle")}</p>
        <p className="text-sm text-muted-foreground">{t("packs.pageDescription")}</p>
      </div>
      <Button type="button" variant="outline" onClick={() => navigate("/app/packs")}>
        {t("packs.viewPacks")}
      </Button>
    </div>
  );
}
