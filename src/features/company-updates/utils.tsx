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
      return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
    case "news":
      return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
    case "event":
      return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
    case "policy":
      return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
  }
};

export const getEngagementSettings = (update: CompanyUpdate) => ({
  ...ENGAGEMENT_DEFAULTS,
  ...(update.publishingSettings?.engagement ?? {}),
});
