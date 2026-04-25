// DisconnectMe: tracker and advertising domain lists
// Source: https://raw.githubusercontent.com/disconnectme/disconnect-tracking-protection/master/services.json
// Update: daily

import { getDb } from '../db/db.js';
import { recordSyncResult, fetchWithTimeout } from '../lib/sync-helper.js';

const FEED_URL = 'https://raw.githubusercontent.com/disconnectme/disconnect-tracking-protection/master/services.json';
const SOURCE = 'disconnectme';

export async function syncDisconnectMe(log) {
  log?.info('DisconnectMe sync starting');
  const db = getDb();

  try {
    const res = await fetchWithTimeout(FEED_URL, {
      headers: { 'User-Agent': 'BrowserAudit/1.0' },
    }, 30000);

    const json = await res.json();
    const categories = json.categories ?? {};

    const upsert = db.prepare(`
      INSERT INTO trackers (domain, category, owner, updated_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(domain) DO UPDATE SET category = excluded.category, updated_at = excluded.updated_at
    `);

    const insert = db.transaction((entries) => {
      const now = Date.now();
      for (const { domain, category, owner } of entries) {
        upsert.run(domain, category, owner, now);
      }
      return entries.length;
    });

    const entries = [];
    for (const [category, services] of Object.entries(categories)) {
      for (const service of services) {
        for (const urls of Object.values(service)) {
          if (!Array.isArray(urls)) { continue; }
          for (const domain of urls) {
            if (typeof domain === 'string') {
              entries.push({ domain: domain.toLowerCase(), category, owner: Object.keys(service)[0] });
            }
          }
        }
      }
    }

    const count = insert(entries);
    recordSyncResult(SOURCE, count);
    log?.info(`DisconnectMe sync done: ${count} trackers`);
    return count;
  } catch (err) {
    recordSyncResult(SOURCE, 0, err.message);
    log?.error(`DisconnectMe sync failed: ${err.message}`);
    throw err;
  }
}
