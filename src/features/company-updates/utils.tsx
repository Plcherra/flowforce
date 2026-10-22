import type { CompanyUpdate } from "@/types/companyUpdates";
import { Bell, Newspaper, Calendar, FileText } from "lucide-react";
import type { ReactElement } from "react";

export const ENGAGEMENT_DEFAULTS = {
  allowLikes: true,
  allowComments: true,
  allowSharing: false,
  requireConfirmation: false,
  showAsPopup: false,
} as const;

export const getUpdateIcon = (type: CompanyUpdate["type"]): ReactElement => {
  switch (type) {
    case "announcement":
      return <Bell className="h-4 w-4" />;
    case "news":
      return <Newspaper className="h-4 w-4" />;
    case "event":
      return <Calendar className="h-4 w-4" />;
    case "policy":
      return <FileText className="h-4 w-4" />;
    default:
      return <Bell className="h-4 w-4" />;
  }
};

export const getBackgroundCss = (bg?: CompanyUpdate["backgroundStyle"]) => {
  if (!bg) return undefined;
  if (bg.type === "gradient" && bg.secondary) {
    return `linear-gradient(135deg, ${bg.primary}, ${bg.secondary})`;
  }
  if (bg.type === "pattern") {
    return `${bg.primary}`;
  }
  return bg.primary;
};

export const getTypeColor = (type: CompanyUpdate["type"]) => {
  switch (type) {
    case "announcement":
      return "bg-primary/10 text-primary";
    case "news":
      return "bg-success-muted text-success";
    case "event":
      return "bg-secondary/10 text-secondary";
    case "policy":
      return "bg-warning-muted text-warning-foreground";
    default:
      return "bg-muted text-foreground";
  }
};

export const getEngagementSettings = (update: CompanyUpdate) => ({
  ...ENGAGEMENT_DEFAULTS,
  ...(update.publishingSettings?.engagement ?? {}),
});
