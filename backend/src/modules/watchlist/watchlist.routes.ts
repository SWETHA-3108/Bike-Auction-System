import { Router } from 'express';
import * as watchlistController from './watchlist.controller.js';
import { authenticate } from '../../middleware/authenticate.js';
import { validateQuery } from '../../middleware/validate.js';
import { paginationQuerySchema } from '../validation.js';

const router = Router();

router.use(authenticate);
router.get('/', validateQuery(paginationQuerySchema), watchlistController.list);
router.post('/:auctionId', watchlistController.add);
router.delete('/:auctionId', watchlistController.remove);

export default router;
