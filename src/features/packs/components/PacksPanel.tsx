"use client";

import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
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
import { OPTIONAL_PACK_IDS, isOptionalPackId } from "@/config/packCatalog";
import type { OptionalPackId } from "@/config/packFlags";
import { usePackFlags } from "@/hooks/usePackFlags";
import { useCanPurchasePacks } from "@/features/packs/useCanPurchasePacks";
import { PackCheckoutError, confirmPackCheckout, startPackCheckout } from "@/services/billing/packCheckoutClient";

type Notice =
  | "price_pending"
  | "canceled"
  | "failed"
  | "confirm_failed"
  | "confirmed"
  | null;

export function PacksPanel() {
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { flags } = usePackFlags();
  const { canBuy, loading: permissionLoading } = useCanPurchasePacks();
  const [notice, setNotice] = useState<Notice>(null);
  const [confirmed, setConfirmed] = useState<Partial<Record<OptionalPackId, boolean>>>({});
  const [buying, setBuying] = useState<OptionalPackId | null>(null);
  const confirmStarted = useRef<string | null>(null);

  useEffect(() => {
    const checkout = searchParams.get("checkout");
    const pack = searchParams.get("pack");
    const sessionId = searchParams.get("session_id");

    if (checkout === "canceled") {
      setNotice("canceled");
      return;
    }

    if (checkout !== "success" || !isOptionalPackId(pack) || !sessionId) return;
    if (permissionLoading || !canBuy) return;

    const key = `${pack}:${sessionId}`;
    if (confirmStarted.current === key) return;
    confirmStarted.current = key;
    let cancelled = false;

    void (async () => {
      try {
        await confirmPackCheckout({ pack, sessionId });
        if (cancelled) return;
        setConfirmed((current) => ({ ...current, [pack]: true }));
        setNotice("confirmed");
        await queryClient.invalidateQueries({ queryKey: ["pack-flags"] });
        const url = new URL(window.location.href);
        url.searchParams.delete("checkout");
        url.searchParams.delete("session_id");
        url.searchParams.delete("pack");
        const next = `${url.pathname}${url.search}`;
        window.history.replaceState(null, "", next);
      } catch {
        if (cancelled) return;
        confirmStarted.current = null;
        setNotice("confirm_failed");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [canBuy, permissionLoading, queryClient, searchParams]);

  const buy = async (pack: OptionalPackId) => {
    setBuying(pack);
    setNotice(null);
    try {
      await startPackCheckout(pack);
    } catch (error) {
      if (error instanceof PackCheckoutError && error.code === "pack_price_pending") {
        setNotice("price_pending");
      } else {
        setNotice("failed");
      }
      setBuying(null);
    }
  };

  return (
    <div className="space-y-6" data-testid="packs-page" data-can-purchase={canBuy ? "true" : "false"}>
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">{t("packs.pageTitle")}</h1>
        <p className="text-sm text-muted-foreground">{t("packs.pageDescription")}</p>
        <p className="text-sm text-muted-foreground" data-testid="packs-ops-note">
          {t("packs.opsNote")}
        </p>
      </div>

      {notice ? (
        <p className="text-sm" data-testid="packs-checkout-notice" data-notice={notice}>
          {notice === "price_pending"
            ? t("packs.pricePending")
            : notice === "canceled"
              ? t("packs.checkoutCanceled")
              : notice === "confirmed"
                ? t("packs.enabled")
                : notice === "confirm_failed"
                  ? t("packs.confirmFailed")
                  : t("packs.checkoutFailed")}
        </p>
      ) : null}

      {!permissionLoading && !canBuy ? (
        <p className="text-sm text-muted-foreground" data-testid="packs-purchase-denied">
          {t("packs.purchaseDenied")}
        </p>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        {OPTIONAL_PACK_IDS.map((pack) => {
          const enabled = flags[pack] || confirmed[pack] === true;
          return (
            <Card
              key={pack}
              data-testid={`pack-card-${pack}`}
              data-pack={pack}
              data-enabled={enabled ? "true" : "false"}
            >
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
                {canBuy && !enabled ? (
                  <Button
                    type="button"
                    data-testid={`pack-buy-${pack}`}
                    data-permission="billing.manage"
                    disabled={buying !== null}
                    onClick={() => void buy(pack)}
                  >
                    {buying === pack ? t("packs.buying") : t("packs.buy")}
                  </Button>
                ) : null}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
