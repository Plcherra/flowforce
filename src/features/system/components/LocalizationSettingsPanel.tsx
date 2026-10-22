import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { ErrorState } from "./ErrorState";
import { useSystemSettingsContext } from "../hooks/SystemSettingsContext";
import { useLocalizationSettings } from "../hooks/useLocalizationSettings";
import { useTranslation } from "react-i18next";

const TIMEZONE_OPTIONS = [
  { value: "UTC", label: "UTC" },
  { value: "America/New_York", label: "Eastern (US & Canada)" },
  { value: "America/Chicago", label: "Central (US & Canada)" },
  { value: "America/Denver", label: "Mountain (US & Canada)" },
  { value: "America/Los_Angeles", label: "Pacific (US & Canada)" },
  { value: "Europe/London", label: "London (UK)" },
  { value: "Europe/Paris", label: "Paris (France)" },
  { value: "Asia/Tokyo", label: "Tokyo (Japan)" },
];

const LANGUAGE_OPTIONS = [
  { value: "en", label: "English" },
  { value: "es", label: "Español" },
  { value: "fr", label: "Français" },
  { value: "de", label: "Deutsch" },
  { value: "it", label: "Italiano" },
  { value: "pt", label: "Português" },
];

const CURRENCY_OPTIONS = [
  { value: "USD", label: "USD ($)" },
  { value: "EUR", label: "EUR (€)" },
  { value: "GBP", label: "GBP (£)" },
  { value: "CAD", label: "CAD ($)" },
  { value: "AUD", label: "AUD ($)" },
];

export function LocalizationSettingsPanel() {
  const { t } = useTranslation();
  const system = useSystemSettingsContext();
  const {
    loading,
    globalError,
    canEdit,
    state,
    setState,
    updateRegionalFormat,
    dirty,
    saving,
    saveError,
    save,
    reset,
  } = useLocalizationSettings(system);

  if (globalError) {
    return <ErrorState message={globalError.message} />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("settings.localization")}</CardTitle>
        <CardDescription>{t("settings.alignCurrencyTimezoneAndRegionalFormattingAcrossAnalytics")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label>{t("updates.timezone")}</Label>
            <Select
              value={state.timezone}
              onValueChange={(value) =>
                setState((prev) => ({ ...prev, timezone: value }))
              }
              disabled={!canEdit || loading}
            >
              <SelectTrigger>
                <SelectValue placeholder={t("settings.selectTimezone")} />
              </SelectTrigger>
              <SelectContent>
                {TIMEZONE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{t("settings.language")}</Label>
            <Select
              value={state.language}
              onValueChange={(value) =>
                setState((prev) => ({ ...prev, language: value }))
              }
              disabled={!canEdit || loading}
            >
              <SelectTrigger>
                <SelectValue placeholder={t("settings.selectLanguage")} />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{t("settings.currency")}</Label>
            <Select
              value={state.currency}
              onValueChange={(value) =>
                setState((prev) => ({ ...prev, currency: value }))
              }
              disabled={!canEdit || loading}
            >
              <SelectTrigger>
                <SelectValue placeholder={t("settings.selectCurrency")} />
              </SelectTrigger>
              <SelectContent>
                {CURRENCY_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-muted-foreground">{t("settings.regionalFormats")}</h3>
          <div className="mt-3 grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="format-date">{t("settings.datePattern")}</Label>
              <Input
                id="format-date"
                value={state.regionalFormats.date}
                onChange={(event) =>
                  updateRegionalFormat("date", event.target.value)
                }
                disabled={!canEdit || loading}
                placeholder={t("settings.mmDdYyyy")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="format-time">{t("settings.timePattern")}</Label>
              <Input
                id="format-time"
                value={state.regionalFormats.time}
                onChange={(event) =>
                  updateRegionalFormat("time", event.target.value)
                }
                disabled={!canEdit || loading}
                placeholder={t("settings.hhMmA")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="format-number">{t("settings.numberPattern")}</Label>
              <Input
                id="format-number"
                value={state.regionalFormats.number}
                onChange={(event) =>
                  updateRegionalFormat("number", event.target.value)
                }
                disabled={!canEdit || loading}
                placeholder="1,234.56"
              />
            </div>
          </div>
        </div>

        {saveError && <ErrorState message={saveError.message} />}

        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            disabled={!dirty || saving || !canEdit}
            onClick={reset}
          >{t("settings.discard")}</Button>
          <Button
            onClick={save}
            disabled={!canEdit || !dirty || saving || loading}
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />{t("settings.saving")}</>
            ) : (
              t("settings.saveLocalization")
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
