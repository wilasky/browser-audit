// Minimum 32 hex characters to be considered a valid API key format
const KEY_RE = /^[a-zA-Z0-9_-]{32,}$/;

const VALID_KEYS = new Set(
  (process.env.API_KEYS ?? '')
    .split(',')
    .map((k) => k.trim())
    .filter((k) => KEY_RE.test(k))
);

// Per-key rate limiting: max 200 lookups/minute per key
const keyHits = new Map();

function isKeyRateLimited(key) {
  const now = Date.now();
  const window = 60_000;
  const max = 200;

  if (!keyHits.has(key)) { keyHits.set(key, []); }
  const hits = keyHits.get(key).filter((t) => now - t < window);
  hits.push(now);
  keyHits.set(key, hits);
  return hits.length > max;
}

// Prune old entries every 5 minutes to prevent memory growth
setInterval(() => {
  const cutoff = Date.now() - 60_000;
  for (const [key, hits] of keyHits) {
    const fresh = hits.filter((t) => t > cutoff);
    if (fresh.length === 0) { keyHits.delete(key); } else { keyHits.set(key, fresh); }
  }
}, 5 * 60_000);

export function validateApiKey(request, reply, done) {
  const key = request.headers['x-api-key'];
  if (!key || !VALID_KEYS.has(key)) {
    reply.code(401).send({ error: 'Invalid or missing API key' });
    return;
  }
  if (isKeyRateLimited(key)) {
    reply.code(429).send({ error: 'Rate limit exceeded for this API key' });
    return;
  }
  done();
}
