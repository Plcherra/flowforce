import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Download } from 'lucide-react';

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
  return (
    <div className="flex flex-wrap items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="whitespace-nowrap">
            <Download className="mr-2 h-4 w-4" /> Export
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onExportFiltered}>CSV (filtered)</DropdownMenuItem>
          <DropdownMenuItem onClick={onExportAll}>CSV (all)</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {isAdmin && (
        <div className="flex gap-2">
          <Button onClick={onOpenInvite}>+ Invite</Button>
          <Button variant="secondary" onClick={onOpenRoles}>
            Roles
          </Button>
          <Button variant="outline" onClick={onOpenPermissions}>
            Permissions
          </Button>
        </div>
      )}
    </div>
  );
}
