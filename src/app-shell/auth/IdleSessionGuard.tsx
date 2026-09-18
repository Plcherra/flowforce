"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useCompany } from "@/hooks/useCompany";
import { supabase } from "@/integrations/supabase/client";
import {
  getIdleSessionTimeout,
  parseIdleSessionTimeout,
  setIdleSessionTimeout,
  subscribeIdleSessionTimeout,
} from "@/lib/auth/idleSession";

const ACTIVITY_EVENTS = [
  "pointerdown",
  "keydown",
  "touchstart",
  "scroll",
] as const;

export function IdleSessionGuard() {
  const { user, signOut } = useAuth();
  const { company } = useCompany();
  const timeoutMinutes = useSyncExternalStore(
    subscribeIdleSessionTimeout,
    getIdleSessionTimeout,
    getIdleSessionTimeout,
  );

  useEffect(() => {
    if (!company?.id) return;

    let cancelled = false;
    void supabase
      .from("system_settings")
      .select("security")
      .eq("company_id", company.id)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        const security = data?.security as { sessionTimeout?: unknown } | null;
        setIdleSessionTimeout(
          parseIdleSessionTimeout(security?.sessionTimeout),
        );
      });

    return () => {
      cancelled = true;
    };
  }, [company?.id]);

  useEffect(() => {
    if (!user || !timeoutMinutes || timeoutMinutes <= 0) {
      return undefined;
    }

    const timeoutMs = timeoutMinutes * 60 * 1000;
    let timer = 0;

    const arm = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        void signOut();
      }, timeoutMs);
    };

    arm();
    ACTIVITY_EVENTS.forEach((eventName) => {
      window.addEventListener(eventName, arm, { passive: true });
    });

    return () => {
      window.clearTimeout(timer);
      ACTIVITY_EVENTS.forEach((eventName) => {
        window.removeEventListener(eventName, arm);
      });
    };
  }, [user, timeoutMinutes, signOut]);

  return null;
}
