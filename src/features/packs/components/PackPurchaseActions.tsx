"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import type { OptionalPackId } from "@/config/packFlags";
import { useCanPurchasePacks } from "@/features/packs/useCanPurchasePacks";
import {
  type PackCheckoutNotice,
} from "@/features/packs/useConfirmPackCheckout";
import {
  PackCheckoutError,
  startPackCheckout,
  startPackPortal,
} from "@/services/billing/packCheckoutClient";

export function PackPurchaseActions({
  pack,
  enabled,
  purchasable,
  notice,
  setNotice,
}: {
  pack: OptionalPackId;
  enabled: boolean;
  purchasable: boolean | null;
  notice: PackCheckoutNotice;
  setNotice: (notice: PackCheckoutNotice) => void;
}) {
  const { t } = useTranslation();
  const { canBuy, loading } = useCanPurchasePacks();
  const [buying, setBuying] = useState(false);
  const [managing, setManaging] = useState(false);

  const buy = async () => {
    setBuying(true);
    setNotice(null);
    try {
      await startPackCheckout(pack);
    } catch (error) {
      if (error instanceof PackCheckoutError && error.code === "pack_price_pending") {
        setNotice("price_pending");
      } else if (
        error instanceof PackCheckoutError &&
        error.code === "pack_already_subscribed"
      ) {
        setNotice("already_subscribed");
      } else if (
        error instanceof PackCheckoutError &&
        error.code === "stripe_test_mode_required"
      ) {
        setNotice("test_mode");
      } else {
        setNotice("failed");
      }
      setBuying(false);
    }
  };

  const manage = async () => {
    setManaging(true);
    setNotice(null);
    try {
      await startPackPortal(pack);
    } catch (error) {
      if (error instanceof PackCheckoutError && error.code === "stripe_test_mode_required") {
        setNotice("test_mode");
      } else {
        setNotice("failed");
      }
      setManaging(false);
    }
  };

  if (loading || purchasable === null) {
    return <p className="text-sm text-muted-foreground">{t("packs.loading")}</p>;
  }

  if (!canBuy) {
    return (
      <p className="text-sm text-muted-foreground" data-testid="packs-purchase-denied">
        {t("packs.purchaseDenied")}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {notice ? <PackCheckoutNoticeText notice={notice} /> : null}
      {enabled ? (
        <Button
          type="button"
          variant="outline"
          data-testid={`pack-manage-${pack}`}
          data-permission="billing.manage"
          disabled={managing}
          onClick={() => void manage()}
        >
          {managing ? t("packs.managing") : t("packs.manage")}
        </Button>
      ) : purchasable ? (
        <Button
          type="button"
          data-testid={`pack-buy-${pack}`}
          data-permission="billing.manage"
          disabled={buying}
          onClick={() => void buy()}
        >
          {buying ? t("packs.buying") : t("packs.buyEnable")}
        </Button>
      ) : (
        <p className="text-sm font-medium" data-testid={`pack-pricing-soon-${pack}`}>
          {t("packs.pricingComingSoon")}
        </p>
      )}
    </div>
  );
}

export function PackCheckoutNoticeText({ notice }: { notice: Exclude<PackCheckoutNotice, null> }) {
  const { t } = useTranslation();
  const message =
    notice === "price_pending"
      ? t("packs.pricePending")
      : notice === "canceled"
        ? t("packs.checkoutCanceled")
        : notice === "confirmed"
          ? t("packs.enabled")
          : notice === "confirm_failed"
            ? t("packs.confirmFailed")
            : notice === "already_subscribed"
              ? t("packs.alreadySubscribed")
              : notice === "test_mode"
                ? t("packs.testModeOnly")
                : t("packs.checkoutFailed");

  return (
    <p className="text-sm" data-testid="packs-checkout-notice" data-notice={notice}>
      {message}
    </p>
  );
}
