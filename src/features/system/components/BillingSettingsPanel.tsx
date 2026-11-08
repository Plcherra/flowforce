"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  OPS_MONTHLY_USD,
  OPTIONAL_PACK_IDS,
  PACK_MONTHLY_USD,
} from "@/config/packCatalog";
import type { OptionalPackId } from "@/config/packFlags";
import { usePackOffers } from "@/features/packs/usePackOffers";
import { usePackFlags } from "@/hooks/usePackFlags";
import { useProfile } from "@/hooks/useProfile";
import {
  PackCheckoutError,
  startPackCheckout,
} from "@/services/billing/packCheckoutClient";
import { openStripeBillingPortal } from "@/services/billing/stripeBillingClient";

function isOwnerRole(role: string | null | undefined) {
  return (role ?? "").trim().toLowerCase() === "owner";
}

export function BillingSettingsPanel() {
  const { t } = useTranslation();
  const { profile, loading: profileLoading } = useProfile();
  const { flags } = usePackFlags();
  const { offers } = usePackOffers();
  const [buying, setBuying] = useState<OptionalPackId | null>(null);
  const [managing, setManaging] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  if (profileLoading) {
    return <p className="text-sm text-muted-foreground">{t("common.loading")}</p>;
  }

  if (!isOwnerRole(profile?.role)) {
    return (
      <p className="text-sm text-muted-foreground" data-testid="billing-owner-only">
        {t("settings.billingOwnerOnly")}
      </p>
    );
  }

  const monthlyTotal =
    OPS_MONTHLY_USD +
    OPTIONAL_PACK_IDS.reduce(
      (sum, pack) => sum + (flags[pack] ? PACK_MONTHLY_USD[pack] : 0),
      0,
    );

  const addPack = async (pack: OptionalPackId) => {
    setNotice(null);
    if (offers && offers[pack] !== true) {
      setNotice(t("settings.billingCheckoutUnavailable"));
      return;
    }
    setBuying(pack);
    try {
      await startPackCheckout(pack);
    } catch (error) {
      if (error instanceof PackCheckoutError && error.code === "pack_price_pending") {
        setNotice(t("settings.billingCheckoutUnavailable"));
      } else if (
        error instanceof PackCheckoutError &&
        error.code === "pack_already_subscribed"
      ) {
        setNotice(t("packs.alreadySubscribed"));
      } else {
        setNotice(
          error instanceof Error ? error.message : t("packs.checkoutFailed"),
        );
      }
      setBuying(null);
    }
  };

  const manageBilling = async () => {
    setNotice(null);
    setManaging(true);
    try {
      await openStripeBillingPortal();
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      setNotice(
        /no stripe customer/i.test(message)
          ? t("settings.billingPortalUnavailable")
          : message || t("settings.billingPortalFailed"),
      );
      setManaging(false);
    }
  };

  return (
    <div className="space-y-6" data-testid="billing-page">
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <CardTitle>{t("settings.tabBilling")}</CardTitle>
            <CardDescription>{t("packs.pricePlaceholderNote")}</CardDescription>
          </div>
          <Button
            type="button"
            variant="outline"
            data-testid="billing-manage"
            onClick={() => void manageBilling()}
            disabled={managing || buying !== null}
          >
            {managing ? t("packs.managing") : t("settings.billingManage")}
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {notice ? (
            <p className="text-sm text-muted-foreground" data-testid="billing-notice">
              {notice}
            </p>
          ) : null}

          <article
            className="flex flex-col gap-2 rounded-xl border border-border p-4 sm:flex-row sm:items-center sm:justify-between"
            data-testid="billing-plan-ops"
          >
            <div>
              <h2 className="text-base font-medium">{t("settings.billingOpsName")}</h2>
              <p className="text-sm text-muted-foreground">{t("settings.billingOpsDetail")}</p>
            </div>
            <div className="flex items-center gap-3">
              <Badge>{t("settings.billingActive")}</Badge>
              <p className="text-base font-medium" data-testid="billing-ops-price">
                {t("packs.priceMonthly", { amount: OPS_MONTHLY_USD })}
              </p>
            </div>
          </article>

          <ul className="space-y-3">
            {OPTIONAL_PACK_IDS.map((pack) => {
              const active = flags[pack];
              const priceReady = offers?.[pack] === true;
              return (
                <li
                  key={pack}
                  className="flex flex-col gap-3 rounded-xl border border-border p-4 sm:flex-row sm:items-center sm:justify-between"
                  data-testid={`billing-pack-${pack}`}
                >
                  <div>
                    <h3 className="text-base font-medium">{t(`packs.${pack}.title`)}</h3>
                    <p className="text-sm text-muted-foreground">
                      {t(`packs.${pack}.description`)}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <Badge variant={active ? "default" : "outline"}>
                      {active ? t("settings.billingActive") : t("settings.billingInactive")}
                    </Badge>
                    <p className="text-base font-medium" data-testid={`billing-pack-price-${pack}`}>
                      {t("packs.priceMonthly", { amount: PACK_MONTHLY_USD[pack] })}
                    </p>
                    {!active && offers && !priceReady ? (
                      <p className="text-sm text-muted-foreground">
                        {t("settings.billingCheckoutUnavailable")}
                      </p>
                    ) : null}
                    {active ? null : (
                      <Button
                        type="button"
                        data-testid={`billing-add-${pack}`}
                        disabled={buying !== null || managing || !priceReady}
                        onClick={() => void addPack(pack)}
                      >
                        {buying === pack ? t("packs.buying") : t("settings.billingAdd")}
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>

          <p className="text-base font-medium" data-testid="billing-monthly-total">
            {t("settings.billingMonthlyTotal", { amount: monthlyTotal })}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
