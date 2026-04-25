import { createHash } from 'node:crypto';

export function sha256(str) {
  return createHash('sha256').update(str.toLowerCase().trim()).digest('hex');
}
