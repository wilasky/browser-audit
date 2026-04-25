import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import cron from 'node-cron';

import { healthRoutes } from './routes/health.js';
import { baselineRoutes } from './routes/baseline.js';
import { lookupRoutes } from './routes/lookup.js';

import { syncUrlhaus } from './workers/sync-urlhaus.js';
import { syncMalwareBazaar } from './workers/sync-malwarebazaar.js';
import { syncDisconnectMe } from './workers/sync-disconnectme.js';
import { syncPhishTank } from './workers/sync-phishtank.js';

const PORT = parseInt(process.env.PORT ?? '3000', 10);
const HOST = process.env.HOST ?? '127.0.0.1';
const RATE_MAX = parseInt(process.env.RATE_LIMIT_MAX ?? '60', 10);

const fastify = Fastify({
  logger: { level: process.env.LOG_LEVEL ?? 'info' },
});

await fastify.register(cors, { origin: false }); // extension talks directly, no CORS needed
await fastify.register(rateLimit, { max: RATE_MAX, timeWindow: '1 minute' });

await fastify.register(healthRoutes);
await fastify.register(baselineRoutes);
await fastify.register(lookupRoutes);

// --- Cron schedules ---
const log = fastify.log;

// URLhaus: every hour
cron.schedule('0 * * * *', () => syncUrlhaus(log).catch((e) => log.error(e.message)));

// MalwareBazaar: every hour, offset by 15min
cron.schedule('15 * * * *', () => syncMalwareBazaar(log).catch((e) => log.error(e.message)));

// PhishTank/OpenPhish: every 6 hours
cron.schedule('0 */6 * * *', () => syncPhishTank(log).catch((e) => log.error(e.message)));

// DisconnectMe: daily at 03:00
cron.schedule('0 3 * * *', () => syncDisconnectMe(log).catch((e) => log.error(e.message)));

// --- Boot ---
try {
  await fastify.listen({ port: PORT, host: HOST });
  log.info(`Browser Audit backend running at http://${HOST}:${PORT}`);

  // Initial sync on first start (non-blocking)
  setTimeout(async () => {
    log.info('Running initial sync…');
    await Promise.allSettled([
      syncDisconnectMe(log),
      syncPhishTank(log),
    ]);
    // URLhaus and MalwareBazaar are large — sync separately after a short delay
    setTimeout(() => {
      Promise.allSettled([syncUrlhaus(log), syncMalwareBazaar(log)])
        .then(() => log.info('Initial sync complete'));
    }, 5000);
  }, 2000);
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}
