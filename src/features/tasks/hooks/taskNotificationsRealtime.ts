import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import {
  subscribeSharedPostgresChannel,
  type PostgresChangeEventConfig,
} from "@/lib/realtime/sharedPostgresChannel";

type NotificationPayloadHandler = (
  payload: RealtimePostgresChangesPayload<Record<string, unknown>>,
) => void;

interface UserSubscription {
  refCount: number;
  handlers: Set<NotificationPayloadHandler>;
  unsubscribe: (() => void) | null;
}

const subscriptionsByUser = new Map<string, UserSubscription>();

const TASK_NOTIFICATION_EVENTS = (userId: string): PostgresChangeEventConfig[] => [
  {
    event: "INSERT",
    table: "task_notifications",
    filter: `user_id=eq.${userId}`,
  },
  {
    event: "UPDATE",
    table: "task_notifications",
    filter: `user_id=eq.${userId}`,
  },
];

function ensureUserSubscription(userId: string) {
  let subscription = subscriptionsByUser.get(userId);

  if (!subscription) {
    subscription = {
      refCount: 0,
      handlers: new Set(),
      unsubscribe: null,
    };
    subscriptionsByUser.set(userId, subscription);
  }

  if (!subscription.unsubscribe) {
    const events = TASK_NOTIFICATION_EVENTS(userId);
    subscription.unsubscribe = subscribeSharedPostgresChannel(
      `task-notifications-${userId}`,
      events,
      JSON.stringify(events),
      (payload) => {
        subscription?.handlers.forEach((handler) => handler(payload));
      },
    );
  }

  return subscription;
}

export function subscribeTaskNotificationsRealtime(
  userId: string | null | undefined,
  handler: NotificationPayloadHandler,
): () => void {
  if (!userId) {
    return () => undefined;
  }

  const subscription = ensureUserSubscription(userId);
  subscription.refCount += 1;
  subscription.handlers.add(handler);

  return () => {
    const current = subscriptionsByUser.get(userId);
    if (!current) {
      return;
    }

    current.handlers.delete(handler);
    current.refCount -= 1;

    if (current.refCount <= 0) {
      current.unsubscribe?.();
      subscriptionsByUser.delete(userId);
    }
  };
}
