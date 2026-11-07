"use client";

import { useEffect, useState } from "react";
import { OPTIONAL_PACK_IDS } from "@/config/packCatalog";
import type { OptionalPackId } from "@/config/packFlags";

const UNAVAILABLE: Record<OptionalPackId, boolean> = {
  team: false,
  insights: false,
  stock: false,
};

export function usePackOffers() {
  const [offers, setOffers] = useState<Record<OptionalPackId, boolean> | null>(null);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const response = await fetch("/api/packs/offers");
        const body = (await response.json()) as {
          offers?: Partial<Record<OptionalPackId, boolean>>;
        };
        if (cancelled) return;
        if (!response.ok || !body.offers) {
          setOffers(UNAVAILABLE);
          return;
        }
        setOffers({
          team: body.offers.team === true,
          insights: body.offers.insights === true,
          stock: body.offers.stock === true,
        });
      } catch {
        if (!cancelled) setOffers(UNAVAILABLE);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return { offers, packIds: OPTIONAL_PACK_IDS };
}
