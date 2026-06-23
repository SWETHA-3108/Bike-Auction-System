import { Request, Response, NextFunction } from 'express';
import { httpRequestDuration } from '../utils/metrics.js';

export function metricsMiddleware(req: Request, res: Response, next: NextFunction): void {
  const start = process.hrtime.bigint();

  res.on('finish', () => {
    const durationNs = Number(process.hrtime.bigint() - start);
    const route = req.route?.path ? `${req.baseUrl}${req.route.path}` : req.path;
    httpRequestDuration.observe(
      {
        method: req.method,
        route,
        status: String(res.statusCode),
      },
      durationNs / 1e9
    );
  });

  next();
}
