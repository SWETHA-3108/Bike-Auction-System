import { Notification } from '../../models/Notification.js';
import { createError } from '../../middleware/errorHandler.js';

export async function listNotifications(
  userId: string,
  page: number,
  limit: number,
  unread?: boolean
) {
  const filter: Record<string, unknown> = { userId };
  if (unread) filter.status = { $ne: 'read' };

  const skip = (page - 1) * limit;
  const [notifications, total] = await Promise.all([
    Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Notification.countDocuments(filter),
  ]);

  return {
    data: notifications.map((n) => ({
      id: String(n._id),
      type: n.type,
      title: n.title,
      body: n.body,
      data: n.data,
      status: n.status,
      createdAt: n.createdAt,
      readAt: n.readAt,
    })),
    meta: { page, limit, total, hasMore: skip + notifications.length < total },
  };
}

export async function markNotificationRead(userId: string, notificationId: string) {
  const notification = await Notification.findOne({ _id: notificationId, userId });
  if (!notification) throw createError(404, 'NOT_FOUND', 'Notification not found');
  notification.status = 'read';
  notification.readAt = new Date();
  await notification.save();
  return { success: true };
}

export async function markAllNotificationsRead(userId: string) {
  await Notification.updateMany(
    { userId, status: { $ne: 'read' } },
    { status: 'read', readAt: new Date() }
  );
  return { success: true };
}

export async function getUnreadCount(userId: string): Promise<number> {
  return Notification.countDocuments({ userId, status: { $ne: 'read' } });
}
