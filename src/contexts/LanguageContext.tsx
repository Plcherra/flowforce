import React, { createContext, useContext, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { resolveLanguage } from "@/i18n/resolveLanguage";
import { logger } from "@/utils/logger";

interface LanguageContextType {
  currentLanguage: string;
  changeLanguage: (language: string) => void;
  availableLanguages: Array<{
    code: string;
    name: string;
    flag: string;
  }>;
}

const LanguageContext = createContext<LanguageContextType | undefined>(
  undefined,
);

export const languages = [
  { code: "en", name: "English", flag: "🇺🇸" },
  { code: "es", name: "Español", flag: "🇪🇸" },
  { code: "fr", name: "Français", flag: "🇫🇷" },
  { code: "de", name: "Deutsch", flag: "🇩🇪" },
  { code: "it", name: "Italiano", flag: "🇮🇹" },
  { code: "pt", name: "Português", flag: "🇵🇹" },
];

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const { i18n } = useTranslation();
  const { user } = useAuth();
  const [currentLanguage, setCurrentLanguage] = useState(
    i18n?.language || "en",
  );

  useEffect(() => {
    if (!user) return;
    let active = true;
    void (async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("language, company_id")
        .eq("id", user.id)
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
      if (!active) return;
      const next = resolveLanguage(profile?.language, companyLanguage);
      await i18n.changeLanguage(next);
      localStorage.setItem("i18nextLng", next);
    })();
    return () => {
      active = false;
    };
  }, [i18n, user]);

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

  const changeLanguage = async (language: string) => {
    await i18n.changeLanguage(language);
    localStorage.setItem("i18nextLng", language);
  };

  const value = {
    currentLanguage,
    changeLanguage,
    availableLanguages: languages,
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
