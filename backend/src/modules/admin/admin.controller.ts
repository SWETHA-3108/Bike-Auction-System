import { Request, Response, NextFunction } from 'express';
import * as adminService from './admin.service.js';
import { paramId } from '../../utils/params.js';

export async function dashboard(_req: Request, res: Response, next: NextFunction) {
  try {
    const stats = await adminService.getDashboardStats();
    res.json({ data: stats });
  } catch (err) {
    next(err);
  }
}

export async function createMotorcycle(req: Request, res: Response, next: NextFunction) {
  try {
    const motorcycle = await adminService.createMotorcycle(req.body, req.user!.id);
    res.status(201).json({ data: motorcycle });
  } catch (err) {
    next(err);
  }
}

export async function createAuction(req: Request, res: Response, next: NextFunction) {
  try {
    const auction = await adminService.createAdminAuction(
      req.body,
      req.user!.id,
      req.user!.id,
      req.ip
    );
    res.status(201).json({ data: auction });
  } catch (err) {
    next(err);
  }
}

export async function updateAuction(req: Request, res: Response, next: NextFunction) {
  try {
    const auction = await adminService.adminUpdateAuction(
      paramId(req.params.id),
      req.body,
      req.user!.id,
      req.ip
    );
    res.json({ data: auction });
  } catch (err) {
    next(err);
  }
}

export async function forceEnd(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await adminService.forceEndAuction(
      paramId(req.params.id),
      req.user!.id,
      req.ip
    );
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
}

export async function cancel(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await adminService.cancelAuction(paramId(req.params.id), req.user!.id, req.ip);
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
}

export async function listUsers(req: Request, res: Response, next: NextFunction) {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const result = await adminService.listUsers(page, limit);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function updateUser(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await adminService.updateUser(
      paramId(req.params.id),
      req.body,
      req.user!.id,
      req.ip
    );
    res.json({ data: user });
  } catch (err) {
    next(err);
  }
}

export async function auditLogs(req: Request, res: Response, next: NextFunction) {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const result = await adminService.listAuditLogs(page, limit);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function listAuctions(req: Request, res: Response, next: NextFunction) {
  try {
    const { listAuctions: listAll } = await import('../auctions/auction.service.js');
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const status = req.query.status as string | undefined;
    const result = await listAll({ page, limit, status });
    res.json(result);
  } catch (err) {
    next(err);
  }
}
