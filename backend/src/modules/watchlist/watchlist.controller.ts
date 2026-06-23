import { Request, Response, NextFunction } from 'express';
import * as watchlistService from './watchlist.service.js';
import { paramId } from '../../utils/params.js';

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const result = await watchlistService.getUserWatchlist(req.user!.id, page, limit);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function add(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await watchlistService.addToWatchlist(
      req.user!.id,
      paramId(req.params.auctionId)
    );
    res.status(201).json({ data: result });
  } catch (err) {
    next(err);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await watchlistService.removeFromWatchlist(
      req.user!.id,
      paramId(req.params.auctionId)
    );
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
}
