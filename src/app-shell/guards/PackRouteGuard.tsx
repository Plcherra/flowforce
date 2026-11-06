"use client";

import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { LoadingSpinner } from "@/components/ui/loading-states";
import { packRequiredForPath } from "@/config/packFlags";
import { usePackFlags } from "@/hooks/usePackFlags";
import { useLocation } from "@/lib/router-adapter";
import { PackUnavailable } from "./PackUnavailable";

export function PackRouteGuard({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const location = useLocation();
  const { isPackEnabled, isReady } = usePackFlags();
  const required = packRequiredForPath(location.pathname);

  if (!required) return <>{children}</>;

  if (!isReady) {
    return (
      <div
        className="flex min-h-[40vh] items-center justify-center"
        data-testid="pack-route"
        data-pack={required}
        data-state="loading"
      >
        <LoadingSpinner text={t("packs.loading")} />
      </div>
    );
  }

  if (!isPackEnabled(required)) {
    return <PackUnavailable pack={required} />;
  }

  return (
    <div data-testid="pack-route" data-pack={required} data-state="open">
      {children}
    </div>
  );
}
