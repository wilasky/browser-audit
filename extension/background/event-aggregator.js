// Per-tab state: Map<tabId, { scripts: Map<scriptUrl, ScriptData>, pageUrl: string }>
const tabState = new Map();

function makeScriptData(url, pageOrigin) {
  const scriptOrigin = tryOrigin(url);
  return {
    url,
    isThirdParty: scriptOrigin !== null && scriptOrigin !== pageOrigin,
    threatIntelMatch: false,
    eventCounts: {},
    targetsContacted: new Set(),
    firstSeen: Date.now(),
    lastSeen: Date.now(),
  };
}

function tryOrigin(url) {
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

export function computeScriptRisk(script) {
  let score = 0;
  const c = script.eventCounts;

  // Fingerprinting (high weight)
  const fpCount =
    (c['fp-canvas'] ?? 0) +
    (c['fp-audio'] ?? 0) +
    (c['fp-webgl'] ?? 0) +
    (c['fp-navigator'] ?? 0) +
    (c['fp-screen'] ?? 0) +
    (c['fp-fonts'] ?? 0) +
    (c['fp-battery'] ?? 0);
  score += Math.min(fpCount * 4, 35);

  // Input reading from third-party (very suspicious)
  if (script.isThirdParty) {
    score += Math.min((c['read-input'] ?? 0) * 5, 25);
    score += Math.min((c['listen'] ?? 0) * 2, 15);
  }

  // Silent exfiltration via beacon
  score += Math.min((c['beacon'] ?? 0) * 5, 20);

  // Mouse tracking
  if ((c['mouse-listen'] ?? 0) > 0) { score += 8; }

  // Multi-target
  if (script.targetsContacted.size > 2) { score += 5; }

  // Third-party penalty
  if (script.isThirdParty) { score += 5; }

  // Pro: threat intel match
  if (script.threatIntelMatch) { score += 30; }

  return Math.min(100, score);
}

export function ingestEvent(tabId, event) {
  if (!tabState.has(tabId)) {
    tabState.set(tabId, { scripts: new Map(), pageUrl: '' });
  }

  const state = tabState.get(tabId);
  const scriptUrl = event.script || 'inline';

  if (event.type === 'page-start') {
    state.pageUrl = event.data?.url ?? '';
  }

  const pageOrigin = tryOrigin(state.pageUrl);

  if (!state.scripts.has(scriptUrl)) {
    state.scripts.set(scriptUrl, makeScriptData(scriptUrl, pageOrigin));
  }

  const script = state.scripts.get(scriptUrl);
  script.lastSeen = event.timestamp;
  script.eventCounts[event.type] = (script.eventCounts[event.type] ?? 0) + 1;

  // Track network targets
  const url = event.data?.url;
  if (url && ['fetch', 'xhr', 'beacon', 'websocket'].includes(event.type)) {
    const origin = tryOrigin(url);
    if (origin) { script.targetsContacted.add(origin); }
  }
}

export function getAggregatedData(tabId) {
  const state = tabState.get(tabId);
  if (!state) { return { scripts: [], pageUrl: '' }; }

  const scripts = Array.from(state.scripts.values())
    .map((s) => ({
      url: s.url,
      isThirdParty: s.isThirdParty,
      threatIntelMatch: s.threatIntelMatch,
      eventCounts: { ...s.eventCounts },
      targetsContacted: Array.from(s.targetsContacted),
      riskScore: computeScriptRisk(s),
      firstSeen: s.firstSeen,
      lastSeen: s.lastSeen,
    }))
    .sort((a, b) => b.riskScore - a.riskScore);

  return { scripts, pageUrl: state.pageUrl };
}

export function resetTab(tabId) {
  tabState.delete(tabId);
}
