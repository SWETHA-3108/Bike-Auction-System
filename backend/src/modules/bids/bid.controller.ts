import { Request, Response, NextFunction } from 'express';
import * as bidService from './bid.service.js';
import { paramId } from '../../utils/params.js';

export async function placeBid(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await bidService.placeBid({
      auctionId: paramId(req.params.id),
      userId: req.user!.id,
      amount: req.body.amount,
      clientIp: req.ip,
      userAgent: req.headers['user-agent'],
      idempotencyKey: req.headers['idempotency-key'] as string | undefined,
    });
    res.status(201).json({ data: result });
  } catch (err) {
    next(err);
  }
}
