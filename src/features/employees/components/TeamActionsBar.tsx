import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download } from "lucide-react";

type TeamActionsBarProps = {
  isAdmin: boolean;
  onOpenInvite: () => void;
  onOpenRoles: () => void;
  onOpenPermissions: () => void;
  onExportFiltered: () => void;
  onExportAll: () => void;
};

export function TeamActionsBar({
  isAdmin,
  onOpenInvite,
  onOpenRoles,
  onOpenPermissions,
  onExportFiltered,
  onExportAll,
}: TeamActionsBarProps) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-wrap items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="whitespace-nowrap">
            <Download className="mr-2 h-4 w-4" /> {t("schedule.export")}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onExportFiltered}>
            {t("employees.csvFiltered")}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onExportAll}>{t("employees.csvAll")}</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {isAdmin && (
        <div className="flex gap-2">
          <Button onClick={onOpenInvite}>{t("employees.invite")}</Button>
          <Button variant="secondary" onClick={onOpenRoles}>
            {t("updates.roles")}
          </Button>
          <Button variant="outline" onClick={onOpenPermissions}>
            {t("registration.roles.permissions")}
          </Button>
        </div>
      )}
    </div>
  );
}
