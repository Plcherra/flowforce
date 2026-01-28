/**
 * Invite form sidebar component
 */

import { UserPlus, Copy } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { InviteFormState, CompanyInvite } from "../types/userManagement";
import { formatRoleLabel, formatDateTimeLocale } from "@/shared/utils";

interface InviteFormSidebarProps {
  inviteForm: InviteFormState;
  onInviteFormChange: (form: InviteFormState) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  generatedInviteLink: string | null;
  isPending: boolean;
  pendingInvites: CompanyInvite[];
  isLoading: boolean;
  roleOptions: string[];
  onCopyLink: () => void;
}

export function InviteFormSidebar({
  inviteForm,
  onInviteFormChange,
  onSubmit,
  generatedInviteLink,
  isPending,
  pendingInvites,
  isLoading,
  roleOptions,
  onCopyLink,
}: InviteFormSidebarProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserPlus className="h-5 w-5" />
          Invite team member
        </CardTitle>
        <CardDescription>
          Generate a pre-account invite link for new employees.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              placeholder="First name"
              value={inviteForm.firstName}
              onChange={(event) =>
                onInviteFormChange({
                  ...inviteForm,
                  firstName: event.target.value,
                })
              }
            />
            <Input
              placeholder="Last name"
              value={inviteForm.lastName}
              onChange={(event) =>
                onInviteFormChange({
                  ...inviteForm,
                  lastName: event.target.value,
                })
              }
            />
          </div>
          <Input
            type="email"
            placeholder="Work email"
            value={inviteForm.email}
            onChange={(event) =>
              onInviteFormChange({
                ...inviteForm,
                email: event.target.value,
              })
            }
          />
          <Select
            value={inviteForm.role}
            onValueChange={(value) =>
              onInviteFormChange({ ...inviteForm, role: value })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Assign starting role" />
            </SelectTrigger>
            <SelectContent>
              {roleOptions.map((role) => (
                <SelectItem key={role} value={role}>
                  {formatRoleLabel(role)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Creating invite…" : "Create invite"}
          </Button>
        </form>

        {generatedInviteLink && (
          <div className="rounded-lg border border-dashed border-border bg-muted/30 p-3 text-xs text-muted-foreground">
            <div className="mb-2 flex items-center justify-between">
              <span>New invite link</span>
              <Button
                variant="ghost"
                size="sm"
                type="button"
                onClick={onCopyLink}
              >
                <Copy className="mr-2 h-4 w-4" />
                Copy
              </Button>
            </div>
            <div className="truncate font-medium text-foreground">
              {generatedInviteLink}
            </div>
          </div>
        )}

        <Separator />

        <div>
          <div className="mb-2 flex items-center justify-between text-sm font-medium text-muted-foreground">
            Pending invites
            <Badge variant="outline">{pendingInvites.length}</Badge>
          </div>
          {isLoading ? (
            <div className="text-xs text-muted-foreground">
              Loading pending invites…
            </div>
          ) : pendingInvites.length === 0 ? (
            <div className="text-xs text-muted-foreground">
              Everyone invited has joined. Great job!
            </div>
          ) : (
            <ScrollArea className="h-48">
              <div className="space-y-3 pr-2">
                {pendingInvites.slice(0, 6).map((invite) => (
                  <div
                    key={invite.id}
                    className="rounded-lg border border-border p-3 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-foreground">
                        {invite.email}
                      </span>
                      <Badge variant="secondary">
                        {formatRoleLabel(invite.role)}
                      </Badge>
                    </div>
                    <div className="mt-1 text-muted-foreground">
                      Created {formatDateTimeLocale(invite.created_at)}
                    </div>
                    <div className="text-muted-foreground">
                      Expires {formatDateTimeLocale(invite.expires_at)}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
