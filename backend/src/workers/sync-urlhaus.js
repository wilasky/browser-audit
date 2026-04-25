// URLhaus: abuse.ch malicious URL/domain database
// Feed: https://urlhaus.abuse.ch/downloads/csv/ (CSV, ~5MB)
// Update: every hour

import { getDb } from '../db/db.js';
import { sha256 } from '../lib/hash.js';
import { recordSyncResult, fetchWithTimeout } from '../lib/sync-helper.js';

const FEED_URL = 'https://urlhaus.abuse.ch/downloads/csv/';
const SOURCE = 'urlhaus';

export async function syncUrlhaus(log) {
  log?.info('URLhaus sync starting');
  const db = getDb();

  try {
    const res = await fetchWithTimeout(FEED_URL, {
      headers: { 'User-Agent': 'BrowserAudit/1.0 (+https://github.com/wilasky/browser-audit)' },
    }, 60000);

    const text = await res.text();
    const lines = text.split('\n').filter((l) => l && !l.startsWith('#'));

    const upsert = db.prepare(`
      INSERT INTO domains (hash, source, severity, tags, first_seen, last_seen)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(hash) DO UPDATE SET last_seen = excluded.last_seen, severity = excluded.severity
    `);

    const insert = db.transaction((rows) => {
      let count = 0;
      for (const line of rows) {
        const parts = line.split(',').map((p) => p.replace(/^"|"$/g, '').trim());
        // CSV format: id, dateadded, url, url_status, last_online, threat, tags, urls_count, urlhaus_link, reporter
        if (parts.length < 6) { continue; }
        const url = parts[2];
        if (!url) { continue; }

        let domain;
        try { domain = new URL(url).hostname; } catch { continue; }
        if (!domain) { continue; }

        const threat = parts[5] ?? 'malware';
        const severity = threat === 'phishing' ? 'high' : 'critical';
        const tags = parts[6] ? JSON.stringify(parts[6].split(' ').filter(Boolean)) : null;
        const now = Date.now();

        upsert.run(sha256(domain), SOURCE, severity, tags, now, now);
        count++;
      }
      return count;
    });

    const count = insert(lines);
    recordSyncResult(SOURCE, count);
    log?.info(`URLhaus sync done: ${count} domains`);
    return count;
  } catch (err) {
    recordSyncResult(SOURCE, 0, err.message);
    log?.error(`URLhaus sync failed: ${err.message}`);
    throw err;
  }
}
