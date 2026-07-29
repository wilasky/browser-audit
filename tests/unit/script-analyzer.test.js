import { describe, it, expect } from 'vitest';

// analyzeScriptSource imports sha256 which uses crypto.subtle. Provide a
// minimal global for the Node test environment.
import { webcrypto } from 'node:crypto';
if (!globalThis.crypto) { globalThis.crypto = webcrypto; }

import { analyzeScriptSource } from '../../extension/shared/script-analyzer.js';

describe('analyzeScriptSource — verdict thresholds', () => {
  it('returns low verdict on a trivial script', async () => {
    const code = "const x = 1; console.log('hello');";
    const r = await analyzeScriptSource(code);
    expect(r.verdict.level).toBe('low');
    expect(r.totalRiskScore).toBeLessThan(25);
  });

  it('returns medium for many DOM-injection patterns alone', async () => {
    // 4× createElement('script') × weight 2 = 8, +sendBeacon + fetch + XHR
    const code = `
      document.createElement('script');
      document.createElement('script');
      document.createElement('script');
      document.createElement('script');
      navigator.sendBeacon('https://x.com/t');
      fetch('https://api.x.com/log');
      new XMLHttpRequest();
    `;
    const r = await analyzeScriptSource(code);
    // Should not be CRITICAL — these are all "common in legitimate SDK" patterns
    expect(r.verdict.level).not.toBe('critical');
  });

  it('returns medium-or-higher for cryptominer signature', async () => {
    // Use word-boundary-friendly tokens (no _-suffix) so the regex catches
    // them. Two distinct matches × weight 15 → score 30 → medium tier.
    const code = "load coinhive; load cryptonight; load monero;";
    const r = await analyzeScriptSource(code);
    expect(r.totalRiskScore).toBeGreaterThanOrEqual(25);
  });
});

describe('analyzeScriptSource — endpoints extraction', () => {
  it('extracts URLs passed to fetch as string literals', async () => {
    const code = "fetch('https://api.example.com/users');";
    const r = await analyzeScriptSource(code);
    expect(r.endpoints).toContainEqual({
      api: 'fetch', url: 'https://api.example.com/users',
    });
  });

  it('extracts XHR.open URLs', async () => {
    const code = "var x = new XMLHttpRequest(); x.open('GET', 'https://t.example.com/log');";
    const r = await analyzeScriptSource(code);
    expect(r.endpoints).toContainEqual({
      api: 'XHR.open', url: 'https://t.example.com/log',
    });
  });

  it('extracts WebSocket URLs', async () => {
    const code = "new WebSocket('wss://realtime.example.com/socket');";
    const r = await analyzeScriptSource(code);
    expect(r.endpoints).toContainEqual({
      api: 'WebSocket', url: 'wss://realtime.example.com/socket',
    });
  });

  it('skips relative paths', async () => {
    const code = "fetch('/local/api');";
    const r = await analyzeScriptSource(code);
    expect(r.endpoints).toEqual([]);
  });

  it('dedupes identical (api, url) pairs', async () => {
    const code = "fetch('https://x.com/a'); fetch('https://x.com/a'); fetch('https://x.com/a');";
    const r = await analyzeScriptSource(code);
    const xa = r.endpoints.filter((e) => e.url === 'https://x.com/a');
    expect(xa).toHaveLength(1);
  });
});

describe('analyzeScriptSource — exfiltration heuristic', () => {
  it('does not flag when only one send channel', async () => {
    // Reads cookie + ONE fetch — every analytics SDK does this
    const code = "var c = document.cookie; fetch('https://analytics/log');";
    const r = await analyzeScriptSource(code);
    expect(r.exfiltration).toBeNull();
  });

  it('does not flag when only reads but no sends', async () => {
    const code = "var c = document.cookie; var s = localStorage.getItem('x');";
    const r = await analyzeScriptSource(code);
    expect(r.exfiltration).toBeNull();
  });

  it('flags when reads + 2+ distinct send channels', async () => {
    const code = `
      var c = document.cookie;
      fetch('https://x.com/log');
      navigator.sendBeacon('https://x.com/beacon');
    `;
    const r = await analyzeScriptSource(code);
    expect(r.exfiltration).not.toBeNull();
    expect(r.exfiltration.reads.length).toBeGreaterThanOrEqual(1);
    expect(r.exfiltration.sends.length).toBeGreaterThanOrEqual(2);
  });

  it('does not affect the total risk score (informative only)', async () => {
    const codeA = "var c = document.cookie; fetch('/a'); navigator.sendBeacon('/b');";
    const codeB = "var c = document.cookie; fetch('/a');"; // single send
    const a = await analyzeScriptSource(codeA);
    const b = await analyzeScriptSource(codeB);
    // Same patterns minus sendBeacon (weight 2) — exfiltration shouldn't add extra
    expect(a.totalRiskScore - b.totalRiskScore).toBeLessThanOrEqual(10);
  });
});

describe('analyzeScriptSource — source map detection', () => {
  it('extracts sourceMappingURL with absolute URL', async () => {
    const code = "var x=1;\n//# sourceMappingURL=https://cdn.example.com/bundle.min.js.map";
    const r = await analyzeScriptSource(code, 'https://cdn.example.com/bundle.min.js');
    expect(r.sourceMapUrl).toBe('https://cdn.example.com/bundle.min.js.map');
  });

  it('resolves relative sourceMappingURL against scriptUrl', async () => {
    const code = "var x=1;\n//# sourceMappingURL=bundle.min.js.map";
    const r = await analyzeScriptSource(code, 'https://cdn.example.com/v3/bundle.min.js');
    expect(r.sourceMapUrl).toBe('https://cdn.example.com/v3/bundle.min.js.map');
  });

  it('accepts legacy //@ syntax', async () => {
    const code = "var x=1;\n//@ sourceMappingURL=foo.map";
    const r = await analyzeScriptSource(code, 'https://x.com/script.js');
    expect(r.sourceMapUrl).toBe('https://x.com/foo.map');
  });

  it('returns null when no sourceMappingURL present', async () => {
    const code = "var x = 1;";
    const r = await analyzeScriptSource(code);
    expect(r.sourceMapUrl).toBeNull();
  });
});

describe('analyzeScriptSource — DOM injection patterns', () => {
  it('detects createElement(\'script\')', async () => {
    const code = "document.createElement('script');";
    const r = await analyzeScriptSource(code);
    expect(r.findings.some((f) => f.id === 'create-script')).toBe(true);
  });

  it('detects createElement(\'iframe\')', async () => {
    const code = "document.createElement('iframe');";
    const r = await analyzeScriptSource(code);
    expect(r.findings.some((f) => f.id === 'create-iframe')).toBe(true);
  });

  it('detects window[\'eval\'] bracket access', async () => {
    const code = "window['eval']('var x=1');";
    const r = await analyzeScriptSource(code);
    expect(r.findings.some((f) => f.id === 'window-eval')).toBe(true);
  });

  it('detects [].constructor.constructor pattern', async () => {
    const code = "var f = [].constructor.constructor('return 1');";
    const r = await analyzeScriptSource(code);
    expect(r.findings.some((f) => f.id === 'fn-constructor')).toBe(true);
  });
});
