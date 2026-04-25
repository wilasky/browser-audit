import { getDb } from '../db/db.js';
import { validateApiKey } from '../lib/auth.js';

function safeParseTags(raw) {
  if (!raw) { return []; }
  try { return JSON.parse(raw); } catch { return []; }
}

const SHA256_RE = /^[0-9a-f]{64}$/;

export async function lookupRoutes(fastify) {
  fastify.post('/lookup', {
    preHandler: validateApiKey,
    schema: {
      body: {
        type: 'object',
        required: ['hashes'],
        properties: {
          hashes: {
            type: 'array',
            items: { type: 'string' },
            maxItems: 100,
          },
        },
      },
    },
  }, async (request) => {
    const { hashes } = request.body;

    // Validate all hashes are valid SHA256
    const valid = hashes.filter((h) => SHA256_RE.test(h));
    if (valid.length === 0) { return { matches: [] }; }

    const db = getDb();
    const placeholders = valid.map(() => '?').join(',');

    const domainMatches = db.prepare(`
      SELECT hash, source, severity, tags FROM domains
      WHERE hash IN (${placeholders})
    `).all(...valid);

    const scriptMatches = db.prepare(`
      SELECT hash, source, malware_family as malwareFamily, tags FROM scripts
      WHERE hash IN (${placeholders})
    `).all(...valid);

    const matches = [
      ...domainMatches.map((r) => ({
        hash: r.hash,
        type: 'domain',
        source: r.source,
        severity: r.severity,
        tags: safeParseTags(r.tags),
      })),
      ...scriptMatches.map((r) => ({
        hash: r.hash,
        type: 'script',
        source: r.source,
        severity: 'critical',
        malwareFamily: r.malwareFamily,
        tags: safeParseTags(r.tags),
      })),
    ];

    return { matches, queried: valid.length };
  });
}
