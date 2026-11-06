"use client";

import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { OptionalPackId } from "@/config/packFlags";
import { useNavigate } from "@/lib/router-adapter";

export function PackUnavailable({ pack }: { pack: OptionalPackId }) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div
      className="mx-auto max-w-lg p-6"
      data-testid="pack-route"
      data-pack={pack}
      data-state="blocked"
    >
      <Card>
        <CardHeader>
          <CardTitle>{t(`packs.unavailable.${pack}.title`)}</CardTitle>
          <CardDescription>
            {t(`packs.unavailable.${pack}.description`)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            type="button"
            data-testid="pack-back-to-ops"
            onClick={() => navigate("/app/dashboard")}
          >
            {t("packs.backToOps")}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
