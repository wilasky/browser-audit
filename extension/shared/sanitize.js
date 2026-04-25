// HTML escaping — use before inserting any dynamic data into innerHTML
export function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Safe setAttribute for URL values (no javascript: allowed)
export function safeUrl(url) {
  const s = String(url ?? '');
  if (/^javascript:/i.test(s.trim())) { return '#'; }
  return s;
}
