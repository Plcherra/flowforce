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
  frame?: "default" | "compact";
  className?: string;
  showMeta?: boolean;
}

export function CompanyUpdatePreview({
  data,
  device = "desktop",
  frame = "default",
  className,
  showMeta = true,
}: CompanyUpdatePreviewProps) {
  const { backgroundStyle } = data;
  const backgroundConfig = getBackgroundConfig(backgroundStyle);

  const isMobile = device === "mobile";
  const isCompact = !isMobile && frame === "compact";
  const mediaItems = data.updateMedia ?? [];

  const article = (
    <>
      <div
        className={cn(
          "relative text-white",
          isMobile ? "px-5 py-6" : isCompact ? "px-3 py-3" : "px-6 py-6",
          backgroundConfig.patternClass,
        )}
        style={backgroundConfig.style}
      >
        <div className="absolute inset-0 bg-black/15" />
        <div className="relative z-10 space-y-2">
          <Badge variant="secondary" className="bg-white/20 text-white">
            {data.type}
          </Badge>
          <h2
            className={cn(
              "font-semibold line-clamp-2",
              isMobile ? "text-xl" : isCompact ? "text-base" : "text-2xl",
            )}
          >
            {data.title || "Untitled update"}
          </h2>
        </div>
      </div>
      <CardContent
        className={cn(
          isMobile
            ? "space-y-4 px-5 py-5 text-base"
            : isCompact
              ? "flex flex-1 flex-col space-y-2 px-3 py-3 text-sm"
              : "space-y-4 px-6 py-5",
        )}
      >
        {data.body ? (
          <div
            className="prose prose-sm max-w-none text-muted-foreground"
            dangerouslySetInnerHTML={{ __html: data.body }}
          />
        ) : (
          <p className="text-sm text-muted-foreground">
            The update text shows up here.
          </p>
        )}

        {mediaItems.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Attachments
            </p>
            <div className={cn("grid gap-3", isMobile ? "grid-cols-1" : "sm:grid-cols-2")}>
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
          </div>
        )}
      </CardContent>
    </>
  );

  if (isMobile) {
    return (
      <div className={cn("mx-auto flex h-full w-full max-w-[20rem] flex-col", className)}>
        <div className="flex h-full min-h-[22rem] flex-col rounded-[2rem] border-[10px] border-neutral-900 bg-neutral-900 shadow-xl">
          <div className="flex h-6 shrink-0 items-end justify-center pb-1">
            <div className="h-1.5 w-16 rounded-full bg-neutral-700" />
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto rounded-[1.15rem] bg-background">
            {article}
          </div>
          <div className="flex h-5 shrink-0 items-center justify-center">
            <div className="h-1 w-20 rounded-full bg-neutral-700" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex h-full min-h-0 flex-col overflow-hidden border bg-muted/40 shadow-sm",
        isCompact ? "rounded-lg" : "rounded-xl",
        className,
      )}
    >
      <div
        className={cn(
          "flex shrink-0 items-center border-b bg-background",
          isCompact ? "gap-1.5 px-2 py-1.5" : "gap-2 px-3 py-2",
        )}
      >
        <span className={cn("rounded-full bg-red-400/80", isCompact ? "h-2 w-2" : "h-2.5 w-2.5")} />
        <span className={cn("rounded-full bg-amber-400/80", isCompact ? "h-2 w-2" : "h-2.5 w-2.5")} />
        <span className={cn("rounded-full bg-emerald-400/80", isCompact ? "h-2 w-2" : "h-2.5 w-2.5")} />
        <span
          className={cn(
            "ml-1.5 flex-1 truncate rounded-md bg-muted text-muted-foreground",
            isCompact ? "px-2 py-0.5 text-[11px]" : "px-2 py-1 text-xs",
          )}
        >
          Updates
        </span>
      </div>
      <div className={cn("flex min-h-0 flex-1 flex-col overflow-y-auto", isCompact ? "p-2" : "p-3 sm:p-4")}>
        <div className="flex min-h-full flex-1 flex-col overflow-hidden rounded-md border bg-card shadow-sm">
          {article}
        </div>
      </div>
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
