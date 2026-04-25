// PhishTank: verified phishing URLs
// Feed: http://data.phishtank.com/data/online-valid.json.gz (requires free API key)
// Fallback: OpenPhish free feed
// Update: every 6 hours

import { getDb } from '../db/db.js';
import { sha256 } from '../lib/hash.js';
import { recordSyncResult, fetchWithTimeout } from '../lib/sync-helper.js';

// OpenPhish free feed (no API key required, updates every 6h)
const OPENPHISH_URL = 'https://openphish.com/feed.txt';
const SOURCE = 'phishtank';

export async function syncPhishTank(log) {
  log?.info('PhishTank/OpenPhish sync starting');
  const db = getDb();

  try {
    const res = await fetchWithTimeout(OPENPHISH_URL, {
      headers: { 'User-Agent': 'BrowserAudit/1.0' },
    }, 30000);

    const text = await res.text();
    const urls = text.split('\n').map((l) => l.trim()).filter(Boolean);

    const upsert = db.prepare(`
      INSERT INTO domains (hash, source, severity, tags, first_seen, last_seen)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(hash) DO UPDATE SET last_seen = excluded.last_seen
    `);

    const insert = db.transaction((lines) => {
      const now = Date.now();
      let count = 0;
      for (const url of lines) {
        let domain;
        try { domain = new URL(url).hostname; } catch { continue; }
        if (!domain) { continue; }
        upsert.run(sha256(domain), SOURCE, 'critical', JSON.stringify(['phishing']), now, now);
        count++;
      }
      return count;
    });

    const count = insert(urls);
    recordSyncResult(SOURCE, count);
    log?.info(`PhishTank/OpenPhish sync done: ${count} domains`);
    return count;
  } catch (err) {
    recordSyncResult(SOURCE, 0, err.message);
    log?.error(`PhishTank sync failed: ${err.message}`);
    throw err;
  }
}
