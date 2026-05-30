"use client";

import { useEffect } from "react";

import { useNavigate } from "@/lib/router-adapter";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/utils/logger";
import {
  getDefaultMobilePushPreferences,
  getMobilePushRouteFromPayload,
} from "@/services/mobile/mobilePushNotifications";

type UseMobilePushNotificationsInput = {
  userId: string | null | undefined;
  companyId: string | null | undefined;
};

export function useMobilePushNotifications({
  userId,
  companyId,
}: UseMobilePushNotificationsInput) {
  const navigate = useNavigate();

  useEffect(() => {
    if (!userId || !companyId) return;

    let mounted = true;

    const setupPushNotifications = async () => {
      try {
        const [{ Capacitor }, { PushNotifications }] = await Promise.all([
          import("@capacitor/core"),
          import("@capacitor/push-notifications"),
        ]);

        if (!mounted || !Capacitor.isNativePlatform()) {
          return;
        }

        await PushNotifications.addListener("registration", async (token) => {
          const { error } = await supabase.rpc("register_mobile_push_device", {
            p_app_version: null,
            p_company_id: companyId,
            p_device_id: null,
            p_device_token: token.value,
            p_metadata: {
              source: "capacitor",
              runtime: "native",
            },
            p_platform: Capacitor.getPlatform(),
            p_preferences: getDefaultMobilePushPreferences(),
          });

          if (error) {
            logger.warn("Mobile push token registration failed", {
              error,
              tags: ["warning"],
            });
          }
        });

        await PushNotifications.addListener("registrationError", (error) => {
          logger.warn("Mobile push registration error", {
            error,
            tags: ["warning"],
          });
        });

        await PushNotifications.addListener(
          "pushNotificationActionPerformed",
          (event) => {
            const route = getMobilePushRouteFromPayload(
              event.notification.data,
            );
            navigate(route);
          },
        );

        const permissions = await PushNotifications.checkPermissions();
        const receive =
          permissions.receive === "prompt"
            ? (await PushNotifications.requestPermissions()).receive
            : permissions.receive;

        if (receive === "granted") {
          await PushNotifications.register();
        }
      } catch (error) {
        logger.warn("Mobile push setup skipped", {
          error,
          tags: ["warning"],
        });
      }
    };

    setupPushNotifications();

    return () => {
      mounted = false;
      void import("@capacitor/push-notifications")
        .then(({ PushNotifications }) => PushNotifications.removeAllListeners())
        .catch(() => undefined);
    };
  }, [companyId, navigate, userId]);
}
