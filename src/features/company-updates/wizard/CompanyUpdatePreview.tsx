import React from "react";

import { Badge } from "@/components/ui/badge";
import { CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { FileText, Video } from "lucide-react";

import type { WizardFormData } from "./types";
import { SignedUpdateMediaImage } from "./SignedUpdateMediaImage";

interface CompanyUpdatePreviewProps {
  data: WizardFormData;
  device?: "desktop" | "mobile";
  className?: string;
  showMeta?: boolean;
}

export function CompanyUpdatePreview({
  data,
  device = "desktop",
  className,
  showMeta = true,
}: CompanyUpdatePreviewProps) {
  const { backgroundStyle } = data;
  const backgroundConfig = getBackgroundConfig(backgroundStyle);

  const isMobile = device === "mobile";
  const mediaItems = data.updateMedia ?? [];

  const frameClasses = cn(
    "relative overflow-hidden rounded-xl border bg-card shadow-sm transition-shadow",
    isMobile ? "mx-auto max-w-[320px]" : "w-full",
    className,
  );

  return (
    <div className={frameClasses}>
      {isMobile && (
        <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-center gap-2 py-2">
          <div className="h-1 w-12 rounded-full bg-muted" />
        </div>
      )}
      <div
        className={cn(
          "relative px-5 py-6 text-white",
          isMobile ? "min-h-[140px] pt-10" : "min-h-[160px]",
          backgroundConfig.patternClass,
        )}
        style={backgroundConfig.style}
      >
        <div className="absolute inset-0 bg-black/15" />
        <div className="relative z-10 space-y-3">
          <Badge variant="secondary" className="bg-white/20 text-white">
            {data.type}
          </Badge>
          <h2 className="text-xl font-semibold line-clamp-2">
            {data.title || "Untitled update"}
          </h2>
        </div>
      </div>
      <CardContent
        className={cn("space-y-4", isMobile ? "px-4 py-4" : "px-6 py-5")}
      >
        {data.body ? (
          <div
            className="prose prose-sm max-w-none text-muted-foreground"
            dangerouslySetInnerHTML={{ __html: data.body }}
          />
        ) : (
          <p className="text-sm text-muted-foreground">
            Use the fields on the left to start writing your announcement.
          </p>
        )}

        {mediaItems.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Attachments
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {mediaItems.map((media) => (
                <div
                  key={media.id}
                  className="flex items-center gap-3 rounded-xl border bg-muted/30 p-2 text-sm"
                >
                  {media.type === "image" ? (
                    <SignedUpdateMediaImage
                      media={media}
                      className="h-12 w-12 rounded-lg object-cover bg-muted"
                    />
                  ) : media.type === "video" ? (
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-background/70 text-muted-foreground">
                      <Video className="h-5 w-5" />
                    </div>
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-background/70 text-muted-foreground">
                      <FileText className="h-5 w-5" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="line-clamp-1 font-medium">{media.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(media.size / (1024 * 1024)).toFixed(1)} MB
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {showMeta && (
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
            <span>
              {data.publishingSettings.authorAttribution
                ? `By ${data.publishingSettings.authorName || "You"}`
                : "Sent anonymously"}
            </span>
            <div className="flex flex-wrap gap-2">
              {data.publishingSettings.engagement.allowLikes && (
                <Badge variant="outline">Likes</Badge>
              )}
              {data.publishingSettings.engagement.allowComments && (
                <Badge variant="outline">Comments</Badge>
              )}
              {data.publishingSettings.engagement.allowSharing && (
                <Badge variant="outline">Sharing</Badge>
              )}
              {data.publishingSettings.engagement.requireConfirmation && (
                <Badge variant="outline">Read receipt</Badge>
              )}
              {data.publishingSettings.engagement.showAsPopup && (
                <Badge variant="outline">Popup</Badge>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </div>
  );
}

function getBackgroundConfig(style: WizardFormData["backgroundStyle"]): {
  style: React.CSSProperties;
  patternClass?: string;
} {
  const styleWithVars: React.CSSProperties & Record<string, string> = {
    backgroundColor: style.primary,
  };

  if (style.type === "gradient") {
    styleWithVars.backgroundImage = `linear-gradient(135deg, ${style.primary}, ${style.secondary ?? style.primary})`;
  }

  let patternClass: string | undefined;
  if (style.type === "pattern" && style.pattern && style.pattern !== "none") {
    styleWithVars.backgroundColor = style.primary;
    if (style.secondary) {
      styleWithVars.backgroundImage = `linear-gradient(135deg, ${style.primary}, ${style.secondary})`;
    }
    styleWithVars["--pattern-color"] = hexToRgba(
      style.secondary ?? style.primary,
      0.35,
    );
    styleWithVars["--pattern-opacity"] = "0.15";
    patternClass = `pattern-surface pattern-${style.pattern}`;
  }

  return { style: styleWithVars, patternClass };
}

function hexToRgba(hex?: string, alpha = 1): string {
  if (!hex) {
    return `rgba(255, 255, 255, ${alpha})`;
  }
  let normalized = hex.replace("#", "");

  if (normalized.length === 3) {
    normalized = normalized
      .split("")
      .map((char) => char + char)
      .join("");
  }

  const numeric = Number.parseInt(normalized, 16);
  const r = (numeric >> 16) & 255;
  const g = (numeric >> 8) & 255;
  const b = numeric & 255;

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
