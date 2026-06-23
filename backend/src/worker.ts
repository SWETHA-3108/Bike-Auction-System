import { startWorkers } from './jobs/workers.js';
import { logger } from './utils/logger.js';

startWorkers().catch((err) => {
  logger.error('Failed to start workers', { error: err.message });
  process.exit(1);
});
