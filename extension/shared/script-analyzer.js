// Static analysis of JavaScript source code.
// Detects suspicious patterns: eval, obfuscation, hardcoded URLs/IPs/base64, exfiltration patterns, etc.

import { sha256 } from './hash.js';

// --- Patterns ---

// label is technical (universal). descKey is i18n-resolved by the popup at render time.
const SUSPICIOUS_APIS = [
  { id: 'eval',                pattern: /\beval\s*\(/g,                                            weight: 10, label: 'eval()',                 descKey: 'sa.api.eval' },
  { id: 'function-ctor',       pattern: /\bnew\s+Function\s*\(/g,                                  weight: 8,  label: 'new Function()',          descKey: 'sa.api.function-ctor' },
  { id: 'settimeout-str',      pattern: /setTimeout\s*\(\s*["'`]/g,                                weight: 7,  label: 'setTimeout(string)',      descKey: 'sa.api.settimeout-str' },
  { id: 'setinterval-str',     pattern: /setInterval\s*\(\s*["'`]/g,                               weight: 7,  label: 'setInterval(string)',     descKey: 'sa.api.setinterval-str' },
  { id: 'document-write',      pattern: /\bdocument\.write(?:ln)?\s*\(/g,                          weight: 5,  label: 'document.write()',        descKey: 'sa.api.document-write' },
  { id: 'innerhtml',           pattern: /\.innerHTML\s*=/g,                                        weight: 3,  label: 'innerHTML =',             descKey: 'sa.api.innerhtml' },
  { id: 'atob',                pattern: /\batob\s*\(/g,                                            weight: 4,  label: 'atob()',                  descKey: 'sa.api.atob' },
  { id: 'unescape',            pattern: /\bunescape\s*\(/g,                                        weight: 5,  label: 'unescape()',              descKey: 'sa.api.unescape' },
  { id: 'fromcharcode',        pattern: /String\.fromCharCode/g,                                   weight: 4,  label: 'fromCharCode',            descKey: 'sa.api.fromcharcode' },
  { id: 'wasm',                pattern: /WebAssembly\.(instantiate|compile)/g,                     weight: 6,  label: 'WebAssembly',             descKey: 'sa.api.wasm' },
  { id: 'crypto-subtle',       pattern: /\bcrypto\.subtle\./g,                                     weight: 2,  label: 'crypto.subtle',           descKey: 'sa.api.crypto-subtle' },
  { id: 'webrtc-pc',           pattern: /\bnew\s+RTCPeerConnection/g,                              weight: 3,  label: 'RTCPeerConnection',       descKey: 'sa.api.webrtc-pc' },
  { id: 'navigator-clipboard', pattern: /navigator\.clipboard/g,                                   weight: 3,  label: 'clipboard API',           descKey: 'sa.api.navigator-clipboard' },
  { id: 'geolocation',         pattern: /navigator\.geolocation/g,                                 weight: 3,  label: 'geolocation',             descKey: 'sa.api.geolocation' },
  { id: 'service-worker',      pattern: /navigator\.serviceWorker\.register/g,                     weight: 4,  label: 'ServiceWorker.register',  descKey: 'sa.api.service-worker' },
  { id: 'crypto-mining',       pattern: /\b(coinhive|cryptonight|monero|webminer|cryptojacking)\b/gi, weight: 15, label: 'Cryptominer signature', descKey: 'sa.api.crypto-mining' },
  { id: 'beacon',              pattern: /navigator\.sendBeacon/g,                                  weight: 4,  label: 'sendBeacon',              descKey: 'sa.api.beacon' },
  // Network behaviour — low base weight (legitimate code uses these too)
  { id: 'fetch',               pattern: /\bfetch\s*\(/g,                                           weight: 1,  label: 'fetch()',                 descKey: 'sa.api.fetch' },
  { id: 'xhr',                 pattern: /\bnew\s+XMLHttpRequest/g,                                 weight: 2,  label: 'new XMLHttpRequest',      descKey: 'sa.api.xhr' },
  { id: 'websocket',           pattern: /\bnew\s+WebSocket/g,                                      weight: 3,  label: 'new WebSocket',           descKey: 'sa.api.websocket' },
  // DOM injection — hallmark of loaders, ad networks, malvertising
  { id: 'create-script',       pattern: /createElement\s*\(\s*['"`]script['"`]\s*\)/gi,            weight: 5,  label: "createElement('script')", descKey: 'sa.api.create-script' },
  { id: 'create-iframe',       pattern: /createElement\s*\(\s*['"`]iframe['"`]\s*\)/gi,            weight: 4,  label: "createElement('iframe')", descKey: 'sa.api.create-iframe' },
  { id: 'append-head',         pattern: /document\.head\.appendChild/g,                            weight: 3,  label: 'head.appendChild',        descKey: 'sa.api.append-head' },
  { id: 'form-action-set',     pattern: /\.(action|method)\s*=\s*['"`]/g,                          weight: 3,  label: 'form.action =',           descKey: 'sa.api.form-action-set' },
  // Edge-case eval variants that the plain /eval/ regex misses
  { id: 'window-eval',         pattern: /(?:window|self|globalThis)\s*\[\s*['"`]eval['"`]\s*\]/g,  weight: 12, label: "window['eval']",          descKey: 'sa.api.window-eval' },
  { id: 'fn-constructor',      pattern: /\[\]\s*\.\s*constructor\s*\.\s*constructor/g,             weight: 12, label: '[].constructor.constructor', descKey: 'sa.api.fn-constructor' },
];

// Obfuscation detection — patterns common in obfuscators (jjencode, packer, etc.)
const OBFUSCATION_PATTERNS = [
  { id: 'hex-vars',        pattern: /_0x[a-f0-9]{4,}/g,                              label: '_0xABCD vars',      descKey: 'sa.obf.hex-vars' },
  { id: 'long-arrays',     pattern: /var\s+\w+\s*=\s*\[\s*['"`][^'"`\n]{50,}/g,      label: 'Long string arrays', descKey: 'sa.obf.long-arrays' },
  { id: 'unicode-escapes', pattern: /\\u00[0-9a-f]{2}/gi,                            label: 'Unicode escapes',    descKey: 'sa.obf.unicode-escapes' },
];

// Match URLs, IPs and base64 chunks
const URL_PATTERN = /https?:\/\/[a-zA-Z0-9.-]+(?:\/[^\s'"`<>)\]]*)?/g;
const IP_PATTERN = /\b(?:(?:25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9]?[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9]?[0-9])\b/g;
const BASE64_PATTERN = /['"`]([A-Za-z0-9+/]{60,}={0,2})['"`]/g;

// --- Public API ---

export async function analyzeScriptSource(code, scriptUrl = '') {
  if (!code) {
    return { error: 'No code', stats: null, findings: [], obfuscation: null, urls: [], ips: [], base64: [] };
  }

  const stats = {
    size: code.length,
    sizeKB: (code.length / 1024).toFixed(1),
    lines: code.split('\n').length,
    hash: await sha256(code),
  };

  // Suspicious API findings
  const findings = [];
  for (const p of SUSPICIOUS_APIS) {
    const matches = code.match(p.pattern);
    if (matches && matches.length > 0) {
      findings.push({
        id: p.id,
        label: p.label,
        count: matches.length,
        weight: p.weight,
        descKey: p.descKey,
        score: Math.min(p.weight * matches.length, p.weight * 5),
      });
    }
  }
  findings.sort((a, b) => b.score - a.score);

  // Obfuscation score
  const obfFindings = [];
  for (const p of OBFUSCATION_PATTERNS) {
    const matches = code.match(p.pattern);
    if (matches && matches.length > 0) {
      obfFindings.push({ id: p.id, label: p.label, count: matches.length, descKey: p.descKey });
    }
  }

  // Char ratio analysis (high obfuscation has unusual ratio)
  const totalChars = code.length;
  const escapeChars = (code.match(/\\/g) || []).length;
  const obfRatio = escapeChars / Math.max(totalChars, 1);

  let obfuscationScore = 0;
  obfuscationScore += obfFindings.reduce((acc, f) => acc + Math.min(f.count, 50), 0);
  obfuscationScore += Math.floor(obfRatio * 1000);
  obfuscationScore = Math.min(100, obfuscationScore);

  const obfuscation = {
    score: obfuscationScore,
    level: obfuscationScore > 50 ? 'high' : obfuscationScore > 15 ? 'medium' : 'low',
    findings: obfFindings,
    escapeRatio: (obfRatio * 100).toFixed(2) + '%',
  };

  // Network endpoints — URLs that appear *as a literal argument* to fetch(),
  // XMLHttpRequest.open(), or new WebSocket(). Pulled out separately so
  // the popup can show "this script calls X domain" with confidence,
  // not just "the file mentions this URL somewhere".
  const ENDPOINT_PATTERNS = [
    { rx: /\bfetch\s*\(\s*['"`]([^'"`]+)['"`]/gi,                        api: 'fetch' },
    { rx: /\.open\s*\(\s*['"`][A-Z]+['"`]\s*,\s*['"`]([^'"`]+)['"`]/gi,  api: 'XHR.open' },
    { rx: /\bnew\s+WebSocket\s*\(\s*['"`]([^'"`]+)['"`]/gi,              api: 'WebSocket' },
    { rx: /navigator\.sendBeacon\s*\(\s*['"`]([^'"`]+)['"`]/gi,          api: 'sendBeacon' },
  ];
  const endpointHits = [];
  const endpointSeen = new Set();
  for (const { rx, api } of ENDPOINT_PATTERNS) {
    for (const m of code.matchAll(rx)) {
      const url = m[1];
      // Skip relative paths (href="/foo"), data: and blob: literals — they
      // aren't network destinations. Keep absolute http/https.
      if (!/^https?:\/\//i.test(url)) { continue; }
      const key = `${api}|${url}`;
      if (endpointSeen.has(key)) { continue; }
      endpointSeen.add(key);
      endpointHits.push({ api, url: url.slice(0, 200) });
      if (endpointHits.length >= 30) { break; }
    }
    if (endpointHits.length >= 30) { break; }
  }

  // Extract URLs, IPs, base64 chunks
  const urls = [...new Set(code.match(URL_PATTERN) ?? [])]
    .filter((u) => !u.includes(scriptUrl)) // exclude self
    .slice(0, 30);

  const ips = [...new Set(code.match(IP_PATTERN) ?? [])]
    .filter((ip) => !ip.startsWith('0.0.0.0') && !ip.startsWith('127.') && !ip.startsWith('255.'))
    .slice(0, 15);

  const base64Matches = [...code.matchAll(BASE64_PATTERN)]
    .map((m) => m[1])
    .slice(0, 10);

  // Exfiltration heuristic: script that reads sensitive client storage AND
  // sends data outbound. Each side alone is normal (analytics fetch, cookie
  // reader for UI), but the combination is the textbook pattern for
  // form/credential stealers and tracker pixels building cross-site IDs.
  // Heuristic, not proof — surfaced as a warning, not a verdict.
  const READS = [
    /\bdocument\.cookie\b/,
    /localStorage\.(getItem|key|getAll)\b/,
    /sessionStorage\.(getItem|key|getAll)\b/,
    /indexedDB\.open\b/,
  ];
  const SENDS = [
    /\bfetch\s*\(/,
    /\bnew\s+XMLHttpRequest\b/,
    /navigator\.sendBeacon\b/,
    /\bnew\s+WebSocket\b/,
    /\bnew\s+Image\s*\(\s*\)/, // 1x1 pixel exfil pattern
  ];
  const reads = READS.filter((rx) => rx.test(code)).map((rx) => rx.source);
  const sends = SENDS.filter((rx) => rx.test(code)).map((rx) => rx.source);
  // Threshold tuned to reduce false positives: every analytics/tag-manager
  // library reads cookies and does ONE fetch (legitimate). Requiring at
  // least 2 distinct sending channels makes the heuristic specific enough
  // for credential stealers / aggressive trackers without flagging GTM/GA.
  // Treated as INFORMATIVE — does not affect totalRiskScore.
  const exfiltration = (reads.length >= 1 && sends.length >= 2)
    ? { reads, sends }
    : null;

  const totalRiskScore = Math.min(100,
    findings.reduce((acc, f) => acc + f.score, 0) +
    Math.floor(obfuscationScore / 4)
  );

  // Verdict — popup resolves the human text via t(`verdict.${level}`).
  let verdict;
  if (totalRiskScore >= 70) { verdict = { level: 'critical' }; }
  else if (totalRiskScore >= 40) { verdict = { level: 'high' }; }
  else if (totalRiskScore >= 20) { verdict = { level: 'medium' }; }
  else { verdict = { level: 'low' }; }

  return {
    stats,
    findings,
    obfuscation,
    urls,
    ips,
    base64: base64Matches,
    endpoints: endpointHits,
    exfiltration,
    totalRiskScore,
    verdict,
  };
}

// --- Network helper ---

// Fetch is delegated to the background service worker — it has reliable
// access to URLs covered by host_permissions even when popup CSP blocks them.
export async function fetchScriptSource(url) {
  if (!url || url === 'inline') { return null; }

  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ type: 'fetch_script_source', url }, (res) => {
      void chrome.runtime.lastError;
      if (!res) { reject(new Error('Sin respuesta del background')); return; }
      if (!res.ok) { reject(new Error(res.reason ?? 'Descarga fallida')); return; }
      resolve(res.text);
    });
  });
}
