import type { TFunction } from "i18next";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Timer,
} from "lucide-react";
import type { DocumentProcessingState } from "@/types/ingestion";

export function buildDocumentStatusMeta(
  t: TFunction,
): Record<
  DocumentProcessingState,
  {
    label: string;
    tone: "default" | "warning" | "success" | "destructive";
    icon: React.ComponentType<{ className?: string }>;
  }
> {
  return {
    pending: {
      label: t("analytics.documentStatusPending"),
      tone: "warning",
      icon: Timer,
    },
    processing: {
      label: t("analytics.documentStatusProcessing"),
      tone: "warning",
      icon: Loader2,
    },
    ready: {
      label: t("analytics.documentStatusReady"),
      tone: "success",
      icon: CheckCircle2,
    },
    error: {
      label: t("analytics.documentStatusError"),
      tone: "destructive",
      icon: AlertCircle,
    },
  };
}

export function documentStatusClass(
  tone: "default" | "warning" | "success" | "destructive",
) {
  switch (tone) {
    case "warning":
      return "border-warning/40 text-warning bg-warning/10";
    case "success":
      return "border-success/40 text-success bg-success/10";
    case "destructive":
      return "border-destructive/40 text-destructive bg-destructive/10";
    default:
      return "";
  }
}
