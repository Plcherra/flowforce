"use client";

import { useTranslation } from "react-i18next";
import { PACK_PLACEHOLDER_MONTHLY_USD } from "@/config/packCatalog";
import type { OptionalPackId } from "@/config/packFlags";

export function PackMonthlyPrice({
  pack,
  showNote = false,
  priceTestId,
}: {
  pack: OptionalPackId;
  showNote?: boolean;
  priceTestId?: string;
}) {
  const { t } = useTranslation();

  return (
    <div className="space-y-1">
      <p className="text-base font-medium" data-testid={priceTestId ?? `pack-price-${pack}`}>
        {t("packs.priceMonthly", { amount: PACK_PLACEHOLDER_MONTHLY_USD[pack] })}
      </p>
      {showNote ? (
        <p className="text-xs text-muted-foreground" data-testid={`pack-price-note-${pack}`}>
          {t("packs.pricePlaceholderNote")}
        </p>
      ) : null}
    </div>
  );
}
