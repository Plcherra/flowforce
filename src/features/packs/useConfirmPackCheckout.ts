"use client";

import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { isOptionalPackId } from "@/config/packCatalog";
import type { OptionalPackId } from "@/config/packFlags";
import { useCanPurchasePacks } from "@/features/packs/useCanPurchasePacks";
import { confirmPackCheckout } from "@/services/billing/packCheckoutClient";

export type PackCheckoutNotice =
  | "price_pending"
  | "canceled"
  | "failed"
  | "confirm_failed"
  | "confirmed"
  | "already_subscribed"
  | "test_mode"
  | null;

export function useConfirmPackCheckout() {
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { canBuy, loading: permissionLoading } = useCanPurchasePacks();
  const [notice, setNotice] = useState<PackCheckoutNotice>(null);
  const [confirmed, setConfirmed] = useState<Partial<Record<OptionalPackId, boolean>>>({});
  const confirmStarted = useRef<string | null>(null);

  useEffect(() => {
    const checkout = searchParams.get("checkout");
    const pack = searchParams.get("pack");
    const sessionId = searchParams.get("session_id");

    if (checkout === "canceled") {
      setNotice("canceled");
      return;
    }

    if (checkout !== "success" || !sessionId) return;
    const packId = isOptionalPackId(pack) ? pack : packFromPath();
    if (!packId) return;
    if (permissionLoading || !canBuy) return;

    const key = `${packId}:${sessionId}`;
    if (confirmStarted.current === key) return;
    confirmStarted.current = key;
    let cancelled = false;

    void (async () => {
      try {
        await confirmPackCheckout({ pack: packId, sessionId });
        if (cancelled) return;
        setConfirmed((current) => ({ ...current, [packId]: true }));
        setNotice("confirmed");
        await queryClient.invalidateQueries({ queryKey: ["pack-flags"] });
        const url = new URL(window.location.href);
        url.searchParams.delete("checkout");
        url.searchParams.delete("session_id");
        url.searchParams.delete("pack");
        window.history.replaceState(null, "", `${url.pathname}${url.search}`);
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

  return { notice, setNotice, confirmed };
}

function packFromPath(): OptionalPackId | null {
  if (typeof window === "undefined") return null;
  const segment = window.location.pathname.split("/").filter(Boolean).pop();
  return isOptionalPackId(segment) ? segment : null;
}
