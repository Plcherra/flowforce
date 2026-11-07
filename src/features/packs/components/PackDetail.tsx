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
import { isOptionalPackId } from "@/config/packCatalog";
import type { OptionalPackId } from "@/config/packFlags";
import { usePackFlags } from "@/hooks/usePackFlags";
import { PackCheckoutNoticeText, PackPurchaseActions } from "@/features/packs/components/PackPurchaseActions";
import { useConfirmPackCheckout } from "@/features/packs/useConfirmPackCheckout";
import { usePackOffers } from "@/features/packs/usePackOffers";

export function PackDetail({ pack }: { pack: string }) {
  const { t } = useTranslation();
  const { flags } = usePackFlags();
  const { offers } = usePackOffers();
  const { notice, setNotice, confirmed } = useConfirmPackCheckout();

  if (!isOptionalPackId(pack)) {
    return (
      <div className="space-y-3" data-testid="pack-detail-missing">
        <h1 className="text-2xl font-semibold tracking-tight">{t("packs.notFound")}</h1>
        <Link to="/app/packs" className="text-sm font-medium text-primary underline">
          {t("packs.backToPacks")}
        </Link>
      </div>
    );
  }

  const enabled = flags[pack] || confirmed[pack] === true;

  return (
    <div className="mx-auto max-w-xl space-y-6" data-testid="pack-detail" data-pack={pack}>
      <Link to="/app/packs" className="text-sm font-medium text-primary underline">
        {t("packs.backToPacks")}
      </Link>
      <Card data-testid={`pack-card-${pack}`} data-enabled={enabled ? "true" : "false"}>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <CardTitle>{t(`packs.${pack}.title`)}</CardTitle>
            <Badge variant={enabled ? "default" : "outline"} data-testid={`pack-status-${pack}`}>
              {enabled ? t("packs.statusOn") : t("packs.statusOff")}
            </Badge>
          </div>
          <CardDescription>{t(`packs.${pack}.description`)}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">{t("packs.opsNote")}</p>
          <p className="text-base font-medium" data-testid={`pack-price-${pack}`}>
            {t("packs.priceTbd")}
          </p>
          <p className="text-xs text-muted-foreground" data-testid={`pack-price-note-${pack}`}>
            {t("packs.pricePlaceholder")}
          </p>
          {notice && notice !== "price_pending" ? <PackCheckoutNoticeText notice={notice} /> : null}
          <PackPurchaseActions
            pack={pack as OptionalPackId}
            enabled={enabled}
            purchasable={offers ? offers[pack] : null}
            notice={notice === "price_pending" ? notice : null}
            setNotice={setNotice}
          />
        </CardContent>
      </Card>
    </div>
  );
}
