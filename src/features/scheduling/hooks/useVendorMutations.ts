/**
 * Hook for vendor event mutations
 */

import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type {
  VendorEventUpsertInput,
  VendorEventWithMetadata,
} from "@/hooks/scheduling/useSchedulingConsolidated";

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
            title: "Vendor visit scheduled",
            description: "Vendor event has been created.",
          });
        }
        return event;
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Failed to schedule vendor event";
        toast({
          title: "Vendor scheduling failed",
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
          title: "Vendor visit removed",
          description: "Vendor event has been deleted.",
        });
        return true;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to delete vendor event";
        toast({
          title: "Vendor removal failed",
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
