/**
 * Hook for invite mutations
 */

import { useTranslation } from "react-i18next";
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
import { inviteErrorText } from "../utils/inviteLocation";

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
  const { t } = useTranslation();
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
          locationId: payload.locationId,
          startDate: payload.startDate,
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
        title: t("literals.inviteReady"),
        description: t("literals.theClassIsPaintedShareTheInviteIf"),
      });
    },
    onError: (error: unknown) => {
      toast({
        title: t("literals.unableToCreateInvite"),
        description: inviteErrorText(
          t,
          error instanceof Error && "code" in error
            ? String((error as { code?: string }).code ?? "")
            : null,
          error instanceof Error
            ? error.message
            : t("literals.pleaseVerifyTheDetailsAndTryAgain"),
        ),
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
        locationId: matchNamedId(locations, row.locationName),
        startDate: row.startDate,
      }));

      const missingClass = payloads.find((row) => !row.roleId);
      if (missingClass) {
        throw new Error("Every row needs a matching class.");
      }
      if (locations.length > 0 && payloads.some((row) => !row.locationId)) {
        throw new Error(t("literals.eachRowNeedsAStoreYouCanAssign"));
      }

      const sent = await sendCompanyInvites(payloads);
      for (const [index, result] of sent.results.entries()) {
        results.push({
          email: rows[index]?.email || rows[index]?.phone || "unknown",
          status: result.ok ? "success" : "error",
          message: result.code
            ? inviteErrorText(t, result.code, result.message ?? "")
            : result.message,
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
        title: t("literals.bulkInvitesProcessed"),
        description:
          failed > 0
            ? t("literals.invitesReadyNeedAReview", { value0: results.length - failed, failed: failed })
            : t("literals.invitationLinksGeneratedReviewAnyRowsWithIssues"),
        variant: failed > 0 ? "destructive" : undefined,
      });
    },
    onError: (error: unknown) => {
      toast({
        title: t("literals.bulkInviteFailed"),
        description:
          error instanceof Error ? error.message : t("literals.checkTheCsvFormatAndTryAgain"),
        variant: "destructive",
      });
    },
  });

  return {
    createInviteMutation,
    bulkInviteMutation,
  };
}
