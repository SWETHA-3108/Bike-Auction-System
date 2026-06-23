import { Router } from 'express';
import * as notificationController from './notification.controller.js';
import { authenticate } from '../../middleware/authenticate.js';
import { validateQuery } from '../../middleware/validate.js';
import { paginationQuerySchema } from '../validation.js';

const router = Router();

router.use(authenticate);
router.get('/unread-count', notificationController.unreadCount);
router.patch('/read-all', notificationController.markAllRead);
router.get('/', validateQuery(paginationQuerySchema), notificationController.list);
router.patch('/:id/read', notificationController.markRead);

export default router;
