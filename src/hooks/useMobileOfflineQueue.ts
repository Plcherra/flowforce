"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  getMobileOfflineQueueSummary,
  pruneSyncedMobileOfflineMutations,
  readMobileOfflineQueue,
  retryFailedMobileOfflineMutations,
  type MobileOfflineQueueItem,
} from "@/services/mobile/mobileOfflineQueue";

export function useMobileOfflineQueue() {
  const [queue, setQueue] = useState<MobileOfflineQueueItem[]>([]);
  const [online, setOnline] = useState(true);

  const refresh = useCallback(() => {
    setQueue(readMobileOfflineQueue());
    setOnline(typeof navigator === "undefined" ? true : navigator.onLine);
  }, []);

  useEffect(() => {
    refresh();

    window.addEventListener("online", refresh);
    window.addEventListener("offline", refresh);
    window.addEventListener("storage", refresh);
    window.addEventListener("flowforce-mobile-offline-queue", refresh);

    return () => {
      window.removeEventListener("online", refresh);
      window.removeEventListener("offline", refresh);
      window.removeEventListener("storage", refresh);
      window.removeEventListener("flowforce-mobile-offline-queue", refresh);
    };
  }, [refresh]);

  const summary = useMemo(() => getMobileOfflineQueueSummary(queue), [queue]);

  const retryFailed = useCallback(() => {
    retryFailedMobileOfflineMutations();
    refresh();
  }, [refresh]);

  const clearSynced = useCallback(() => {
    pruneSyncedMobileOfflineMutations();
    refresh();
  }, [refresh]);

  return {
    online,
    queue,
    summary,
    refresh,
    retryFailed,
    clearSynced,
  };
}
