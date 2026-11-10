import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client"; // pragma: allowlist secret
import { useProfile } from "@/hooks/useProfile";
import { useSystemSettingsContext } from "@/features/system/hooks/SystemSettingsContext";
import { useToast } from "@/hooks/use-toast";
import { StoreStep } from "@/features/onboarding/account/StoreStep";
import {
  blankStore,
  defaultStoreHours,
  storeDraftProblem,
  type StoreDraft,
  type StoreHours,
} from "@/features/stores/storeDraft";
import { useCompanyStores } from "@/features/stores/useCompanyStores";

function draftFromStore(store: {
  id: string;
  name: string;
  address: string;
  hours: StoreHours;
}): StoreDraft {
  const hours = { ...defaultStoreHours(), ...store.hours };
  return { key: store.id, name: store.name, address: store.address, hours };
}

export function StoresSettingsCard() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { profile } = useProfile();
  const { canEdit } = useSystemSettingsContext();
  const queryClient = useQueryClient();
  const { stores, loading } = useCompanyStores();
  const [drafts, setDrafts] = useState<StoreDraft[] | null>(null);
  const [saving, setSaving] = useState(false);
  const companyId = profile?.company_id ?? profile?.companyId ?? null;
  const editing = drafts ?? (stores.length > 0 ? stores.map(draftFromStore) : [blankStore()]);

  const save = async () => {
    if (!companyId || !canEdit) return;
    if (editing.some((store) => store.name.trim() && storeDraftProblem(store))) {
      toast({ title: t("settings.storeNameRequired"), variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const kept = new Set(editing.filter((store) => stores.some((row) => row.id === store.key)).map((store) => store.key));
      for (const existing of stores) {
        if (kept.has(existing.id)) continue;
        await supabase // pragma: allowlist secret
          .from("stores")
          .update({ archived_at: new Date().toISOString(), updated_at: new Date().toISOString() })
          .eq("id", existing.id);
      }
      for (const draft of editing) {
        if (!draft.name.trim()) continue;
        const payload = {
          company_id: companyId,
          name: draft.name.trim(),
          address: draft.address.trim() || null,
          hours: draft.hours,
          updated_at: new Date().toISOString(),
        };
        if (stores.some((store) => store.id === draft.key)) {
          await supabase.from("stores").update(payload).eq("id", draft.key); // pragma: allowlist secret
        } else {
          await supabase.from("stores").insert(payload); // pragma: allowlist secret
        }
      }
      const { data } = await supabase.auth.getSession(); // pragma: allowlist secret
      const token = data.session?.access_token;
      if (token) {
        await fetch("/api/stores/remap", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
      }
      await queryClient.invalidateQueries({ queryKey: ["company-stores"] });
      setDrafts(null);
      toast({ title: t("settings.storeSaved") });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card data-testid="settings-stores">
      <CardHeader>
        <CardTitle>{t("settings.storesTitle")}</CardTitle>
        <CardDescription>{t("settings.storesHelp")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? <p className="text-sm text-muted-foreground">{t("common.loading")}</p> : null}
        <StoreStep stores={editing} onChange={setDrafts} readOnly={!canEdit} />
        {canEdit ? (
          <Button type="button" data-testid="settings-save-stores" onClick={() => void save()} disabled={saving || !companyId}>
            {t("settings.saveStore")}
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
