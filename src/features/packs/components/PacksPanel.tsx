"use client";

import { useTranslation } from "react-i18next";
import { Link } from "@/lib/router-adapter";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { OptionalPackId } from "@/config/packFlags";
import { usePackFlags } from "@/hooks/usePackFlags";
import { PackCheckoutNoticeText } from "@/features/packs/components/PackPurchaseActions";
import { useCanPurchasePacks } from "@/features/packs/useCanPurchasePacks";
import { useConfirmPackCheckout } from "@/features/packs/useConfirmPackCheckout";
import { usePackOffers } from "@/features/packs/usePackOffers";

export function PacksPanel() {
  const { t } = useTranslation();
  const { flags } = usePackFlags();
  const { offers, packIds } = usePackOffers();
  const { canBuy, loading: permissionLoading } = useCanPurchasePacks();
  const { notice, confirmed } = useConfirmPackCheckout();

  return (
    <div className="space-y-6" data-testid="packs-page" data-can-purchase={canBuy ? "true" : "false"}>
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">{t("packs.pageTitle")}</h1>
        <p className="text-sm text-muted-foreground">{t("packs.pageDescription")}</p>
        <p className="text-sm text-muted-foreground" data-testid="packs-ops-note">
          {t("packs.opsNote")}
        </p>
      </div>

      {notice ? <PackCheckoutNoticeText notice={notice} /> : null}

      {!permissionLoading && !canBuy ? (
        <p className="text-sm text-muted-foreground" data-testid="packs-purchase-denied">
          {t("packs.purchaseDenied")}
        </p>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        {packIds.map((pack) => {
          const enabled = flags[pack] || confirmed[pack] === true;
          return (
            <PackSummaryCard
              key={pack}
              pack={pack}
              enabled={enabled}
              purchasable={offers ? offers[pack] : null}
            />
          );
        })}
      </div>
    </div>
  );
}

function PackSummaryCard({
  pack,
  enabled,
  purchasable,
}: {
  pack: OptionalPackId;
  enabled: boolean;
  purchasable: boolean | null;
}) {
  const { t } = useTranslation();

  return (
    <Card data-testid={`pack-card-${pack}`} data-pack={pack} data-enabled={enabled ? "true" : "false"}>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <CardTitle>{t(`packs.${pack}.title`)}</CardTitle>
          <Badge variant={enabled ? "default" : "outline"} data-testid={`pack-status-${pack}`}>
            {enabled ? t("packs.statusOn") : t("packs.statusOff")}
          </Badge>
        </div>
        <CardDescription>{t(`packs.${pack}.description`)}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-base font-medium" data-testid={`pack-price-${pack}`}>
          {t("packs.priceTbd")}
        </p>
        <p className="text-xs text-muted-foreground" data-testid={`pack-price-note-${pack}`}>
          {t("packs.pricePlaceholder")}
        </p>
        {purchasable === false ? (
          <p className="text-sm font-medium" data-testid={`pack-pricing-soon-${pack}`}>
            {t("packs.pricingComingSoon")}
          </p>
        ) : null}
        <Link
          to={`/app/packs/${pack}`}
          className="text-sm font-medium text-primary underline"
          data-testid={`pack-open-${pack}`}
        >
          {t("packs.viewPack")}
        </Link>
      </CardContent>
    </Card>
  );
}
