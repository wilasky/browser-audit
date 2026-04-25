import { describe, it, expect, beforeEach } from 'vitest';
import { computeScriptRisk, ingestEvent, getAggregatedData, resetTab } from '../../extension/background/event-aggregator.js';

const TAB = 42;

beforeEach(() => resetTab(TAB));

// --- computeScriptRisk ---

describe('computeScriptRisk', () => {
  function makeScript(overrides = {}) {
    return {
      isThirdParty: false,
      threatIntelMatch: false,
      eventCounts: {},
      targetsContacted: new Set(),
      ...overrides,
    };
  }

  it('returns 0 for an empty first-party script', () => {
    expect(computeScriptRisk(makeScript())).toBe(0);
  });

  it('scores fingerprinting events (4pts each, max 35)', () => {
    const s = makeScript({ eventCounts: { 'fp-canvas': 10 } }); // 10*4=40, capped at 35
    expect(computeScriptRisk(s)).toBe(35);
  });

  it('scores beacon silently (5pts each, max 20)', () => {
    const s = makeScript({ eventCounts: { beacon: 5 } }); // 5*5=25, capped at 20
    expect(computeScriptRisk(s)).toBe(20);
  });

  it('adds 8pts for mouse tracking', () => {
    const s = makeScript({ eventCounts: { 'mouse-listen': 1 } });
    expect(computeScriptRisk(s)).toBe(8);
  });

  it('adds 5pts for third-party penalty', () => {
    const s = makeScript({ isThirdParty: true });
    expect(computeScriptRisk(s)).toBe(5);
  });

  it('adds extra pts for input reading from third-party', () => {
    const s = makeScript({ isThirdParty: true, eventCounts: { 'read-input': 1 } });
    // 5pts third-party + 5pts read-input
    expect(computeScriptRisk(s)).toBe(10);
  });

  it('adds 5pts for multi-target (>2 destinations)', () => {
    const targets = new Set(['https://a.com', 'https://b.com', 'https://c.com']);
    const s = makeScript({ targetsContacted: targets });
    expect(computeScriptRisk(s)).toBe(5);
  });

  it('adds 30pts for threat intel match', () => {
    const s = makeScript({ threatIntelMatch: true });
    expect(computeScriptRisk(s)).toBe(30);
  });

  it('clamps score to 100', () => {
    const s = makeScript({
      isThirdParty: true,
      threatIntelMatch: true,
      eventCounts: { 'fp-canvas': 10, beacon: 5, 'mouse-listen': 3, 'read-input': 5 },
      targetsContacted: new Set(['a', 'b', 'c']),
    });
    expect(computeScriptRisk(s)).toBe(100);
  });
});

// --- ingestEvent + getAggregatedData ---

describe('ingestEvent / getAggregatedData', () => {
  it('returns empty state for unknown tab', () => {
    const data = getAggregatedData(999);
    expect(data.scripts).toHaveLength(0);
  });

  it('groups events by script URL', () => {
    ingestEvent(TAB, { type: 'fetch', data: { url: 'https://api.example.com' }, script: 'https://app.com/main.js', timestamp: 1 });
    ingestEvent(TAB, { type: 'fetch', data: { url: 'https://api.example.com' }, script: 'https://app.com/main.js', timestamp: 2 });
    ingestEvent(TAB, { type: 'xhr', data: { url: 'https://other.com' }, script: 'https://cdn.example.com/lib.js', timestamp: 3 });

    const { scripts } = getAggregatedData(TAB);
    expect(scripts).toHaveLength(2);
    const main = scripts.find((s) => s.url === 'https://app.com/main.js');
    expect(main.eventCounts.fetch).toBe(2);
  });

  it('tracks network targets contacted', () => {
    ingestEvent(TAB, { type: 'fetch', data: { url: 'https://tracker.io/pixel' }, script: 'https://cdn.tracker.io/t.js', timestamp: 1 });

    const { scripts } = getAggregatedData(TAB);
    expect(scripts[0].targetsContacted).toContain('https://tracker.io');
  });

  it('marks third-party scripts correctly', () => {
    ingestEvent(TAB, { type: 'page-start', data: { url: 'https://mysite.com/page' }, script: 'inline', timestamp: 0 });
    ingestEvent(TAB, { type: 'fetch', data: { url: 'https://api.mysite.com' }, script: 'https://cdn.thirdparty.com/lib.js', timestamp: 1 });

    const { scripts } = getAggregatedData(TAB);
    const lib = scripts.find((s) => s.url === 'https://cdn.thirdparty.com/lib.js');
    expect(lib.isThirdParty).toBe(true);
  });

  it('sorts scripts by risk score descending', () => {
    ingestEvent(TAB, { type: 'fp-canvas', data: {}, script: 'https://risky.com/fp.js', timestamp: 1 });
    ingestEvent(TAB, { type: 'fetch', data: { url: 'https://api.com' }, script: 'https://safe.com/app.js', timestamp: 2 });

    const { scripts } = getAggregatedData(TAB);
    expect(scripts[0].riskScore).toBeGreaterThanOrEqual(scripts[1].riskScore);
  });

  it('resets state on resetTab', () => {
    ingestEvent(TAB, { type: 'fetch', data: {}, script: 'https://x.com/a.js', timestamp: 1 });
    resetTab(TAB);
    expect(getAggregatedData(TAB).scripts).toHaveLength(0);
  });
});
