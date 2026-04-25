import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dir = dirname(fileURLToPath(import.meta.url));

// Serve the extension's bundled baseline — no auth required
const BASELINE_PATH = join(__dir, '../../../..', 'extension/data/baseline.v1.json');

let _baseline = null;
function getBaseline() {
  if (!_baseline) {
    try {
      _baseline = JSON.parse(readFileSync(BASELINE_PATH, 'utf8'));
    } catch {
      _baseline = { error: 'baseline not found' };
    }
  }
  return _baseline;
}

export async function baselineRoutes(fastify) {
  fastify.get('/baseline/latest', async (_req, reply) => {
    reply.header('Cache-Control', 'public, max-age=3600');
    return getBaseline();
  });

  fastify.get('/baseline/v1', async (_req, reply) => {
    reply.header('Cache-Control', 'public, max-age=86400');
    return getBaseline();
  });
}
