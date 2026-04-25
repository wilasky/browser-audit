// Central config — override BACKEND_URL in production via baseline sync
export const BACKEND_URL = 'https://api.browseraudit.com'; // update when deployed

export const TI_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h
export const AUDIT_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24h

export const SEVERITY_SCORE = {
  critical: 15,
  high: 10,
  medium: 6,
  low: 2,
};
