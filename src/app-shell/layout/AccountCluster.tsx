import { useState } from "react";
import { LogOut, Settings, User } from "lucide-react";
import { useNavigate } from "@/lib/router-adapter";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { NotificationsPanel } from "@/app-shell/notifications/NotificationsPanel";
import { useAuth } from "@/hooks/useAuth";
import { useCan } from "@/hooks/useCan";
import { useProfile } from "@/hooks/useProfile";
import { getRoleBadgeColor, getRoleLabel } from "@/data/navigationData";

export function AccountCluster() {
  const { signOut } = useAuth();
  const { profile } = useProfile();
  const { can } = useCan();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);
  const role = profile?.role || "staff";
  const initials = `${profile?.first_name?.[0] ?? ""}${profile?.last_name?.[0] ?? ""}`;
  const name = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ");

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9 rounded-full"
          aria-label={unreadCount > 0 ? `Account, ${unreadCount} unread` : "Account"}
          data-testid="account-cluster"
        >
          <Avatar className="h-8 w-8">
            <AvatarImage src={profile?.avatar_url || undefined} />
            <AvatarFallback className="bg-primary/10 text-xs text-primary">
              {initials || "?"}
            </AvatarFallback>
          </Avatar>
          {unreadCount > 0 ? (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-medium text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        forceMount
        className="w-80 p-0 data-[state=closed]:hidden"
      >
        <div className="flex items-center gap-3 border-b px-3 py-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={profile?.avatar_url || undefined} />
            <AvatarFallback className="bg-primary/10 text-primary">
              {initials || "?"}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{name || "Account"}</p>
            <Badge className={`mt-1 text-xs ${getRoleBadgeColor(role)}`}>
              {getRoleLabel(role)}
            </Badge>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-1 border-b p-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-auto flex-col gap-1 px-1 py-2 text-xs"
            onClick={() => navigate("/app/profile")}
          >
            <User className="h-4 w-4" />
            Profile
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-auto flex-col gap-1 px-1 py-2 text-xs"
            onClick={() => navigate("/app/settings")}
          >
            <Settings className="h-4 w-4" />
            {can("systemSettings") ? "Settings" : "Account"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-auto flex-col gap-1 px-1 py-2 text-xs"
            onClick={() => signOut()}
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
        </div>
        <NotificationsPanel embedded onUnreadCount={setUnreadCount} />
      </PopoverContent>
    </Popover>
  );
}
