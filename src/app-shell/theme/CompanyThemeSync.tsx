"use client";

import { useEffect } from "react";
import { useCompany } from "@/hooks/useCompany";
import { setCompanyBrand } from "@/lib/theme/companyTheme";

export function CompanyThemeSync() {
  const { company } = useCompany();
  const logoUrl = company?.logo_url ?? "";

  useEffect(() => {
    setCompanyBrand({ logoUrl: logoUrl || null });
  }, [logoUrl]);

  return null;
}
