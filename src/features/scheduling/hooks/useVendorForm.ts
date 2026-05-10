/**
 * Hook for managing vendor form state
 */

import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import type {
  PendingVendorEvent,
  VendorFormState,
} from "@/features/scheduling/components/drag-drop/types";

interface UseVendorFormProps {
  pendingVendorEvent: PendingVendorEvent | null;
  locations: Array<{ id: string }>;
  candidateVendorShifts: Array<{ id: string }>;
  vendorModalOpen: boolean;
}

export function useVendorForm({
  pendingVendorEvent,
  locations,
  candidateVendorShifts,
  vendorModalOpen,
}: UseVendorFormProps) {
  const [vendorForm, setVendorForm] = useState<VendorFormState>({
    locationId: "",
    notes: "",
    shiftId: "",
    startTime: "",
    endTime: "",
  });

  useEffect(() => {
    if (!pendingVendorEvent) {
      setVendorForm((prev) => ({
        locationId: prev.locationId || locations[0]?.id || "",
        notes: "",
        shiftId: "",
        startTime: "",
        endTime: "",
      }));
      return;
    }

    const startTime = format(pendingVendorEvent.start, "HH:mm");
    const endTime = format(pendingVendorEvent.end, "HH:mm");
    const preferredShift = candidateVendorShifts[0]?.id ?? "";
    setVendorForm({
      locationId: locations[0]?.id || "",
      notes: "",
      shiftId: preferredShift,
      startTime,
      endTime,
    });
  }, [candidateVendorShifts, locations, pendingVendorEvent]);

  useEffect(() => {
    if (!vendorModalOpen) {
      setVendorForm({
        locationId: locations[0]?.id || "",
        notes: "",
        shiftId: "",
        startTime: "",
        endTime: "",
      });
    }
  }, [locations, vendorModalOpen]);

  return {
    vendorForm,
    setVendorForm,
  };
}
