import { Router, Request, Response } from 'express';
import { register } from '../utils/metrics.js';

const router = Router();

router.get('/metrics', async (_req: Request, res: Response) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

export default router;
