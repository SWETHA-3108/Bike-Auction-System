import { Request, Response, NextFunction } from 'express';
import * as notificationService from './notification.service.js';
import { paramId } from '../../utils/params.js';

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const unread = String(req.query.unread) === 'true';
    const result = await notificationService.listNotifications(
      req.user!.id,
      page,
      limit,
      unread || undefined
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function markRead(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await notificationService.markNotificationRead(
      req.user!.id,
      paramId(req.params.id)
    );
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
}

export async function markAllRead(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await notificationService.markAllNotificationsRead(req.user!.id);
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
}

export async function unreadCount(req: Request, res: Response, next: NextFunction) {
  try {
    const count = await notificationService.getUnreadCount(req.user!.id);
    res.json({ data: { count } });
  } catch (err) {
    next(err);
  }
}
