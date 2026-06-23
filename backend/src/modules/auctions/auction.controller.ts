import { Request, Response, NextFunction } from 'express';
import * as auctionService from './auction.service.js';
import { paramId } from '../../utils/params.js';

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const query = req.query as unknown as {
      status?: string;
      make?: string;
      page: number;
      limit: number;
    };
    const result = await auctionService.listAuctions(query);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function listLive(_req: Request, res: Response, next: NextFunction) {
  try {
    const result = await auctionService.listLiveAuctions();
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction) {
  try {
    const auctionId = paramId(req.params.id);
    const auction = await auctionService.getAuctionById(auctionId);

    if (req.user) {
      const { isWatched } = await import('../watchlist/watchlist.service.js');
      const watched = await isWatched(req.user.id, auctionId);
      res.json({ data: { ...auction, isWatched: watched } });
      return;
    }

    res.json({ data: auction });
  } catch (err) {
    next(err);
  }
}

export async function getBids(req: Request, res: Response, next: NextFunction) {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const result = await auctionService.getAuctionBids(paramId(req.params.id), page, limit);
    res.json(result);
  } catch (err) {
    next(err);
  }
}
