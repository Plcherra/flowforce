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
import { useGeneralSettings } from "../hooks/useGeneralSettings";
import { useSystemSettingsContext } from "../hooks/SystemSettingsContext";

export function GeneralSettingsPanel() {
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

  if (globalError) {
    return <ErrorState message={globalError.message} />;
  }

  const handleFileChange = (file: File | null) => {
    setLogoFile(file);
    if (file) {
      const preview = URL.createObjectURL(file);
      setLogoUrl(preview);
    } else {
      setLogoUrl(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Company Profile</CardTitle>
        <CardDescription>
          Update the public branding and contact details for this workspace.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="companyName">Company name</Label>
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
            <Label htmlFor="website">Website</Label>
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
            <Label htmlFor="contactEmail">Primary email</Label>
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
            <Label htmlFor="contactPhone">Phone</Label>
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
            <Label htmlFor="companyAddress">Address / HQ</Label>
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
            <Label htmlFor="companyDescription">Description</Label>
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

        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-lg border bg-muted">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt="Logo preview"
                className="h-full w-full object-contain"
              />
            ) : (
              <div className="text-center text-xs text-muted-foreground">
                No logo
              </div>
            )}
          </div>
          <div className="flex-1 space-y-2">
            <Label>Company logo</Label>
            <p className="text-sm text-muted-foreground">
              Upload a transparent PNG or SVG (max 2MB). Logo appears across
              dashboards and emails.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <label
                className={cn(
                  "inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium shadow-sm transition hover:bg-muted",
                  (!canEdit || loading) && "cursor-not-allowed opacity-60",
                )}
              >
                <UploadCloud className="h-4 w-4" />
                <span>Upload logo</span>
                <input
                  type="file"
                  className="hidden"
                  accept="image/png,image/jpeg,image/svg+xml"
                  disabled={!canEdit || loading}
                  onChange={(event) =>
                    handleFileChange(event.target.files?.[0] ?? null)
                  }
                />
              </label>
              {logoFile && <Badge variant="outline">{logoFile.name}</Badge>}
              {logoUrl && canEdit && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleFileChange(null)}
                  disabled={loading}
                >
                  Reset logo
                </Button>
              )}
            </div>
          </div>
        </div>

        {saveError && <ErrorState message={saveError.message} />}

        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            disabled={!dirty || saving || !canEdit}
            onClick={reset}
          >
            Discard
          </Button>
          <Button
            onClick={save}
            disabled={!canEdit || !dirty || saving || loading}
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving
              </>
            ) : (
              "Save changes"
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
