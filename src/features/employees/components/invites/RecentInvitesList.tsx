/**
 * Recent invites list component
 */

import { formatDistanceToNow } from "date-fns";
import { Mail, Clock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import type { InviteRecord } from "../../types/invites";
import { buildInviteLink } from "../../utils/inviteHelpers";

interface RecentInvitesListProps {
  invites: InviteRecord[] | undefined;
  isLoading: boolean;
  isFetching: boolean;
  onRefresh: () => void;
  onCopyLink: (link: string) => void;
}

function RefreshIcon({ spinning }: { spinning: boolean }) {
  return (
    <span className="flex items-center gap-1">
      <Loader2 className={`h-3.5 w-3.5 ${spinning ? "animate-spin" : ""}`} />
      Refresh
    </span>
  );
}

export function RecentInvitesList({
  invites,
  isLoading,
  isFetching,
  onRefresh,
  onCopyLink,
}: RecentInvitesListProps) {
  return (
    <>
      <Separator />
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Recent invites
          </h3>
          <Button
            variant="ghost"
            size="sm"
            disabled={isFetching}
            onClick={onRefresh}
          >
            <RefreshIcon spinning={isFetching} />
          </Button>
        </div>
        <div className="rounded-md border">
          <ScrollArea className="h-48">
            <div className="divide-y">
              {isLoading ? (
                <div className="px-6 py-10 text-center text-sm text-muted-foreground">
                  Loading invites...
                </div>
              ) : Array.isArray(invites) && invites.length > 0 ? (
                invites.map((invite) => (
                  <div
                    key={invite.id}
                    className="flex items-center justify-between gap-3 px-3 py-3 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="font-medium">
                        {invite.firstName} {invite.lastName}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {invite.email}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-xs text-muted-foreground">
                        {invite.acceptedAt
                          ? `Joined ${formatDistanceToNow(new Date(invite.acceptedAt), { addSuffix: true })}`
                          : `Expires ${formatDistanceToNow(new Date(invite.expiresAt), { addSuffix: true })}`}
                      </div>
                      {invite.acceptedAt ? (
                        <Badge variant="secondary">Accepted</Badge>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            onCopyLink(buildInviteLink(invite.inviteToken))
                          }
                        >
                          <Mail className="mr-2 h-4 w-4" />
                          Copy link
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="px-6 py-10 text-center text-sm text-muted-foreground">
                  <Clock className="mx-auto mb-3 h-5 w-5" />
                  No invites yet. Generate your first invite above.
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
    </>
  );
}
