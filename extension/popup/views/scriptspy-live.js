const RISK_LABEL = (s) =>
  s >= 70 ? ['ALTO', 'risk-high'] : s >= 35 ? ['MEDIO', 'risk-med'] : ['BAJO', 'risk-low'];

const EVENT_LABELS = {
  fetch: 'Fetch', xhr: 'XHR', beacon: 'Beacon', websocket: 'WebSocket',
  'cookie-read': 'Cookie R', 'cookie-write': 'Cookie W',
  'storage-read': 'Storage R', 'storage-write': 'Storage W',
  listen: 'Input listener', 'mouse-listen': 'Mouse', 'read-input': 'Form read',
  'fp-canvas': 'Canvas FP', 'fp-audio': 'Audio FP', 'fp-webgl': 'WebGL FP',
  'fp-navigator': 'Navigator FP', 'fp-screen': 'Screen FP', 'fp-fonts': 'Fonts FP',
  'fp-battery': 'Battery FP', 'script-inject': 'Script inject', 'page-start': 'Page',
};

const FP_TYPES = new Set(['fp-canvas', 'fp-audio', 'fp-webgl', 'fp-navigator', 'fp-screen', 'fp-fonts', 'fp-battery']);
const NET_TYPES = new Set(['fetch', 'xhr', 'beacon', 'websocket']);

function shortUrl(url) {
  if (url === 'inline') { return 'inline'; }
  try {
    const u = new URL(url);
    const path = u.pathname !== '/' ? u.pathname.slice(0, 28) : '';
    return u.hostname + path;
  } catch {
    return url.slice(0, 40);
  }
}

function riskExplanation(s) {
  const reasons = [];
  const c = s.eventCounts;
  const fpTotal = [...FP_TYPES].reduce((acc, t) => acc + (c[t] ?? 0), 0);
  if (fpTotal > 0) { reasons.push(`${fpTotal} técnica(s) de fingerprinting`); }
  if ((c['beacon'] ?? 0) > 0) { reasons.push(`${c['beacon']} beacon silencioso`); }
  if ((c['mouse-listen'] ?? 0) > 0) { reasons.push('tracking de ratón'); }
  if (s.isThirdParty && (c['read-input'] ?? 0) > 0) { reasons.push('lectura de formularios (3rd party)'); }
  if (s.targetsContacted.length > 2) { reasons.push(`${s.targetsContacted.length} destinos de red`); }
  if (s.threatIntelMatch) { reasons.push('⚠ en lista de amenazas'); }
  return reasons.length ? reasons.join(' · ') : 'sin comportamiento sospechoso';
}

function renderScript(s) {
  const [riskText, riskCls] = RISK_LABEL(s.riskScore);
  const thirdPartyBadge = s.isThirdParty ? '<span class="badge badge-3p">3rd party</span>' : '<span class="badge badge-1p">1st party</span>';
  const tieBadge = s.threatIntelMatch ? '<span class="badge badge-threat">⚠ THREAT</span>' : '';

  const netEvents = Object.entries(s.eventCounts)
    .filter(([t, n]) => NET_TYPES.has(t) && n > 0)
    .map(([t, n]) => `<span class="evt-chip evt-net">${EVENT_LABELS[t]} ×${n}</span>`)
    .join('');

  const fpEvents = Object.entries(s.eventCounts)
    .filter(([t, n]) => FP_TYPES.has(t) && n > 0)
    .map(([t, n]) => `<span class="evt-chip evt-fp">${EVENT_LABELS[t]} ×${n}</span>`)
    .join('');

  const otherEvents = Object.entries(s.eventCounts)
    .filter(([t, n]) => !NET_TYPES.has(t) && !FP_TYPES.has(t) && t !== 'page-start' && n > 0)
    .map(([t, n]) => `<span class="evt-chip">${EVENT_LABELS[t] ?? t} ×${n}</span>`)
    .join('');

  const targets = s.targetsContacted.length
    ? `<div class="script-targets"><span class="targets-label">→</span> ${s.targetsContacted.join(', ')}</div>`
    : '';

  const explanation = `<div class="risk-reason">${riskExplanation(s)}</div>`;

  return `
    <li class="script-item">
      <div class="script-header">
        <span class="script-url" title="${s.url}">${shortUrl(s.url)}</span>
        ${thirdPartyBadge}${tieBadge}
        <span class="risk-pill ${riskCls}">${s.riskScore} ${riskText}</span>
      </div>
      ${explanation}
      ${netEvents || fpEvents || otherEvents ? `<div class="script-events">${netEvents}${fpEvents}${otherEvents}</div>` : ''}
      ${targets}
    </li>`;
}

