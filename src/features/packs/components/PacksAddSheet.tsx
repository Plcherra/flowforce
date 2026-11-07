"use client";

import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { OPTIONAL_PACK_IDS } from "@/config/packCatalog";
import type { OptionalPackId } from "@/config/packFlags";
import { usePackFlags } from "@/hooks/usePackFlags";
import { PackMonthlyPrice } from "@/features/packs/components/PackMonthlyPrice";

export function PacksAddSheet({
  open,
  onOpenChange,
  onSelect,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (pack: OptionalPackId) => void;
}) {
  const { t } = useTranslation();
  const { flags } = usePackFlags();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[min(78dvh,40rem)] overflow-y-auto rounded-t-3xl pb-[max(1.25rem,env(safe-area-inset-bottom))]"
      >
        <SheetHeader className="text-left">
          <SheetTitle>{t("packs.addMenuTitle")}</SheetTitle>
          <SheetDescription>{t("packs.addMenuDescription")}</SheetDescription>
          <p className="text-sm text-muted-foreground" data-testid="packs-add-price-note">
            {t("packs.pricePlaceholderNote")}
          </p>
        </SheetHeader>
        <ul className="mx-auto mt-4 max-w-3xl space-y-3" data-testid="packs-add-sheet">
          {OPTIONAL_PACK_IDS.map((pack) => {
            const enabled = flags[pack];
            return (
              <li key={pack}>
                <button
                  type="button"
                  data-testid={`pack-add-${pack}`}
                  className="flex w-full flex-col gap-2 rounded-2xl border border-border bg-card px-4 py-3 text-left hover:bg-muted"
                  onClick={() => onSelect(pack)}
                >
                  <span className="flex items-center justify-between gap-3">
                    <span className="font-medium">{t(`packs.${pack}.title`)}</span>
                    <Badge variant={enabled ? "default" : "outline"}>
                      {enabled ? t("packs.statusOn") : t("packs.statusOff")}
                    </Badge>
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {t(`packs.${pack}.description`)}
                  </span>
                  <PackMonthlyPrice pack={pack} priceTestId={`pack-add-price-${pack}`} />
                </button>
              </li>
            );
          })}
        </ul>
      </SheetContent>
    </Sheet>
  );
}
