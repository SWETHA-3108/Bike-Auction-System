import { Router } from 'express';
import * as auctionController from './auction.controller.js';
import { validateQuery } from '../../middleware/validate.js';
import { auctionListQuerySchema } from '../validation.js';
import { optionalAuthenticate } from '../../middleware/authenticate.js';
import bidRoutes from '../bids/bid.routes.js';

const router = Router();

router.get('/', validateQuery(auctionListQuerySchema), optionalAuthenticate, auctionController.list);
router.get('/live', auctionController.listLive);
router.get('/:id', optionalAuthenticate, auctionController.getById);
router.get('/:id/bids', auctionController.getBids);
router.use(bidRoutes);

export default router;
