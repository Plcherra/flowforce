import { useEffect } from "react";

const DEFAULT_INTERVAL_MS = 4000;

export function useRefreshWhileVisible(
  enabled: boolean,
  refresh: () => void,
  intervalMs = DEFAULT_INTERVAL_MS,
) {
  useEffect(() => {
    if (!enabled) return;

    const tick = () => {
      if (document.visibilityState !== "visible") return;
      refresh();
    };
    const timer = window.setInterval(tick, intervalMs);
    document.addEventListener("visibilitychange", tick);
    window.addEventListener("focus", tick);

    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
      window.removeEventListener("focus", tick);
    };
  }, [enabled, intervalMs, refresh]);
}
