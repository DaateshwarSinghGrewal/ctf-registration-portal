import { ApiError } from "../../core/http/ApiError.js";
import { logger } from "../../core/logger.js";
import {
  countUnread,
  insertNotification,
  insertNotifications,
  listNotifications,
  markAllRead,
  markRead,
} from "./notification.repository.js";
import {
  toNotification,
  type Notification,
  type NotificationChannel,
  type NotificationInput,
} from "./notification.types.js";

/**
 * Notification service.
 *
 * Persist first, then fan out to every registered channel. That order is the
 * point: a socket emit alone is lost if the recipient is offline, and the whole
 * reason a leader needs to know about a join request is that they might not be
 * looking at the page.
 *
 * The service knows nothing about Socket.IO or push providers — channels are
 * injected at bootstrap (see src/server.ts). That inversion is what lets push
 * notifications be added later without touching a single call site.
 */

const channels: NotificationChannel[] = [];

export function registerChannel(channel: NotificationChannel): void {
  channels.push(channel);
  logger.info(`Notification channel registered: ${channel.name}`);
}

/** Test/shutdown helper — keeps repeated bootstraps from stacking channels. */
export function clearChannels(): void {
  channels.length = 0;
}

/**
 * Delivery is fire-and-forget by design: a channel is best-effort, and the
 * notification is already durable in Postgres. Awaiting a slow push provider
 * would add its latency to the HTTP request that triggered it.
 */
function dispatch(notifications: Notification[]): void {
  for (const notification of notifications) {
    for (const channel of channels) {
      channel.deliver(notification).catch((error: unknown) => {
        logger.warn(
          `Channel ${channel.name} failed for notification ${notification.id}`,
          error
        );
      });
    }
  }
}

export async function notify(input: NotificationInput): Promise<Notification> {
  const notification = toNotification(await insertNotification(input));
  dispatch([notification]);
  return notification;
}

/** Fan-out to several users — a team-wide announcement. */
export async function notifyMany(inputs: NotificationInput[]): Promise<Notification[]> {
  if (inputs.length === 0) return [];
  const notifications = (await insertNotifications(inputs)).map(toNotification);
  dispatch(notifications);
  return notifications;
}

export async function getInbox(
  userId: string,
  options: { limit: number; offset: number; unreadOnly: boolean }
): Promise<{ notifications: Notification[]; unreadCount: number }> {
  const [rows, unreadCount] = await Promise.all([
    listNotifications(userId, options.limit, options.offset, options.unreadOnly),
    countUnread(userId),
  ]);

  return { notifications: rows.map(toNotification), unreadCount };
}

export async function readNotification(userId: string, notificationId: string): Promise<void> {
  if (!(await markRead(userId, notificationId))) {
    // Covers "does not exist", "belongs to someone else" and "already read"
    // with one message — distinguishing them would confirm the existence of
    // another user's notification id.
    throw ApiError.notFound("Notification not found or already read");
  }
}

export function readAllNotifications(userId: string): Promise<number> {
  return markAllRead(userId);
}
