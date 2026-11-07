import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { resolveLanguage, isAppLanguage, type AppLanguage } from "@/i18n/resolveLanguage";
import { applyActiveLanguage } from "@/i18n/applyActiveLanguage";
import { readClientLanguage, type LanguageSource } from "@/i18n/languagePreference";
import { saveProfileLanguage } from "@/i18n/saveProfileLanguage";
import { logger } from "@/utils/logger";

interface LanguageContextType {
  currentLanguage: string;
  changeLanguage: (language: string, source?: LanguageSource) => void;
  availableLanguages: Array<{
    code: string;
    name: string;
    flag: string;
  }>;
  profileLanguage: AppLanguage | null;
  profileLanguageReady: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(
  undefined,
);

import { languages } from "@/i18n/languages";

export { languages };

export function LanguageProvider({
  children,
  initialLanguage,
}: {
  children: React.ReactNode;
  initialLanguage?: AppLanguage;
}) {
  const { i18n } = useTranslation();
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const generation = useRef(0);
  const [currentLanguage, setCurrentLanguage] = useState(
    initialLanguage || i18n?.language || "en",
  );
  const [profileLanguage, setProfileLanguage] = useState<AppLanguage | null>(null);
  const [profileLanguageReady, setProfileLanguageReady] = useState(false);
  const i18nRef = useRef(i18n);
  i18nRef.current = i18n;
  const appliedInitial = useRef(false);
  if (!appliedInitial.current && initialLanguage) {
    appliedInitial.current = true;
    void applyActiveLanguage(i18n, initialLanguage, "resolved", { persist: false });
  }

  useEffect(() => {
    if (!userId) {
      setProfileLanguage(null);
      setProfileLanguageReady(false);
      return;
    }
    const requestId = generation.current;
    let active = true;
    void (async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("language, company_id")
        .eq("id", userId)
        .maybeSingle();
      let companyLanguage: unknown = null;
      if (profile?.company_id) {
        const { data: settings } = await supabase
          .from("system_settings")
          .select("localization")
          .eq("company_id", profile.company_id)
          .maybeSingle();
        const localization = settings?.localization;
        if (localization && typeof localization === "object" && "language" in localization) {
          companyLanguage = localization.language;
        }
      }
      if (!active || generation.current !== requestId) return;
      const stored = readClientLanguage();
      let chosen = isAppLanguage(profile?.language) ? profile.language : null;
      if (!chosen && stored.source === "user" && stored.language) {
        await saveProfileLanguage(userId, stored.language);
        if (!active || generation.current !== requestId) return;
        chosen = stored.language;
      }
      setProfileLanguage(chosen);
      setProfileLanguageReady(true);
      const next = chosen ?? resolveLanguage(null, companyLanguage);
      const source: LanguageSource = chosen ? "user" : "resolved";
      await applyActiveLanguage(i18nRef.current, next, source);
      if (active && generation.current === requestId) setCurrentLanguage(next);
    })();
    return () => {
      active = false;
    };
  }, [userId]);

  useEffect(() => {
    // Check if i18n is initialized and has the 'on' method
    if (!i18n || typeof i18n.on !== "function") {
      logger.warn("[LanguageProvider] i18n is not properly initialized", {
        tags: ["warning"],
      });
      return;
    }

    const handleLanguageChange = (lng: string) => {
      setCurrentLanguage(lng);
    };

    i18n.on("languageChanged", handleLanguageChange);
    return () => {
      if (typeof i18n.off === "function") {
        i18n.off("languageChanged", handleLanguageChange);
      }
    };
  }, [i18n]);

  const changeLanguage = async (language: string, source: LanguageSource = "user") => {
    if (!isAppLanguage(language)) return;
    generation.current += 1;
    await applyActiveLanguage(i18n, language, source);
    setCurrentLanguage(language);
  };

  const value = {
    currentLanguage,
    changeLanguage,
    availableLanguages: languages,
    profileLanguage,
    profileLanguageReady,
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
