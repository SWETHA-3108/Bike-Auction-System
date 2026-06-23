import { Router, Request, Response } from 'express';
import authRoutes from '../../modules/auth/auth.routes.js';
import auctionRoutes from '../../modules/auctions/auction.routes.js';
import adminRoutes from '../../modules/admin/admin.routes.js';
import watchlistRoutes from '../../modules/watchlist/watchlist.routes.js';
import notificationRoutes from '../../modules/notifications/notification.routes.js';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'Bike Auction Platform API',
    version: '1.0.0',
    endpoints: {
      auth: '/v1/auth',
      auctions: '/v1/auctions',
      watchlist: '/v1/watchlist',
      notifications: '/v1/notifications',
      admin: '/v1/admin',
      health: '/health',
    },
  });
});

router.use('/auth', authRoutes);
router.use('/auctions', auctionRoutes);
router.use('/watchlist', watchlistRoutes);
router.use('/notifications', notificationRoutes);
router.use('/admin', adminRoutes);

export default router;
