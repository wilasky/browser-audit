const VALID_KEYS = new Set(
  (process.env.API_KEYS ?? '').split(',').map((k) => k.trim()).filter(Boolean)
);

export function validateApiKey(request, reply, done) {
  const key = request.headers['x-api-key'];
  if (!key || !VALID_KEYS.has(key)) {
    reply.code(401).send({ error: 'Invalid or missing API key' });
    return;
  }
  done();
}
