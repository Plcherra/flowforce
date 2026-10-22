import { useTranslation } from "react-i18next";
import React, { useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Palette,
  Type as TypeIcon,
  Image as ImageIcon,
  Sparkles,
  UploadCloud,
  Video,
  FileText,
  X,
  Loader2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

import type { WizardFormData } from "../CreateUpdateWizard";
import type { UpdateMediaItem } from "../types";
import { GRADIENT_PRESETS, BACKGROUND_PATTERNS } from "@/data/updateTemplates";
import { CompanyUpdatePreview } from "@/features/company-updates/wizard/CompanyUpdatePreview";
import { RichTextEditor } from "@/features/company-updates/wizard/RichTextEditor";
import {
  SignedUpdateMediaImage,
  useSignedUpdateMediaUrl,
} from "@/features/company-updates/wizard/SignedUpdateMediaImage";
import { useUploadMedia } from "@/features/company-updates/wizard/useUploadMedia";

interface DesignContentStepProps {
  formData: WizardFormData;
  updateFormData: (updates: Partial<WizardFormData>) => void;
}

const MAX_BODY_CHARACTERS = 1000;
const MAX_TITLE_CHARACTERS = 100;

const stripHtml = (html: string) => {
  if (!html) return "";
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

const limitTitleLines = (value: string) => {
  const lines = value.split("\n");
  return lines.slice(0, 2).join("\n");
};

export function DesignContentStep({
  formData,
  updateFormData,
}: DesignContentStepProps) {
  const { t } = useTranslation();
  const [previewMedia, setPreviewMedia] = useState<UpdateMediaItem | null>(
    null,
  );
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const {
    uploadFiles,
    isUploading,
    progress,
    error: uploadError,
  } = useUploadMedia();

  const updateBackgroundStyle = (
    updates: Partial<typeof formData.backgroundStyle>,
  ) => {
    updateFormData({
      backgroundStyle: { ...formData.backgroundStyle, ...updates },
    });
  };

  const handleGradientPreset = (preset: (typeof GRADIENT_PRESETS)[number]) => {
    updateBackgroundStyle({
      type: "gradient",
      primary: preset.primary,
      secondary: preset.secondary,
    });
  };

  const handleContentChange = (html: string, plainText: string) => {
    updateFormData({
      body: html,
      richContent: html,
      bodyPlainText: plainText,
    });
  };

  const handleMediaUpload = async (files?: FileList | File[]) => {
    if (!files) return;
    const uploaded = await uploadFiles(files);
    if (uploaded.length > 0) {
      updateFormData({
        updateMedia: [...(formData.updateMedia ?? []), ...uploaded],
      });
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    await handleMediaUpload(event.dataTransfer.files);
  };

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  const mediaItems = formData.updateMedia ?? [];
  const previewMediaUrl = useSignedUpdateMediaUrl(previewMedia);
  const bodyPlainText = formData.bodyPlainText ?? stripHtml(formData.body);

  return (
    <>
    <div className="flex w-full min-w-0 flex-col gap-6">
      <div className="grid w-full min-w-0 grid-cols-1 items-stretch gap-4 min-[880px]:h-[min(36rem,calc(100dvh-13rem))] min-[880px]:grid-cols-[minmax(0,5fr)_minmax(0,3fr)_minmax(0,4fr)]">
          <div className="flex h-[min(32rem,calc(100dvh-13rem))] min-h-0 flex-col gap-2 min-[880px]:h-full">
            <div className="flex h-5 shrink-0 items-center gap-2 text-muted-foreground">
              <TypeIcon className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wide">
                {t("dashboard.content")} </span>
            </div>
          <section
            id="wizard-section-content"
            className="flex min-h-0 flex-1 flex-col rounded-2xl border bg-card p-4 shadow-sm"
          >
            <div className="mb-3 flex shrink-0 justify-end">
              <Badge variant="outline" className="border-dashed">
                {t("forms.required")} </Badge>
            </div>

            <div className="flex min-h-0 flex-1 flex-col gap-3">
              <div className="shrink-0 space-y-2">
                <Label htmlFor="title">{t("tasks.title")}</Label>
                <Textarea
                  id="title"
                  value={formData.title}
                  maxLength={MAX_TITLE_CHARACTERS}
                  onChange={(e) =>
                    updateFormData({ title: limitTitleLines(e.target.value) })
                  }
                  placeholder={t("updates.writeAShortScannableTitle")}
                  rows={2}
                  className="resize-none rounded-2xl border bg-muted/30 p-3 text-xl font-semibold leading-tight focus-visible:ring-0"
                />
                <p className="text-xs text-muted-foreground">
                  {formData.title.length}/{MAX_TITLE_CHARACTERS} {t("updates.charactersLimitedToTwoLines")} </p>
              </div>

              <div className="grid shrink-0 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>{t("schedule.type")}</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value) =>
                      updateFormData({ type: value as WizardFormData["type"] })
                    }
                  >
                    <SelectTrigger className="rounded-xl">
                      <SelectValue placeholder={t("dashboard.announcement")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="announcement">{t("dashboard.announcement")}</SelectItem>
                      <SelectItem value="news">{t("dashboard.news")}</SelectItem>
                      <SelectItem value="event">{t("dashboard.event")}</SelectItem>
                      <SelectItem value="policy">{t("dashboard.policy")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>{t("tasks.priority")}</Label>
                  <Select
                    value={formData.priority}
                    onValueChange={(value) =>
                      updateFormData({
                        priority: value as WizardFormData["priority"],
                      })
                    }
                  >
                    <SelectTrigger className="rounded-xl">
                      <SelectValue placeholder={t("tasks.selectPriority")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">{t("tasks.high")}</SelectItem>
                      <SelectItem value="medium">{t("tasks.medium")}</SelectItem>
                      <SelectItem value="low">{t("tasks.low")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex min-h-0 flex-1 flex-col gap-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{t("updates.body")}</span>
                  <span>
                    {bodyPlainText.length}/{MAX_BODY_CHARACTERS} {t("updates.characters")} </span>
                </div>
                <RichTextEditor
                  value={formData.body}
                  onChange={handleContentChange}
                />
              </div>
            </div>
          </section>
          </div>

          <div className="flex h-full min-h-0 flex-col gap-2">
            <p className="flex h-5 items-center text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {t("updates.desktop")} </p>
            <CompanyUpdatePreview
              data={formData}
              device="desktop"
              frame="compact"
              className="min-h-[16rem] flex-1"
            />
          </div>
          <div className="flex h-full min-h-0 flex-col gap-2">
            <p className="flex h-5 items-center justify-center text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {t("updates.mobile")} </p>
            <CompanyUpdatePreview
              data={formData}
              device="mobile"
              className="min-h-0 flex-1"
            />
          </div>
      </div>

          <section
            id="wizard-section-media"
            className="rounded-2xl border bg-card p-6 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-primary" />
                <div>
                  <h4 className="text-sm font-semibold">{t("updates.mediaAttachments")}</h4>
                  <p className="text-xs text-muted-foreground">
                    {t("updates.addVisualsVideoOrFilesToYourAnnouncement")} </p>
                </div>
              </div>
            </div>

            <div
              className={cn(
                "mt-4 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed bg-muted/30 p-6 text-center transition",
                isDragging && "border-primary bg-primary/5",
              )}
              onDragOver={(event) => {
                event.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={(event) => {
                event.preventDefault();
                setIsDragging(false);
              }}
              onDrop={handleDrop}
            >
              <UploadCloud className="h-10 w-10 text-muted-foreground" />
              <p className="mt-3 text-sm font-medium">{t("updates.dragDropFilesOr")}</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3 rounded-full"
                onClick={handleBrowseClick}
              >
                {t("updates.browseLibrary")} </Button>
              <p className="mt-2 text-xs text-muted-foreground">
                {t("updates.imagesVideoPdfOrDocsUpTo50mbEach")} </p>
              {isUploading && (
                <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  {t("updates.uploading")} {progress}%
                </div>
              )}
              {uploadError && (
                <p className="mt-3 text-xs text-destructive">{uploadError}</p>
              )}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,video/*,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx"
                onChange={(event) =>
                  handleMediaUpload(event.target.files ?? undefined)
                }
                className="hidden"
              />
            </div>

            {mediaItems.length > 0 && (
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {mediaItems.map((media) => (
                  <button
                    key={media.id}
                    type="button"
                    onClick={() => setPreviewMedia(media)}
                    className="group relative overflow-hidden rounded-2xl border bg-muted/30 p-2 text-left"
                  >
                    {media.type === "image" ? (
                      <SignedUpdateMediaImage
                        media={media}
                        className="h-32 w-full rounded-xl object-cover bg-muted"
                      />
                    ) : media.type === "video" ? (
                      <div className="flex h-32 w-full items-center justify-center rounded-xl bg-background/70">
                        <Video className="h-6 w-6 text-muted-foreground" />
                      </div>
                    ) : (
                      <div className="flex h-32 w-full flex-col items-center justify-center rounded-xl bg-background/70 text-xs text-muted-foreground">
                        <FileText className="h-6 w-6" />
                        <span className="mt-2 line-clamp-2 px-2 text-center">
                          {media.name}
                        </span>
                      </div>
                    )}
                    <div className="mt-2">
                      <p className="line-clamp-1 text-sm font-medium">
                        {media.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {(media.size / (1024 * 1024)).toFixed(1)} {t("updates.mb")} </p>
                    </div>
                    <Button
                      type="button"
                      size="icon"
                      variant="secondary"
                      className="absolute right-2 top-2 h-6 w-6 rounded-full opacity-0 transition group-hover:opacity-100"
                      onClick={(event) => {
                        event.stopPropagation();
                        updateFormData({
                          updateMedia: mediaItems.filter(
                            (item) => item.id !== media.id,
                          ),
                        });
                      }}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </button>
                ))}
              </div>
            )}
          </section>

          <section
            id="wizard-section-style"
            className="rounded-2xl border bg-card p-6 shadow-sm"
          >
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <div>
                <h4 className="text-sm font-semibold">{t("updates.visualStyle")}</h4>
                <p className="text-xs text-muted-foreground">
                  {t("updates.tuneBackgroundGradientsAndPatterns")} </p>
              </div>
            </div>

            <div className="mt-4 space-y-6">
              <div className="grid gap-2 sm:grid-cols-2">
                {GRADIENT_PRESETS.map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => handleGradientPreset(preset)}
                    className="flex items-center gap-3 rounded-2xl border bg-background/50 p-3 text-left transition hover:border-primary"
                  >
                    <span
                      className="h-10 w-10 rounded-full border"
                      style={{
                        background: `linear-gradient(135deg, ${preset.primary}, ${preset.secondary})`,
                      }}
                    />
                    <div>
                      <p className="text-sm font-medium">{preset.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {t("updates.gradientPreset")} </p>
                    </div>
                  </button>
                ))}
              </div>

              <div className="space-y-2">
                <Label>{t("updates.backgroundStyle")}</Label>
                <div className="flex flex-wrap gap-2">
                  {(["solid", "gradient", "pattern"] as const).map((style) => (
                    <Button
                      key={style}
                      type="button"
                      variant={
                        formData.backgroundStyle.type === style
                          ? "default"
                          : "outline"
                      }
                      className="rounded-full px-4"
                      onClick={() => updateBackgroundStyle({ type: style })}
                    >
                      {style.charAt(0).toUpperCase() + style.slice(1)}
                    </Button>
                  ))}
                </div>
              </div>

              {formData.backgroundStyle.type === "pattern" && (
                <div className="space-y-2">
                  <Label>{t("updates.pattern")}</Label>
                  <div className="grid grid-cols-2 gap-3">
                    {BACKGROUND_PATTERNS.map((pattern) => (
                      <Button
                        key={pattern.id}
                        type="button"
                        variant={
                          formData.backgroundStyle.pattern === pattern.id
                            ? "default"
                            : "outline"
                        }
                        className="rounded-xl"
                        onClick={() =>
                          updateBackgroundStyle({
                            pattern:
                              pattern.id as WizardFormData["backgroundStyle"]["pattern"],
                          })
                        }
                      >
                        {pattern.name}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="primary-color">{t("updates.primaryColor")}</Label>
                  <div className="mt-2 flex gap-2">
                    <input
                      id="primary-color"
                      type="color"
                      value={formData.backgroundStyle.primary}
                      onChange={(e) =>
                        updateBackgroundStyle({ primary: e.target.value })
                      }
                      className="h-12 w-14 cursor-pointer rounded-xl border bg-background"
                    />
                    <Input
                      value={formData.backgroundStyle.primary}
                      onChange={(e) =>
                        updateBackgroundStyle({ primary: e.target.value })
                      }
                      placeholder={t("updates.3b82f6")}
                      className="rounded-xl"
                    />
                  </div>
                </div>

                {formData.backgroundStyle.type === "gradient" && (
                  <div>
                    <Label htmlFor="secondary-color">{t("updates.secondaryColor")}</Label>
                    <div className="mt-2 flex gap-2">
                      <input
                        id="secondary-color"
                        type="color"
                        value={formData.backgroundStyle.secondary || "#1e40af"}
                        onChange={(e) =>
                          updateBackgroundStyle({ secondary: e.target.value })
                        }
                        className="h-12 w-14 cursor-pointer rounded-xl border bg-background"
                      />
                      <Input
                        value={formData.backgroundStyle.secondary || "#1e40af"}
                        onChange={(e) =>
                          updateBackgroundStyle({ secondary: e.target.value })
                        }
                        placeholder={t("updates.1e40af")}
                        className="rounded-xl"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
      </div>

      <Dialog
        open={Boolean(previewMedia)}
        onOpenChange={(open) => !open && setPreviewMedia(null)}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{previewMedia?.name}</DialogTitle>
          </DialogHeader>
          {previewMedia?.type === "image" && (
            <SignedUpdateMediaImage
              media={previewMedia}
              className="w-full rounded-xl object-contain bg-muted"
            />
          )}
          {previewMedia?.type === "video" && previewMediaUrl && (
            <video
              controls
              src={previewMediaUrl}
              className="w-full rounded-xl"
            />
          )}
          {previewMedia?.type === "file" && (
            <div className="flex flex-col items-center gap-4 py-6 text-center">
              <FileText className="h-10 w-10 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                {t("updates.downloadToViewThisDocument")} </p>
              <Button size="sm" asChild>
                <a
                  href={previewMediaUrl ?? "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {t("updates.openAttachment")} </a>
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
