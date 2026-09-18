/**
 * Hook for invite mutations
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { sendCompanyInvites } from "../utils/sendCompanyInvites";
import type {
  InvitePersonCard,
  BulkInviteRow,
  BulkInviteResult,
} from "../types/invites";
import type { CompanyRole } from "@/hooks/useCompanyRoles";
import type { OrganizationLocation } from "@/hooks/useLocations";
import type { Department } from "../types/directory";

const COMPANY_INVITES_QUERY_KEY = ["employees", "company-invites"];

interface UseInviteMutationsProps {
  onInvitesCreated?: () => void;
}

function matchClassId(classes: CompanyRole[], className: string) {
  const needle = className.trim().toLowerCase();
  if (!needle) return classes.find((role) => role.product_level === "staff")?.id;
  return (
    classes.find((role) => role.name.trim().toLowerCase() === needle)?.id ??
    classes.find((role) => role.product_level === needle)?.id ??
    classes.find((role) => role.product_level === "staff")?.id
  );
}

function matchNamedId<T extends { id: string; name: string }>(
  items: T[],
  name: string,
) {
  const needle = name.trim().toLowerCase();
  if (!needle) return "";
  return items.find((item) => item.name.trim().toLowerCase() === needle)?.id ?? "";
}

export function useInviteMutations({
  onInvitesCreated,
}: UseInviteMutationsProps = {}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createInviteMutation = useMutation({
    mutationFn: async (payload: InvitePersonCard) => {
      const result = await sendCompanyInvites([
        {
          firstName: payload.firstName,
          lastName: payload.lastName,
          email: payload.email,
          phone: payload.phone,
          roleId: payload.roleId,
          permissionOverrides: payload.permissionOverrides,
          departmentId: payload.departmentId,
        },
      ]);
      const first = result.results[0];
      if (!first?.ok) {
        throw new Error(first?.message ?? "Unable to create invite.");
      }
      return {
        inviteId: first.inviteId,
        inviteToken: first.inviteToken,
        inviteLink: first.inviteLink,
        onboardingTriggered: true,
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: COMPANY_INVITES_QUERY_KEY });
      onInvitesCreated?.();
      toast({
        title: "Invite ready",
        description: "The class is painted. Share the invite if email is off.",
      });
    },
    onError: (error: unknown) => {
      toast({
        title: "Unable to create invite",
        description:
          error instanceof Error
            ? error.message
            : "Please verify the details and try again.",
        variant: "destructive",
      });
    },
  });

  const bulkInviteMutation = useMutation({
    mutationFn: async ({
      rows,
      classes,
      locations,
      departments,
    }: {
      rows: BulkInviteRow[];
      classes: CompanyRole[];
      locations: OrganizationLocation[];
      departments: Department[];
    }) => {
      const results: BulkInviteResult[] = [];
      const payloads = rows.map((row) => ({
        firstName: row.firstName,
        lastName: row.lastName,
        email: row.email,
        phone: row.phone,
        roleId: matchClassId(classes, row.className) ?? "",
        departmentId: matchNamedId(departments, row.departmentName),
      }));

      const missingClass = payloads.find((row) => !row.roleId);
      if (missingClass) {
        throw new Error("Every row needs a matching class.");
      }

      const sent = await sendCompanyInvites(payloads);
      for (const [index, result] of sent.results.entries()) {
        results.push({
          email: rows[index]?.email || rows[index]?.phone || "unknown",
          status: result.ok ? "success" : "error",
          message: result.message,
          inviteLink: result.inviteLink,
          onboardingTriggered: result.ok,
        });
      }
      return results;
    },
    onSuccess: (results) => {
      queryClient.invalidateQueries({ queryKey: COMPANY_INVITES_QUERY_KEY });
      onInvitesCreated?.();
      const failed = results.filter((result) => result.status === "error").length;
      toast({
        title: "Bulk invites processed",
        description:
          failed > 0
            ? `${results.length - failed} invites ready. ${failed} need a review.`
            : "Invitation links generated. Review any rows with issues below.",
        variant: failed > 0 ? "destructive" : undefined,
      });
    },
    onError: (error: unknown) => {
      toast({
        title: "Bulk invite failed",
        description:
          error instanceof Error ? error.message : "Check the CSV format and try again.",
        variant: "destructive",
      });
    },
  });

  return {
    createInviteMutation,
    bulkInviteMutation,
  };
}
