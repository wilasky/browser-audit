import { getDb } from '../db/db.js';

export async function healthRoutes(fastify) {
  fastify.get('/health', async () => {
    const db = getDb();
    const syncStates = db.prepare('SELECT source, last_sync, record_count, error FROM sync_state').all();
    const counts = {
      domains: db.prepare('SELECT COUNT(*) as n FROM domains').get().n,
      scripts: db.prepare('SELECT COUNT(*) as n FROM scripts').get().n,
      trackers: db.prepare('SELECT COUNT(*) as n FROM trackers').get().n,
    };
    return {
      status: 'ok',
      version: '1.0.0',
      uptime: process.uptime(),
      db: counts,
      syncs: syncStates,
    };
  });
}
