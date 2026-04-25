// Threat Intelligence client — Pro only.
// Sends SHA256 hashes (never raw URLs/domains) to the backend.
// Results cached 24h in chrome.storage.local.

import { BACKEND_URL, TI_CACHE_TTL_MS } from '../shared/constants.js';
import { isProUser } from './plan-manager.js';

const CACHE_KEY = 'tiCache';
const MAX_BATCH = 50;

async function loadCache() {
  const s = await chrome.storage.local.get(CACHE_KEY);
  return s[CACHE_KEY] ?? {};
}

async function saveCache(cache) {
  await chrome.storage.local.set({ [CACHE_KEY]: cache });
}

function isExpired(entry) {
  return !entry || Date.now() - entry.ts > TI_CACHE_TTL_MS;
}

// Returns a Map<hash, matchResult | null>
export async function lookupHashes(hashes) {
  if (!hashes.length) { return new Map(); }
  if (!(await isProUser())) { return new Map(); }

  const cache = await loadCache();
  const results = new Map();
  const toFetch = [];

  for (const hash of hashes) {
    const cached = cache[hash];
    if (!isExpired(cached)) {
      results.set(hash, cached.match);
    } else {
      toFetch.push(hash);
    }
  }

  if (!toFetch.length) { return results; }

  // Batch into groups of MAX_BATCH
  const apiKey = await getApiKey();
  if (!apiKey) { return results; }

  for (let i = 0; i < toFetch.length; i += MAX_BATCH) {
    const batch = toFetch.slice(i, i + MAX_BATCH);
    try {
      const res = await fetch(`${BACKEND_URL}/lookup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey,
        },
        body: JSON.stringify({ hashes: batch }),
        signal: AbortSignal.timeout(10000),
      });

      if (!res.ok) { continue; }

      const data = await res.json();
      const matchMap = new Map((data.matches ?? []).map((m) => [m.hash, m]));

      const now = Date.now();
      for (const hash of batch) {
        const match = matchMap.get(hash) ?? null;
        results.set(hash, match);
        cache[hash] = { match, ts: now };
      }
    } catch {
      // Network error — leave uncached hashes without result (not stored)
    }
  }

  // Prune old cache entries (keep last 5000)
  const entries = Object.entries(cache);
  if (entries.length > 5000) {
    const pruned = Object.fromEntries(
      entries.sort((a, b) => b[1].ts - a[1].ts).slice(0, 5000)
    );
    await saveCache(pruned);
  } else {
    await saveCache(cache);
  }

  return results;
}

async function getApiKey() {
  const s = await chrome.storage.local.get('proApiKey');
  return s.proApiKey ?? null;
}

export async function setApiKey(key) {
  await chrome.storage.local.set({ proApiKey: key });
}

export async function clearTiCache() {
  await chrome.storage.local.remove(CACHE_KEY);
}
