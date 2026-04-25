// Static analysis of JavaScript source code.
// Detects suspicious patterns: eval, obfuscation, hardcoded URLs/IPs/base64, exfiltration patterns, etc.

import { sha256 } from './hash.js';

// --- Patterns ---

const SUSPICIOUS_APIS = [
  { id: 'eval', pattern: /\beval\s*\(/g, weight: 10, label: 'eval()', desc: 'Ejecución dinámica de código (vector clásico de XSS y obfuscación)' },
  { id: 'function-ctor', pattern: /\bnew\s+Function\s*\(/g, weight: 8, label: 'new Function()', desc: 'Equivalente a eval, suele indicar código generado en runtime' },
  { id: 'settimeout-str', pattern: /setTimeout\s*\(\s*["'`]/g, weight: 7, label: 'setTimeout(string)', desc: 'setTimeout con string ejecuta como eval' },
  { id: 'setinterval-str', pattern: /setInterval\s*\(\s*["'`]/g, weight: 7, label: 'setInterval(string)', desc: 'setInterval con string ejecuta como eval' },
  { id: 'document-write', pattern: /\bdocument\.write(?:ln)?\s*\(/g, weight: 5, label: 'document.write()', desc: 'XSS surface, prácticamente deprecado' },
  { id: 'innerhtml', pattern: /\.innerHTML\s*=/g, weight: 3, label: 'innerHTML =', desc: 'Asignación directa de HTML sin sanitizar' },
  { id: 'atob', pattern: /\batob\s*\(/g, weight: 4, label: 'atob()', desc: 'Decodificación base64 — común en obfuscación' },
  { id: 'unescape', pattern: /\bunescape\s*\(/g, weight: 5, label: 'unescape()', desc: 'Decodificación deprecated, suele indicar obfuscación' },
  { id: 'fromcharcode', pattern: /String\.fromCharCode/g, weight: 4, label: 'fromCharCode', desc: 'Construcción de strings desde códigos — común en obfuscación' },
  { id: 'wasm', pattern: /WebAssembly\.(instantiate|compile)/g, weight: 6, label: 'WebAssembly', desc: 'Código binario, opaco al análisis estático' },
  { id: 'crypto-subtle', pattern: /\bcrypto\.subtle\./g, weight: 2, label: 'crypto.subtle', desc: 'Operaciones criptográficas — pueden ser legítimas o ransomware' },
  { id: 'webrtc-pc', pattern: /\bnew\s+RTCPeerConnection/g, weight: 3, label: 'RTCPeerConnection', desc: 'WebRTC — puede revelar IPs reales' },
  { id: 'navigator-clipboard', pattern: /navigator\.clipboard/g, weight: 3, label: 'clipboard API', desc: 'Acceso al portapapeles' },
  { id: 'geolocation', pattern: /navigator\.geolocation/g, weight: 3, label: 'geolocation', desc: 'Solicita ubicación geográfica' },
  { id: 'service-worker', pattern: /navigator\.serviceWorker\.register/g, weight: 4, label: 'ServiceWorker.register', desc: 'Registra worker persistente — puede actuar tras cerrar pestaña' },
  { id: 'crypto-mining', pattern: /\b(coinhive|cryptonight|monero|webminer|cryptojacking)\b/gi, weight: 15, label: 'Cryptominer signature', desc: 'Patrón conocido de cryptominer' },
  { id: 'beacon', pattern: /navigator\.sendBeacon/g, weight: 4, label: 'sendBeacon', desc: 'Envío silencioso de datos (no espera respuesta)' },
];

// Obfuscation detection — patterns common in obfuscators (jjencode, packer, etc.)
const OBFUSCATION_PATTERNS = [
  { id: 'hex-vars', pattern: /_0x[a-f0-9]{4,}/g, label: '_0xABCD vars', desc: 'Variables hexadecimales — obfuscador típico' },
  { id: 'long-arrays', pattern: /var\s+\w+\s*=\s*\[\s*['"`][^'"`\n]{50,}/g, label: 'Long string arrays', desc: 'Arrays con strings largos codificados' },
  { id: 'unicode-escapes', pattern: /\\u00[0-9a-f]{2}/gi, label: 'Unicode escapes', desc: 'Caracteres en formato \\uXXXX' },
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
        desc: p.desc,
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
      obfFindings.push({ id: p.id, label: p.label, count: matches.length, desc: p.desc });
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

  // Total risk score
  const totalRiskScore = Math.min(100,
    findings.reduce((acc, f) => acc + f.score, 0) +
    Math.floor(obfuscationScore / 4)
  );

  // Verdict
  let verdict;
  if (totalRiskScore >= 70) {
    verdict = { level: 'critical', text: 'Patrón altamente sospechoso — investigar urgentemente' };
  } else if (totalRiskScore >= 40) {
    verdict = { level: 'high', text: 'Múltiples señales de alerta — analizar manualmente' };
  } else if (totalRiskScore >= 20) {
    verdict = { level: 'medium', text: 'Algunas señales típicas, posiblemente código de producción minificado' };
  } else {
    verdict = { level: 'low', text: 'Sin patrones especialmente preocupantes' };
  }

  return {
    stats,
    findings,
    obfuscation,
    urls,
    ips,
    base64: base64Matches,
    totalRiskScore,
    verdict,
  };
}

// --- Network helper ---

export async function fetchScriptSource(url) {
  if (!url || url === 'inline') { return null; }
  try {
    const res = await fetch(url, { credentials: 'omit', cache: 'force-cache' });
    if (!res.ok) { throw new Error(`HTTP ${res.status}`); }
    return await res.text();
  } catch (err) {
    throw new Error(`No se pudo descargar: ${err.message}`);
  }
}