function renderSummary(scripts) {
  const total = scripts.length;
  const high = scripts.filter((s) => s.riskScore >= 70).length;
  const med = scripts.filter((s) => s.riskScore >= 35 && s.riskScore < 70).length;
  const thirdParty = scripts.filter((s) => s.isThirdParty).length;
  const totalEvents = scripts.reduce((acc, s) => acc + Object.values(s.eventCounts).reduce((a, b) => a + b, 0), 0);

  return `
    <div class="spy-summary">
      <span class="sum-item"><strong>${total}</strong> scripts</span>
      <span class="sum-sep">·</span>
      <span class="sum-item"><strong>${thirdParty}</strong> terceros</span>
      <span class="sum-sep">·</span>
      ${high > 0 ? `<span class="sum-item sum-high"><strong>${high}</strong> riesgo alto</span><span class="sum-sep">·</span>` : ''}
      ${med > 0 ? `<span class="sum-item sum-med"><strong>${med}</strong> medio</span><span class="sum-sep">·</span>` : ''}
      <span class="sum-item"><strong>${totalEvents}</strong> eventos</span>
    </div>`;
}

async function getActiveTabId() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab?.id ?? null;
}

export async function renderScriptSpyLive(container) {
  const tabId = await getActiveTabId();

  container.innerHTML = `
    <div class="spy-toolbar">
      <span class="spy-label">Página: <strong class="spy-page">—</strong></span>
      <button id="btn-spy-refresh" class="btn-secondary">Actualizar</button>
      <button id="btn-spy-inject" class="btn-primary">Activar ScriptSpy</button>
    </div>
    <div id="spy-summary-area"></div>
    <ul class="script-list"></ul>`;

  function sendMsg(msg) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(msg, (result) => {
        void chrome.runtime.lastError;
        resolve(result ?? null);
      });
    });
  }

  async function refresh() {
    if (!tabId) { return; }
    const data = await sendMsg({ type: 'get_scriptspy', tabId });
    if (!data) { return; }

    const pageHost = data.pageUrl
      ? (() => { try { return new URL(data.pageUrl).hostname; } catch { return data.pageUrl; } })()
      : '—';
    container.querySelector('.spy-page').textContent = pageHost;

    const summaryArea = container.querySelector('#spy-summary-area');
    const list = container.querySelector('.script-list');

    if (data.scripts.length) {
      summaryArea.innerHTML = renderSummary(data.scripts);
      list.innerHTML = data.scripts.map(renderScript).join('');
    } else {
      summaryArea.innerHTML = '';
      list.innerHTML = '<li><p class="loading">Sin datos. Navega en la página activa, activa ScriptSpy y pulsa Actualizar.</p></li>';
    }
  }

  container.querySelector('#btn-spy-refresh').addEventListener('click', refresh);

  container.querySelector('#btn-spy-inject').addEventListener('click', async () => {
    if (!tabId) { return; }
    const btn = container.querySelector('#btn-spy-inject');
    btn.disabled = true;
    btn.textContent = 'Inyectando…';
    const res = await sendMsg({ type: 'inject_scriptspy', tabId });
    if (res?.ok) {
      btn.textContent = 'ScriptSpy activo ✓';
      setTimeout(refresh, 600);
    } else {
      btn.disabled = false;
      btn.textContent = 'Activar ScriptSpy';
      const list = container.querySelector('.script-list');
      list.innerHTML = `<li><p class="error">${res?.reason ?? 'Error al inyectar.'}</p></li>`;
    }
  });

  refresh();
}
