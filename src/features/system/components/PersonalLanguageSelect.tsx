"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { isAppLanguage } from "@/i18n/resolveLanguage";
import { saveProfileLanguage } from "@/i18n/saveProfileLanguage";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function PersonalLanguageSelect() {
  const { user } = useAuth();
  const { changeLanguage, availableLanguages, currentLanguage } = useLanguage();
  const { t } = useTranslation();
  const { toast } = useToast();
  const [value, setValue] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!user) {
      setReady(true);
      return;
    }
    let active = true;
    void supabase
      .from("profiles")
      .select("language")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!active) return;
        setValue(isAppLanguage(data?.language) ? data.language : null);
        setReady(true);
      });
    return () => {
      active = false;
    };
  }, [user]);

  const onChange = async (next: string) => {
    if (!user || !isAppLanguage(next)) return;
    setValue(next);
    await changeLanguage(next);
    const error = await saveProfileLanguage(user.id, next);
    if (error) {
      toast({
        title: t("personalLanguage.saveFailed"),
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="mb-6 max-w-xs space-y-2">
      <Label>{t("personalLanguage.label")}</Label>
      <Select
        value={value ?? undefined}
        onValueChange={(next) => {
          void onChange(next);
        }}
        disabled={!user || !ready}
      >
        <SelectTrigger data-testid="personal-language">
          <SelectValue placeholder={t("personalLanguage.placeholder")} />
        </SelectTrigger>
        <SelectContent>
          {availableLanguages.map((language) => (
            <SelectItem key={language.code} value={language.code}>
              {language.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
