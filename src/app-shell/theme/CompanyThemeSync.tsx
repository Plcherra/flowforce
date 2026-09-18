"use client";

import { useEffect } from "react";
import { useCompany } from "@/hooks/useCompany";
import { supabase } from "@/integrations/supabase/client";
import {
  DEFAULT_LOGO_BACKGROUND,
  setCompanyBrand,
} from "@/lib/theme/companyTheme";

export function CompanyThemeSync() {
  const { company } = useCompany();
  const companyId = company?.id ?? "";
  const primary = company?.primary_color ?? "";
  const secondary = company?.secondary_color ?? "";
  const logoUrl = company?.logo_url ?? "";

  useEffect(() => {
    setCompanyBrand({
      primary: primary || null,
      secondary: secondary || null,
      logoUrl: logoUrl || null,
    });

    if (!companyId) {
      return undefined;
    }

    let cancelled = false;
    void supabase
      .from("system_settings")
      .select("appearance")
      .eq("company_id", companyId)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        const appearance = data?.appearance as
          | { logoBackgroundColor?: string }
          | null;
        setCompanyBrand({
          logoBackground:
            appearance?.logoBackgroundColor ?? DEFAULT_LOGO_BACKGROUND,
        });
      });

    return () => {
      cancelled = true;
    };
  }, [companyId, primary, secondary, logoUrl]);

  return null;
}
