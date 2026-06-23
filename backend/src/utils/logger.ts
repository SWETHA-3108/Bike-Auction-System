import winston from 'winston';
import { env } from '../config/env.js';

const { combine, timestamp, json, errors } = winston.format;

export const logger = winston.createLogger({
  level: env.LOG_LEVEL,
  format: combine(errors({ stack: true }), timestamp(), json()),
  defaultMeta: { service: 'bike-auction-api' },
  transports: [new winston.transports.Console()],
});

export function createChildLogger(meta: Record<string, unknown>) {
  return logger.child(meta);
}
