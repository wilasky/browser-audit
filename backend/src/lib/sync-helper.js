import { getDb } from '../db/db.js';

export function recordSyncResult(source, count, error = null) {
  const db = getDb();
  db.prepare(`
    INSERT INTO sync_state (source, last_sync, record_count, error)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(source) DO UPDATE SET
      last_sync = excluded.last_sync,
      record_count = excluded.record_count,
      error = excluded.error
  `).run(source, Date.now(), count, error);
}

export function getSyncState(source) {
  return getDb().prepare('SELECT * FROM sync_state WHERE source = ?').get(source);
}

export async function fetchWithTimeout(url, options = {}, timeoutMs = 30000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    if (!res.ok) { throw new Error(`HTTP ${res.status} from ${url}`); }
    return res;
  } finally {
    clearTimeout(timer);
  }
}
