"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { isAppLanguage, type AppLanguage } from "@/i18n/resolveLanguage";
import { saveProfileLanguage } from "@/i18n/saveProfileLanguage";
import { AUDIT_ACTIONS } from "@/services/audit/auditEvents";
import { logAuditEvent } from "@/services/audit/auditService";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
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
  const { changeLanguage, availableLanguages } = useLanguage();
  const { t } = useTranslation();
  const { toast } = useToast();
  const [saved, setSaved] = useState<string | null>(null);
  const [staged, setStaged] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);

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
        const language = isAppLanguage(data?.language) ? data.language : null;
        setSaved(language);
        setStaged(language);
        setReady(true);
      });
    return () => {
      active = false;
    };
  }, [user]);

  const dirty = staged !== saved;

  const onSave = async () => {
    if (!user || !staged || !isAppLanguage(staged) || staged === saved) return;
    setSaving(true);
    const error = await saveProfileLanguage(user.id, staged);
    if (error) {
      setSaving(false);
      toast({
        title: t("personalLanguage.saveFailed"),
        description: error.message,
        variant: "destructive",
      });
      return;
    }
    await changeLanguage(staged);
    await logAuditEvent({
      action: AUDIT_ACTIONS.settingsUpdated,
      tableName: "profiles",
      recordId: user.id,
      metadata: {
        details: [{ field: "language", before: saved, after: staged satisfies AppLanguage }],
      },
    });
    setSaved(staged);
    setSaving(false);
  };

  return (
    <div className="mb-6 max-w-xs space-y-2" data-testid="personal-language-setting">
      <Label>{t("personalLanguage.label")}</Label>
      <Select
        value={staged ?? undefined}
        onValueChange={(next) => {
          if (isAppLanguage(next)) setStaged(next);
        }}
        disabled={!user || !ready || saving}
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
      {dirty ? (
        <div className="flex gap-2">
          <Button
            type="button"
            data-testid="personal-language-save"
            disabled={saving}
            onClick={() => void onSave()}
          >
            {t("common.save")}
          </Button>
          <Button
            type="button"
            variant="outline"
            data-testid="personal-language-cancel"
            disabled={saving}
            onClick={() => setStaged(saved)}
          >
            {t("common.cancel")}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
