import { useTranslation } from "react-i18next";
import { Loader2, Trash2 } from "lucide-react";
import { formsTableMinWidth, formsTableScroller } from "@/features/forms/utils/formsSurface";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FormListTitle } from "@/features/forms/components/FormContentText";
import type { FormContentTranslation } from "@/features/forms/formContentFields";
import type { FormWithMeta } from "@/features/forms/hooks/useForms";
import {
  formatDate,
  getOwnerName,
  getStatusColor,
  getTypeLabel,
} from "@/features/forms/components/form-utils";
import { formShiftLinkKeys } from "@/features/forms/utils/formShiftLink";

interface FormsSectionProps {
  title: string;
  forms: FormWithMeta[];
  loading: boolean;
  refreshing?: boolean;
  canEdit?: boolean;
  emptyMessage?: string;
  translations?: Map<string, FormContentTranslation | null>;
  onFill: (formId: string) => void;
  onEdit: (formId: string) => void;
  onDelete?: (formId: string) => void;
  onPublish?: (formId: string) => void;
  onArchive?: (formId: string) => void;
  onRestore?: (formId: string) => void;
  onViewSubmissions?: (formId: string) => void;
}

export function FormsSection({
  title,
  forms,
  loading,
  refreshing = false,
  canEdit = true,
  emptyMessage,
  translations,
  onFill,
  onEdit,
  onDelete,
  onPublish,
  onArchive,
  onRestore,
  onViewSubmissions,
}: FormsSectionProps) {
  const { t } = useTranslation();
  const skeletonRows = Array.from({ length: 3 });

  return (
    <section className="space-y-2">
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
      <Card className="border border-muted bg-background">
        {loading ? (
          <div className="p-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("schedule.name")}</TableHead>
                  <TableHead>{t("schedule.type")}</TableHead>
                  <TableHead>{t("schedule.status")}</TableHead>
                  <TableHead>{t("forms.created")}</TableHead>
                  <TableHead>{t("forms.lastEdited")}</TableHead>
                  <TableHead>{t("forms.owner")}</TableHead>
                  {(canEdit || onViewSubmissions) && (
                    <TableHead className="text-right">{t("forms.formActions")}</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {skeletonRows.map((_, index) => (
                  <TableRow key={`forms-skeleton-${index}`}>
                    <TableCell>
                      <Skeleton className="h-5 w-32" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-24" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-20" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-28" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-28" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-24" />
                    </TableCell>
                    {(canEdit || onViewSubmissions) && (
                      <TableCell>
                        <Skeleton className="ml-auto h-8 w-8 rounded-full" />
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : forms.length === 0 ? (
          <div className="p-6 text-sm text-muted-foreground">
            {emptyMessage ?? t("forms.noFormsToDisplay")}
          </div>
        ) : (
          <div className={`relative ${formsTableScroller}`}>
            {refreshing && (
              <div className="absolute right-4 top-3 z-10 flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                {t("forms.syncing")}</div>
            )}
            <Table
              className={`${formsTableMinWidth} ${
                refreshing ? "opacity-60 transition-opacity" : ""
              }`}
            >
              <TableHeader>
                <TableRow>
                  <TableHead>{t("schedule.name")}</TableHead>
                  <TableHead>{t("schedule.type")}</TableHead>
                  <TableHead>{t("schedule.status")}</TableHead>
                  <TableHead>{t("forms.created")}</TableHead>
                  <TableHead>{t("forms.lastEdited")}</TableHead>
                  <TableHead>{t("forms.owner")}</TableHead>
                  {(canEdit || onViewSubmissions) && (
                    <TableHead className="text-right">{t("forms.formActions")}</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {forms.map((form) => (
                  <TableRow key={form.id}>
                    <TableCell>
                      <FormListTitle
                        formId={form.id}
                        title={form.title}
                        translation={translations?.get(form.id) ?? null}
                      />
                      {(() => {
                        const link = formShiftLinkKeys(form.settings);
                        if (!link) return null;
                        return (
                          <p className="text-xs text-muted-foreground">
                            {t("forms.linkedAs", {
                              area: t(link.areaKey),
                              slot: t(link.slotKey),
                            })}
                          </p>
                        );
                      })()}
                    </TableCell>
                    <TableCell>{getTypeLabel(form, t("forms.general"))}</TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(form.status)}>
                        {t(
                          form.status === "published"
                            ? "forms.statusPublished"
                            : form.status === "archived"
                              ? "forms.statusArchived"
                              : "forms.statusDraft",
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDate(form.created_at)}</TableCell>
                    <TableCell>
                      {formatDate(form.updated_at || form.created_at)}
                    </TableCell>
                    <TableCell>{getOwnerName(form, t("forms.unassigned"))}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap justify-end gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          className="min-h-11"
                          onClick={() => onFill(form.id)}
                        >
                          {t("forms.fillForm")}
                        </Button>
                        {onViewSubmissions ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="min-h-11"
                            onClick={() => onViewSubmissions(form.id)}
                          >
                            {t("forms.viewSubmissions")}
                          </Button>
                        ) : null}
                        {canEdit && form.status === "draft" && onPublish ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="min-h-11"
                            onClick={() => onPublish(form.id)}
                          >
                            {t("forms.publishForm")}
                          </Button>
                        ) : null}
                        {canEdit && form.status !== "archived" && onArchive ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="min-h-11"
                            onClick={() => onArchive(form.id)}
                          >
                            {t("forms.archiveForm")}
                          </Button>
                        ) : null}
                        {canEdit && form.status === "archived" && onRestore ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="min-h-11"
                            onClick={() => onRestore(form.id)}
                          >
                            {t("forms.restoreForm")}
                          </Button>
                        ) : null}
                        {canEdit ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="min-h-11"
                            onClick={() => onEdit(form.id)}
                          >
                            {t("forms.editForm")}
                          </Button>
                        ) : null}
                        {canEdit && onDelete ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="min-h-11 min-w-11"
                            aria-label={t("forms.deleteForm")}
                            onClick={() => onDelete(form.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
    </section>
  );
}

export default FormsSection;
