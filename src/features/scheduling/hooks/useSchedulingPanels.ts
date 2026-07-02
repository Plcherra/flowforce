/**
 * Hook for managing scheduling slide-over panels and URL synchronization.
 */

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "@/lib/router-adapter";
import {
  isSchedulingPanelId,
  LEGACY_TAB_TO_PANEL,
  type SchedulingPanelId,
} from "../types/panels";

interface UseSchedulingPanelsProps {
  locationFilter?: string;
}

function resolvePanelFromParams(
  searchParams: URLSearchParams,
): SchedulingPanelId | null {
  const requestedPanel = searchParams.get("panel");
  if (requestedPanel && isSchedulingPanelId(requestedPanel)) {
    return requestedPanel;
  }

  const legacyTab = searchParams.get("tab");
  if (legacyTab && legacyTab in LEGACY_TAB_TO_PANEL) {
    return LEGACY_TAB_TO_PANEL[legacyTab] ?? null;
  }

  return null;
}

export function useSchedulingPanels({ locationFilter }: UseSchedulingPanelsProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activePanel, setActivePanel] = useState<SchedulingPanelId | null>(() =>
    resolvePanelFromParams(searchParams),
  );
  const [availabilityView, setAvailabilityView] = useState<"personal" | "team">(
    () => (searchParams.get("availability") === "team" ? "team" : "personal"),
  );

  useEffect(() => {
    const resolved = resolvePanelFromParams(searchParams);
    if (resolved !== activePanel) {
      setActivePanel(resolved);
    }
  }, [activePanel, searchParams]);

  useEffect(() => {
    const requestedView = searchParams.get("availability");
    setAvailabilityView(requestedView === "team" ? "team" : "personal");
  }, [searchParams]);

  const syncParams = useCallback(
    (
      panel: SchedulingPanelId | null,
      availability: "personal" | "team" = availabilityView,
    ) => {
      const nextParams = new URLSearchParams(searchParams.toString());
      nextParams.delete("tab");

      if (panel) {
        nextParams.set("panel", panel);
      } else {
        nextParams.delete("panel");
      }

      if (panel === "availability" && availability === "team") {
        nextParams.set("availability", "team");
      } else {
        nextParams.delete("availability");
      }

      if (locationFilter) {
        nextParams.set("location", locationFilter);
      } else {
        nextParams.delete("location");
      }

      setSearchParams(nextParams);
    },
    [availabilityView, locationFilter, searchParams, setSearchParams],
  );

  const openPanel = useCallback(
    (panel: SchedulingPanelId, availability?: "personal" | "team") => {
      const nextAvailability = availability ?? availabilityView;
      if (availability) {
        setAvailabilityView(availability);
      }
      setActivePanel(panel);
      syncParams(panel, nextAvailability);
    },
    [availabilityView, syncParams],
  );

  const closePanel = useCallback(() => {
    setActivePanel(null);
    syncParams(null);
  }, [syncParams]);

  const handleAvailabilityViewChange = useCallback(
    (value: string) => {
      const normalizedValue = value === "team" ? "team" : "personal";
      setAvailabilityView(normalizedValue);
      setActivePanel("availability");
      syncParams("availability", normalizedValue);
    },
    [syncParams],
  );

  return {
    activePanel,
    availabilityView,
    openPanel,
    closePanel,
    handleAvailabilityViewChange,
  };
}
