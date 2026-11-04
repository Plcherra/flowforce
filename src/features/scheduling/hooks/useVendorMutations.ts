/**
 * Hook for vendor event mutations
 */

import { useTranslation } from "react-i18next";
import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type {
  VendorEventUpsertInput,
  VendorEventWithMetadata,
} from "@/features/scheduling/hooks/useSchedulingConsolidated";

interface UseVendorMutationsProps {
  companyId: string | null;
  isUsingFallbackData: boolean;
  showReadOnlyNotice: () => void;
  refetchAll: () => Promise<void>;
  upsertVendorEvent: (
    payload: VendorEventUpsertInput,
  ) => Promise<VendorEventWithMetadata | null>;
  ensureCompanyContext: () => void;
}

export function useVendorMutations({
  companyId,
  isUsingFallbackData,
  showReadOnlyNotice,
  refetchAll,
  upsertVendorEvent,
  ensureCompanyContext,
}: UseVendorMutationsProps) {
  const { t } = useTranslation();
  const { toast } = useToast();

  const createVendorEvent = useCallback(
    async (payload: VendorEventUpsertInput) => {
      if (isUsingFallbackData) {
        showReadOnlyNotice();
        return null;
      }

      try {
        ensureCompanyContext();
        const event = await upsertVendorEvent({
          ...payload,
          company_id: companyId!,
        });
        if (event) {
          toast({
            title: t("literals.vendorVisitScheduled"),
            description: t("literals.vendorEventHasBeenCreated"),
          });
        }
        return event;
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : t("literals.failedToScheduleVendorEvent");
        toast({
          title: t("literals.vendorSchedulingFailed"),
          description: message,
          variant: "destructive",
        });
        return null;
      }
    },
    [
      companyId,
      ensureCompanyContext,
      isUsingFallbackData,
      showReadOnlyNotice,
      toast,
      upsertVendorEvent,
    ],
  );

  const deleteVendorEvent = useCallback(
    async (id: string) => {
      if (isUsingFallbackData) {
        showReadOnlyNotice();
        return false;
      }

      try {
        ensureCompanyContext();
        const { error: deleteError } = await supabase
          .from("vendor_visits")
          .delete()
          .eq("id", id)
          .eq("company_id", companyId!);
        if (deleteError) throw deleteError;
        await refetchAll();
        toast({
          title: t("literals.vendorVisitRemoved"),
          description: t("literals.vendorEventHasBeenDeleted"),
        });
        return true;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : t("literals.failedToDeleteVendorEvent");
        toast({
          title: t("literals.vendorRemovalFailed"),
          description: message,
          variant: "destructive",
        });
        return false;
      }
    },
    [
      ensureCompanyContext,
      isUsingFallbackData,
      refetchAll,
      showReadOnlyNotice,
      toast,
      companyId,
    ],
  );

  const upsertVendorEventGuarded = useCallback(
    async (payload: VendorEventUpsertInput) => {
      if (isUsingFallbackData) {
        showReadOnlyNotice();
        return null;
      }
      return upsertVendorEvent(payload);
    },
    [isUsingFallbackData, showReadOnlyNotice, upsertVendorEvent],
  );

  return {
    createVendorEvent,
    deleteVendorEvent,
    upsertVendorEvent: upsertVendorEventGuarded,
  };
}
