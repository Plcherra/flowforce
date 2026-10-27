import { useTranslation } from "react-i18next";
import { Heart, MessageCircle, Pin } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CompanyUpdateBody } from "@/features/company-updates/components/CompanyUpdateBody";
import { UpdateManageMenu } from "@/features/company-updates/components/UpdateManageMenu";
import {
  getBackgroundCss,
  getEngagementSettings,
  getTypeColor,
} from "@/features/company-updates/utils";
import type { CompanyUpdate } from "@/types/companyUpdates";

interface UpdateGridViewProps {
  updates: CompanyUpdate[];
  canManage: boolean;
  onLike: (updateId: string, currentlyLiked: boolean) => void;
  onOpenComments: (update: CompanyUpdate) => void;
  onEdit: (update: CompanyUpdate) => void;
  onArchive: (updateId: string) => void;
  onDelete: (updateId: string) => void;
  onPublish: (updateId: string) => void;
}

export function UpdateGridView({
  updates,
  canManage,
  onLike,
  onOpenComments,
  onEdit,
  onArchive,
  onDelete,
  onPublish,
}: UpdateGridViewProps) {
  const { t } = useTranslation();

  return (
    <div className="grid grid-cols-1 gap-4 px-4 py-6 md:grid-cols-2 lg:grid-cols-3">
      {updates.map((update) => {
        const engagement = getEngagementSettings(update);
        return (
          <Card key={update.id} className="overflow-hidden">
            {update.backgroundStyle ? (
              <div
                className="h-16"
                style={{ background: getBackgroundCss(update.backgroundStyle) }}
              />
            ) : null}
            <CardContent className="space-y-3 p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className={`text-xs ${getTypeColor(update.type)}`}>
                    {t(`dashboard.${update.type}`)}
                  </Badge>
                  {update.status === "scheduled" ? (
                    <Badge variant="outline" className="text-xs">
                      {t("updates.scheduledBadge")}
                    </Badge>
                  ) : null}
                  {update.isPinned ? (
                    <Pin className="h-3 w-3 text-primary" aria-hidden="true" />
                  ) : null}
                </div>
                {canManage ? (
                  <UpdateManageMenu
                    update={update}
                    onEdit={onEdit}
                    onArchive={onArchive}
                    onDelete={onDelete}
                    onPublish={onPublish}
                  />
                ) : null}
              </div>
              <CompanyUpdateBody update={update} variant="compact" />
              <div className="flex flex-wrap items-center gap-1">
                {engagement.allowLikes ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 px-3"
                    onClick={() => onLike(update.id, update.viewerHasLiked)}
                    aria-pressed={update.viewerHasLiked}
                  >
                    <Heart
                      className={`mr-1 h-4 w-4 ${update.viewerHasLiked ? "fill-current text-destructive" : ""}`}
                    />
                    <span className="text-xs">
                      {t("updates.like")} {update.likes}
                    </span>
                  </Button>
                ) : null}
                {engagement.allowComments ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 px-3"
                    onClick={() => onOpenComments(update)}
                  >
                    <MessageCircle className="mr-1 h-4 w-4" />
                    <span className="text-xs">
                      {t("updates.comment")} {update.comments}
                    </span>
                  </Button>
                ) : null}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
