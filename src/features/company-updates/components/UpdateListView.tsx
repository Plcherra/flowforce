import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { Heart, MessageCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CompanyUpdateBody } from "@/features/company-updates/components/CompanyUpdateBody";
import { UpdateManageMenu } from "@/features/company-updates/components/UpdateManageMenu";
import { dateLocaleForLanguage } from "@/features/company-updates/dateLocale";
import {
  getEngagementSettings,
  getTypeColor,
} from "@/features/company-updates/utils";
import type { CompanyUpdate } from "@/types/companyUpdates";

interface UpdateListViewProps {
  updates: CompanyUpdate[];
  canManage: boolean;
  onLike: (updateId: string, currentlyLiked: boolean) => void;
  onOpenComments: (update: CompanyUpdate) => void;
  onEdit: (update: CompanyUpdate) => void;
  onArchive: (updateId: string) => void;
  onDelete: (updateId: string) => void;
  onPublish: (updateId: string) => void;
}

export function UpdateListView({
  updates,
  canManage,
  onLike,
  onOpenComments,
  onEdit,
  onArchive,
  onDelete,
  onPublish,
}: UpdateListViewProps) {
  const { t, i18n } = useTranslation();
  const dateLocale = dateLocaleForLanguage(i18n.language);

  return (
    <div className="px-4 py-6">
      <Card className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("schedule.title")}</TableHead>
              <TableHead className="hidden sm:table-cell">
                {t("schedule.type")}
              </TableHead>
              <TableHead className="hidden md:table-cell">
                {t("tasks.priority")}
              </TableHead>
              <TableHead className="hidden lg:table-cell">
                {t("schedule.published")}
              </TableHead>
              <TableHead className="hidden md:table-cell">
                {t("updates.engagement2")}
              </TableHead>
              <TableHead className="w-[1%] text-right">
                {t("updates.updateActions")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {updates.map((update) => {
              const engagement = getEngagementSettings(update);
              const published = Number.isNaN(new Date(update.publishDate).getTime())
                ? ""
                : format(new Date(update.publishDate), "PP", {
                    locale: dateLocale,
                  });
              return (
                <TableRow key={update.id}>
                  <TableCell className="min-w-[12rem] font-medium">
                    <CompanyUpdateBody update={update} variant="compact" />
                    {update.status === "scheduled" ? (
                      <Badge variant="outline" className="mt-2 text-xs">
                        {t("updates.scheduledBadge")}
                      </Badge>
                    ) : null}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Badge className={`text-xs ${getTypeColor(update.type)}`}>
                      {t(`dashboard.${update.type}`)}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {t(`tasks.${update.priority}`)}
                  </TableCell>
                  <TableCell className="hidden whitespace-nowrap lg:table-cell">
                    {published}
                  </TableCell>
                  <TableCell className="hidden text-xs text-muted-foreground md:table-cell">
                    {t("updates.views")} {update.views} {t("updates.likes")}{" "}
                    {update.likes} {t("updates.comments")} {update.comments}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      {engagement.allowLikes ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9"
                          onClick={() => onLike(update.id, update.viewerHasLiked)}
                          aria-pressed={update.viewerHasLiked}
                          aria-label={t("updates.like")}
                        >
                          <Heart
                            className={`h-4 w-4 ${update.viewerHasLiked ? "fill-current text-destructive" : ""}`}
                          />
                        </Button>
                      ) : null}
                      {engagement.allowComments ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9"
                          onClick={() => onOpenComments(update)}
                          aria-label={t("updates.comment")}
                        >
                          <MessageCircle className="h-4 w-4" />
                        </Button>
                      ) : null}
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
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
