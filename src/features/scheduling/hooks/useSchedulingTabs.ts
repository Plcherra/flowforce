/**
 * Hook for managing scheduling tab state and URL synchronization
 */

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "@/lib/router-adapter";
import { SCHEDULING_TABS } from "../types/tabs";

interface UseSchedulingTabsProps {
  locationFilter?: string;
}

export function useSchedulingTabs({ locationFilter }: UseSchedulingTabsProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(() => {
    const requestedTab = searchParams.get("tab");
    return requestedTab &&
      SCHEDULING_TABS.some((tab) => tab.id === requestedTab)
      ? requestedTab
      : "schedule";
  });
  const [availabilityView, setAvailabilityView] = useState<"personal" | "team">(
    () => {
      const requestedView = searchParams.get("availability");
      return requestedView === "team" ? "team" : "personal";
    },
  );

  useEffect(() => {
    const requestedTab = searchParams.get("tab");
    if (
      requestedTab &&
      SCHEDULING_TABS.some((tab) => tab.id === requestedTab)
    ) {
      if (requestedTab !== activeTab) {
        setActiveTab(requestedTab);
      }
    } else if (!requestedTab && activeTab !== "schedule") {
      setActiveTab("schedule");
    }
  }, [activeTab, searchParams]);

  useEffect(() => {
    const requestedView = searchParams.get("availability");
    setAvailabilityView(requestedView === "team" ? "team" : "personal");
  }, [searchParams]);

  const handleTabChange = useCallback(
    (value: string) => {
      if (value !== activeTab) {
        setActiveTab(value);
      }
      const nextParams = new URLSearchParams(searchParams.toString());
      if (value === "schedule") {
        nextParams.delete("tab");
      } else {
        nextParams.set("tab", value);
      }

      if (value === "availability") {
        if (availabilityView === "team") {
          nextParams.set("availability", "team");
        } else {
          nextParams.delete("availability");
        }
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
    [
      activeTab,
      availabilityView,
      locationFilter,
      searchParams,
      setSearchParams,
    ],
  );

  const handleAvailabilityViewChange = useCallback(
    (value: string) => {
      const normalizedValue = value === "team" ? "team" : "personal";
      setAvailabilityView(normalizedValue);

      const nextParams = new URLSearchParams(searchParams.toString());
      nextParams.set("tab", "availability");
      if (normalizedValue === "team") {
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
    [locationFilter, searchParams, setSearchParams],
  );

  return {
    activeTab,
    availabilityView,
    handleTabChange,
    handleAvailabilityViewChange,
  };
}
