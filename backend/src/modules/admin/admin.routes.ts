import { Router } from 'express';
import * as adminController from './admin.controller.js';
import { authenticate, authorize } from '../../middleware/authenticate.js';
import { validateBody } from '../../middleware/validate.js';
import {
  createMotorcycleSchema,
  createAuctionSchema,
  updateAuctionSchema,
  updateUserSchema,
} from '../validation.js';

const router = Router();

router.use(authenticate, authorize('admin'));

router.get('/dashboard', adminController.dashboard);
router.get('/auctions', adminController.listAuctions);
router.post('/motorcycles', validateBody(createMotorcycleSchema), adminController.createMotorcycle);
router.post('/auctions', validateBody(createAuctionSchema), adminController.createAuction);
router.patch('/auctions/:id', validateBody(updateAuctionSchema), adminController.updateAuction);
router.post('/auctions/:id/force-end', adminController.forceEnd);
router.post('/auctions/:id/cancel', adminController.cancel);
router.get('/users', adminController.listUsers);
router.patch('/users/:id', validateBody(updateUserSchema), adminController.updateUser);
router.get('/audit-logs', adminController.auditLogs);

export default router;
