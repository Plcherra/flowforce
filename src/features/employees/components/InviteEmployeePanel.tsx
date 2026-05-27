import { FormEvent, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRoles } from "@/hooks/useRoles";
import { useToast } from "@/hooks/use-toast";

type InviteForm = {
  first: string;
  last: string;
  email: string;
  role: string;
};

const defaultForm: InviteForm = {
  first: "",
  last: "",
  email: "",
  role: "staff",
};

export function InviteEmployeePanel() {
  const [form, setForm] = useState<InviteForm>(defaultForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { data: roles = [], isLoading: rolesLoading } = useRoles();
  const { toast } = useToast();

  const roleOptions = useMemo(() => {
    if (!roles.length) {
      return [
        { label: "Staff", value: "staff" },
        { label: "Manager", value: "manager" },
        { label: "Supervisor", value: "supervisor" },
      ];
    }

    return roles.map((role) => ({
      label: role.name,
      value: role.id,
    }));
  }, [roles]);

  useEffect(() => {
    if (!roles.length) return;
    if (roles.some((role) => role.id === form.role)) return;
    setForm((prev) => ({ ...prev, role: roles[0].id }));
  }, [roles, form.role]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;

    if (!form.email) {
      toast({
        variant: "destructive",
        title: "Email required",
        description: "Add an email address before sending an invitation.",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const rolePayload = deriveRolePayload(form.role, roles);
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;

      if (!accessToken) {
        throw new Error("Your session expired. Please sign in again.");
      }

      const response = await fetch("/api/employees/invite", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: form.email,
          firstName: form.first,
          lastName: form.last,
          role: rolePayload.roleKey,
          roleId: rolePayload.roleId,
        }),
      });

      if (!response.ok) {
        const result = (await response.json().catch(() => ({}))) as {
          message?: string;
          details?: { message?: string } | string;
        };
        const detailMessage =
          typeof result.details === "string"
            ? result.details
            : result.details?.message;
        throw new Error(
          [result.message, detailMessage].filter(Boolean).join(": ") ||
            "Failed to send invitation",
        );
      }

      toast({
        title: "Invitation sent",
        description: "We emailed the invite and let the teammate know.",
      });
      setForm(defaultForm);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to send invitation";
      toast({
        variant: "destructive",
        title: "Unable to send invite",
        description: message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Invite a Teammate</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="first-name">First name</Label>
              <Input
                id="first-name"
                value={form.first}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, first: event.target.value }))
                }
                placeholder="Taylor"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="last-name">Last name</Label>
              <Input
                id="last-name"
                value={form.last}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, last: event.target.value }))
                }
                placeholder="Rivera"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              required
              value={form.email}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, email: event.target.value }))
              }
              placeholder="taylor@example.com"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Role</Label>
            <Select
              value={form.role}
              onValueChange={(value) =>
                setForm((prev) => ({ ...prev, role: value }))
              }
              disabled={rolesLoading || isSubmitting}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                {roleOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Sending..." : "Send Invite"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function deriveRolePayload(
  selectedValue: string,
  roles: Array<{ id: string; name: string }>,
) {
  const match = roles.find((role) => role.id === selectedValue);
  if (!match) {
    return {
      roleKey: normalizeRole(selectedValue),
      roleId: null,
    };
  }

  return {
    roleKey: normalizeRole(match.name),
    roleId: match.id,
  };
}

function normalizeRole(value: string) {
  const normalized = value.toLowerCase();
  const allowed = [
    "admin",
    "manager",
    "employee",
    "staff",
    "supervisor",
    "owner",
  ];
  if (allowed.includes(normalized)) {
    return normalized;
  }
  return "staff";
}
