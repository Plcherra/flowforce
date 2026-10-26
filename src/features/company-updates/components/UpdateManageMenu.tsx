import { useTranslation } from "react-i18next";
import { Archive, MoreHorizontal, Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { CompanyUpdate } from "@/types/companyUpdates";

interface UpdateManageMenuProps {
  update: CompanyUpdate;
  onEdit?: (update: CompanyUpdate) => void;
  onArchive: (updateId: string) => void;
  onDelete: (updateId: string) => void;
  onPublish?: (updateId: string) => void;
}

export function UpdateManageMenu({
  update,
  onEdit,
  onArchive,
  onDelete,
  onPublish,
}: UpdateManageMenuProps) {
  const { t } = useTranslation();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9"
          aria-label={t("updates.updateActions")}
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        {update.status === "scheduled" && onPublish ? (
          <DropdownMenuItem onClick={() => onPublish(update.id)}>
            {t("updates.publishNowAction")}
          </DropdownMenuItem>
        ) : null}
        {onEdit ? (
          <DropdownMenuItem onClick={() => onEdit(update)}>
            <Pencil className="mr-2 h-4 w-4" />
            {t("common.edit")}
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem onClick={() => onArchive(update.id)}>
          <Archive className="mr-2 h-4 w-4" />
          {t("updates.archive")}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => onDelete(update.id)}
          className="text-destructive focus:text-destructive"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          {t("common.delete")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
