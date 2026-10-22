import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { GeneralSettings } from "@/types/system-settings";
import { showErrorToast, showSuccessToast } from "@/utils/errorHandler";
import { setCompanyBrand } from "@/lib/theme/companyTheme";
import { buildGeneralCompanyUpdate } from "@/lib/theme/companySavePayload";
import type { SystemSettingsHook } from "./useSystemSettings";

type GeneralFormState = {
  companyName: string;
  contactEmail: string;
  contactPhone: string;
  website: string;
  companyDescription: string;
  address: string;
};

const toFormState = (general: GeneralSettings): GeneralFormState => ({
  companyName: general.companyName ?? "",
  contactEmail: general.contactEmail ?? "",
  contactPhone: general.contactPhone ?? "",
  website: general.website ?? "",
  companyDescription: general.companyDescription ?? "",
  address: general.address ?? "",
});

export function useGeneralSettings(source: SystemSettingsHook) {
  const {
    settings,
    company,
    updateSettings,
    loading,
    error,
    canEdit,
    refresh,
  } = source;
  const general = settings?.general;

  const [state, setState] = useState<GeneralFormState>(
    general
      ? toFormState(general)
      : toFormState({
          companyName: "",
          contactEmail: null,
          contactPhone: null,
          website: null,
          companyDescription: null,
          address: null,
          logoUrl: null,
        }),
  );
  const [logoUrl, setLogoUrl] = useState<string | null>(
    general?.logoUrl ?? null,
  );
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<Error | null>(null);

  useEffect(() => {
    if (!general) return;
    setState(toFormState(general));
    if (!logoFile) {
      setLogoUrl(general.logoUrl);
    }
  }, [general, logoFile]);

  const dirty = useMemo(() => {
    if (!general) return false;
    return (
      JSON.stringify(state) !== JSON.stringify(toFormState(general)) ||
      logoFile !== null
    );
  }, [general, state, logoFile]);

  const uploadLogo = useCallback(
    async (file: File): Promise<string> => {
      if (!company?.id) {
        throw new Error("Company context unavailable for logo upload.");
      }
      const bucket = supabase.storage.from("company-assets");
      const extension = file.name.split(".").pop()?.toLowerCase() ?? "png";
      const fileName = `logo-${Date.now()}.${extension}`;
      const filePath = `${company.id}/${fileName}`;

      if (file.size > 2 * 1024 * 1024) {
        throw new Error("Logo must be 2MB or smaller.");
      }

      const { error: uploadError } = await bucket.upload(filePath, file, {
        upsert: true,
        contentType: file.type || "image/png",
      });
      if (uploadError) throw uploadError;

      const { data } = bucket.getPublicUrl(filePath);
      if (!data?.publicUrl) {
        throw new Error("Unable to retrieve logo URL after upload.");
      }
      return data.publicUrl;
    },
    [company?.id],
  );

  const save = useCallback(async () => {
    if (!general || !company) return;
    setSaving(true);
    setSaveError(null);
    try {
      if (!state.companyName.trim()) {
        throw new Error("Company name is required.");
      }

      let nextLogo = logoUrl ?? general.logoUrl;
      if (logoFile) {
        nextLogo = await uploadLogo(logoFile);
      }

      const payload: GeneralSettings = {
        ...general,
        companyName: state.companyName.trim(),
        contactEmail: state.contactEmail || null,
        contactPhone: state.contactPhone || null,
        website: state.website || null,
        companyDescription: state.companyDescription || null,
        address: state.address || null,
        logoUrl: nextLogo ?? null,
      };

      const { error: companyError } = await supabase
        .from("companies")
        .update(
          buildGeneralCompanyUpdate({
            name: payload.companyName,
            description: payload.companyDescription,
            website: payload.website,
            phone: payload.contactPhone,
            logoUrl: payload.logoUrl,
          }),
        )
        .eq("id", company.id);

      if (companyError) throw companyError;

      await updateSettings({
        general: payload,
        localization: {
          ...settings?.localization,
          timezone: company.timezone ?? settings?.localization.timezone,
        },
      });
      setCompanyBrand({
        logoUrl: payload.logoUrl,
      });
      setLogoUrl(payload.logoUrl);
      setLogoFile(null);
      await refresh();
      showSuccessToast("General settings saved");
    } catch (err) {
      setSaveError(err as Error);
      showErrorToast(err, "saveGeneralSettings");
      throw err;
    } finally {
      setSaving(false);
    }
  }, [
    general,
    state,
    logoUrl,
    logoFile,
    uploadLogo,
    updateSettings,
    company,
    settings?.localization,
    refresh,
  ]);

  const reset = useCallback(() => {
    if (!general) return;
    setState(toFormState(general));
    setLogoUrl(general.logoUrl);
    setLogoFile(null);
    setSaveError(null);
    setCompanyBrand({
      logoUrl: general.logoUrl,
    });
  }, [general]);

  return {
    loading,
    globalError: error,
    canEdit,
    state,
    setState,
    logoUrl,
    setLogoUrl,
    logoFile,
    setLogoFile,
    dirty,
    saving,
    saveError,
    save,
    reset,
  };
}
