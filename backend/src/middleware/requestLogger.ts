import morgan from 'morgan';
import { Request, Response } from 'express';
import { logger } from '../utils/logger.js';

morgan.token('request-id', (req) => (req as Request).requestId ?? '-');

export const requestLogger = morgan(
  (tokens, req: Request, res: Response) => {
    const log = {
      level: 'info',
      message: 'HTTP request',
      requestId: req.requestId,
      method: tokens.method(req, res),
      url: tokens.url(req, res),
      status: Number(tokens.status(req, res)),
      durationMs: Number(tokens['response-time'](req, res)),
      userId: req.user?.id,
    };
    return JSON.stringify(log);
  },
  {
    stream: {
      write: (message: string) => {
        try {
          const parsed = JSON.parse(message.trim());
          logger.info(parsed.message, parsed);
        } catch {
          logger.info(message.trim());
        }
      },
    },
  }
);
