/**
 * Single invite form component
 */

import { useState } from "react";
import { CheckCircle2, Copy, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { SingleInviteForm } from "../../types/invites";
import { DEFAULT_SINGLE_INVITE } from "../../types/invites";
import { buildInviteLink } from "../../utils/inviteHelpers";

interface SingleInviteFormProps {
  form: SingleInviteForm;
  onFormChange: (form: SingleInviteForm) => void;
  onSubmit: (form: SingleInviteForm) => void;
  generatedInviteLink: string | null;
  isPending: boolean;
  onCopyLink: (link: string) => void;
}

export function SingleInviteFormComponent({
  form,
  onFormChange,
  onSubmit,
  generatedInviteLink,
  isPending,
  onCopyLink,
}: SingleInviteFormProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(form);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Invite One Team Member</CardTitle>
        <CardDescription>
          The invite automatically applies the default role and permission set
          for new employees. You can adjust the role if needed.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="invite-first-name">First name *</Label>
              <Input
                id="invite-first-name"
                value={form.firstName}
                onChange={(event) =>
                  onFormChange({ ...form, firstName: event.target.value })
                }
                placeholder="Jordan"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invite-last-name">Last name *</Label>
              <Input
                id="invite-last-name"
                value={form.lastName}
                onChange={(event) =>
                  onFormChange({ ...form, lastName: event.target.value })
                }
                placeholder="Lee"
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="invite-email">Work email *</Label>
            <Input
              id="invite-email"
              type="email"
              value={form.email}
              onChange={(event) =>
                onFormChange({ ...form, email: event.target.value })
              }
              placeholder="jordan.lee@example.com"
              required
            />
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="invite-phone">Phone</Label>
              <Input
                id="invite-phone"
                value={form.phone}
                onChange={(event) =>
                  onFormChange({ ...form, phone: event.target.value })
                }
                placeholder="+1 (555) 123-4567"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invite-birth-date">Birth date</Label>
              <Input
                id="invite-birth-date"
                type="date"
                value={form.birthDate}
                onChange={(event) =>
                  onFormChange({ ...form, birthDate: event.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invite-role">Role</Label>
              <select
                id="invite-role"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={form.role}
                onChange={(event) =>
                  onFormChange({
                    ...form,
                    role: event.target.value as SingleInviteForm["role"],
                  })
                }
              >
                <option value="employee">Employee (default)</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-md border border-dashed p-3 text-xs text-muted-foreground">
            <span>
              New invites start with the default permission template for the
              selected role.
            </span>
            <Badge variant="outline">Auto-assigned</Badge>
          </div>

          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating invite...
              </span>
            ) : (
              "Send invite"
            )}
          </Button>
        </form>

        {generatedInviteLink && (
          <div className="mt-6 rounded-lg border border-green-200 bg-green-50 p-4">
            <div className="flex items-center gap-2 text-green-700">
              <CheckCircle2 className="h-5 w-5" />
              <p className="font-medium">Invite link ready</p>
            </div>
            <p className="mt-1 text-sm text-green-700">
              Share this link with the employee so they can set their password
              and complete onboarding.
            </p>
            <div className="mt-3 flex gap-2">
              <Input value={generatedInviteLink} readOnly className="text-sm" />
              <Button
                variant="outline"
                onClick={() => onCopyLink(generatedInviteLink)}
              >
                <Copy className="mr-2 h-4 w-4" />
                Copy
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
