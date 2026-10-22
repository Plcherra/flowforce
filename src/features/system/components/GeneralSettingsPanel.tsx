import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, UploadCloud } from "lucide-react";
import { cn } from "@/lib/utils";
import { ErrorState } from "./ErrorState";
import { LogoEditorDialog } from "./LogoEditorDialog";
import {
  applyTheme,
  resolveThemeName,
  THEME_NAMES,
  THEME_STORAGE_KEY,
  type ThemeName,
} from "@/lib/theme/applyTheme";
import { useEffect, useState } from "react";
import { useGeneralSettings } from "../hooks/useGeneralSettings";
import { useSystemSettingsContext } from "../hooks/SystemSettingsContext";
import { useTranslation } from "react-i18next";

export function GeneralSettingsPanel() {
  const { t } = useTranslation();
  const system = useSystemSettingsContext();
  const {
    loading,
    globalError,
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
  } = useGeneralSettings(system);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorSource, setEditorSource] = useState<string | null>(null);
  const [theme, setTheme] = useState<ThemeName>("flowforce");

  useEffect(() => {
    setTheme(resolveThemeName(localStorage.getItem(THEME_STORAGE_KEY)));
  }, []);

  const chooseTheme = (next: ThemeName) => {
    setTheme(next);
    applyTheme(next);
    localStorage.setItem(THEME_STORAGE_KEY, next);
  };

  if (globalError) {
    return <ErrorState message={globalError.message} />;
  }

  const handleFileChange = (file: File | null) => {
    if (!file) {
      setLogoFile(null);
      setLogoUrl(null);
      setEditorSource(null);
      return;
    }
    setEditorSource(URL.createObjectURL(file));
    setEditorOpen(true);
  };

  const handleEditorConfirm = (file: File, previewUrl: string) => {
    setLogoFile(file);
    setLogoUrl(previewUrl);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("settings.companyProfile")}</CardTitle>
        <CardDescription>{t("settings.updateThePublicBrandingAndContactDetailsFor")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label id="theme-switch-label">{t("settings.theme")}</Label>
          <p className="text-xs text-muted-foreground">{t("settings.storedInThisBrowserItDoesNotChange")}</p>
          <div
            role="radiogroup"
            aria-labelledby="theme-switch-label"
            className="flex flex-wrap gap-2"
          >
            {THEME_NAMES.map((name) => (
              <Button
                key={name}
                type="button"
                role="radio"
                aria-checked={theme === name}
                variant={theme === name ? "default" : "outline"}
                onClick={() => chooseTheme(name)}
              >
                {name === "flowforce"
                  ? "FlowForce"
                  : name === "light"
                    ? "Light"
                    : "Dark"}
              </Button>
            ))}
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="companyName">{t("settings.companyName")}</Label>
            <Input
              id="companyName"
              value={state.companyName}
              onChange={(event) =>
                setState((prev) => ({
                  ...prev,
                  companyName: event.target.value,
                }))
              }
              disabled={!canEdit || loading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="website">{t("onboarding.userInfo.fields.website")}</Label>
            <Input
              id="website"
              value={state.website}
              onChange={(event) =>
                setState((prev) => ({ ...prev, website: event.target.value }))
              }
              disabled={!canEdit || loading}
              placeholder="https://example.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contactEmail">{t("settings.primaryEmail")}</Label>
            <Input
              id="contactEmail"
              type="email"
              value={state.contactEmail}
              onChange={(event) =>
                setState((prev) => ({
                  ...prev,
                  contactEmail: event.target.value,
                }))
              }
              disabled={!canEdit || loading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contactPhone">{t("onboarding.userInfo.fields.phone")}</Label>
            <Input
              id="contactPhone"
              value={state.contactPhone}
              onChange={(event) =>
                setState((prev) => ({
                  ...prev,
                  contactPhone: event.target.value,
                }))
              }
              disabled={!canEdit || loading}
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="companyAddress">{t("settings.addressHq")}</Label>
            <Textarea
              id="companyAddress"
              value={state.address}
              onChange={(event) =>
                setState((prev) => ({ ...prev, address: event.target.value }))
              }
              disabled={!canEdit || loading}
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="companyDescription">{t("schedule.description")}</Label>
            <Textarea
              id="companyDescription"
              value={state.companyDescription}
              onChange={(event) =>
                setState((prev) => ({
                  ...prev,
                  companyDescription: event.target.value,
                }))
              }
              disabled={!canEdit || loading}
              rows={3}
            />
          </div>
        </div>

        <div className="flex flex-col gap-3 md:flex-row md:items-start">
          <div className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-lg border bg-logo-background">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={t("onboarding.logoPreview")}
                className="h-[88px] w-[88px] object-contain"
              />
            ) : (
              <div className="text-center text-xs text-muted-foreground">{t("settings.noLogo")}</div>
            )}
          </div>
          <div className="flex-1 space-y-2">
            <Label>{t("settings.companyLogo")}</Label>
            <p className="text-sm text-muted-foreground">{t("settings.uploadAPngJpegOrSvgMax2mb")}</p>
            <div className="flex flex-wrap items-center gap-2">
              <label
                className={cn(
                  "inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium shadow-sm transition hover:bg-muted",
                  (!canEdit || loading) && "cursor-not-allowed opacity-60",
                )}
              >
                <UploadCloud className="h-4 w-4" />
                <span>{t("settings.uploadLogo")}</span>
                <input
                  type="file"
                  className="hidden"
                  accept="image/png,image/jpeg,image/svg+xml"
                  disabled={!canEdit || loading}
                  onChange={(event) => {
                    event.preventDefault();
                    handleFileChange(event.target.files?.[0] ?? null);
                    event.target.value = "";
                  }}
                />
              </label>
              {logoFile && <Badge variant="outline">{logoFile.name}</Badge>}
              {logoUrl && canEdit && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleFileChange(null)}
                  disabled={loading}
                >{t("settings.resetLogo")}</Button>
              )}
            </div>
          </div>
        </div>

        <LogoEditorDialog
          open={editorOpen}
          sourceUrl={editorSource}
          onOpenChange={setEditorOpen}
          onConfirm={handleEditorConfirm}
        />

        {saveError && <ErrorState message={saveError.message} />}

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="secondary"
            disabled={!dirty || saving || !canEdit}
            onClick={reset}
          >{t("settings.discard")}</Button>
          <Button
            type="button"
            onClick={save}
            disabled={!canEdit || !dirty || saving || loading}
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />{t("settings.saving")}</>
            ) : (
              t("settings.saveChanges")
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
