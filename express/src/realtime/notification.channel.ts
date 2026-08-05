import { countUnread } from "../modules/notification/notification.repository.js";
import type {
  Notification,
  NotificationChannel,
} from "../modules/notification/notification.types.js";
import { emitToUser } from "./socket.emitter.js";
import { SocketEvent } from "./socket.events.js";

/**
 * Socket delivery for notifications.
 *
 * The adapter between the notification service and the realtime layer, and the
 * reason neither imports the other: the service publishes to a
 * `NotificationChannel`, this implements that interface using sockets, and
 * server.ts wires the two together. A push-notification channel slots in beside
 * this one with no change to any caller.
 *
 * The unread count is sent alongside so the client can update its badge without
 * a follow-up request per notification.
 */
export class SocketNotificationChannel implements NotificationChannel {
  readonly name = "socket";

  async deliver(notification: Notification): Promise<void> {
    const unreadCount = await countUnread(notification.userId);
    emitToUser(notification.userId, SocketEvent.NOTIFICATION_NEW, {
      notification,
      unreadCount,
    });
  }
}
