import { Router } from 'express';
import * as bidController from './bid.controller.js';
import { authenticate } from '../../middleware/authenticate.js';
import { bidRateLimiter } from '../../middleware/rateLimiter.js';
import { validateBody } from '../../middleware/validate.js';
import { placeBidSchema } from '../validation.js';

const router = Router();

router.post(
  '/:id/bids',
  authenticate,
  bidRateLimiter,
  validateBody(placeBidSchema),
  bidController.placeBid
);

export default router;
