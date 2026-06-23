import { Router, Request, Response } from 'express';
import { pingMongo } from '../config/database.js';
import { pingRedis } from '../config/redis.js';

const router = Router();

router.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

router.get('/health/ready', async (_req: Request, res: Response) => {
  const [mongoOk, redisOk] = await Promise.all([pingMongo(), pingRedis()]);

  if (!mongoOk || !redisOk) {
    res.status(503).json({
      status: 'not_ready',
      checks: {
        mongo: mongoOk ? 'ok' : 'fail',
        redis: redisOk ? 'ok' : 'fail',
      },
    });
    return;
  }

  res.json({
    status: 'ready',
    checks: { mongo: 'ok', redis: 'ok' },
  });
});

export default router;
