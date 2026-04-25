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

const LEGEND_ITEMS = [
  { section: 'Origen', items: [
    ['1st party', 'Script del mismo dominio que la página'],
    ['3rd party', 'Script externo — puede rastrearte entre sitios'],
  ]},
  { section: 'Riesgo', items: [
    ['ALTO ≥70', 'Comportamiento muy sospechoso'],
    ['MEDIO ≥35', 'Actividad que merece atención'],
    ['BAJO <35', 'Sin señales de alerta'],
  ]},
  { section: 'Red', items: [
    ['Fetch / XHR', 'Petición HTTP enviada por el script'],
    ['Beacon', 'Envío silencioso de datos al servidor (no espera respuesta)'],
    ['WebSocket', 'Conexión persistente bidireccional'],
    ['→ dominio', 'Destinos de red contactados'],
  ]},
  { section: 'Almacenamiento', items: [
    ['Cookie R/W', 'Lectura / escritura de cookies'],
    ['Storage R/W', 'Lectura / escritura de localStorage o sessionStorage'],
  ]},
  { section: 'Inputs', items: [
    ['Input listener', 'El script escucha eventos de teclado o formulario'],
    ['Mouse', 'El script sigue el movimiento del ratón o clicks'],
    ['Form read', 'El script leyó el contenido de un formulario (FormData)'],
    ['Script inject', 'El script inyectó dinámicamente otro script en la página'],
  ]},
  { section: 'Fingerprinting (FP)', items: [
    ['Canvas FP', 'Lee el renderizado del canvas para identificar la GPU/fuentes'],
    ['Audio FP', 'Mide el procesado de audio para obtener un identificador único'],
    ['WebGL FP', 'Lee parámetros de la GPU via WebGL'],
    ['Navigator FP', 'Lee userAgent, idioma, CPU, memoria del dispositivo'],
    ['Screen FP', 'Lee resolución y profundidad de color de la pantalla'],
    ['Fonts FP', 'Detecta las fuentes instaladas en el sistema'],
    ['Battery FP', 'Lee el estado de la batería (identificador muy preciso)'],
  ]},
];

function renderLegend() {
  const sections = LEGEND_ITEMS.map(({ section, items }) => {
    const rows = items.map(([term, def]) =>
      `<tr><td class="leg-term">${term}</td><td class="leg-def">${def}</td></tr>`
    ).join('');
    return `<tr class="leg-section-row"><td colspan="2" class="leg-section">${section}</td></tr>${rows}`;
  }).join('');

  return `
    <details class="legend-wrap">
      <summary class="legend-toggle">? Leyenda de términos</summary>
      <table class="legend-table">${sections}</table>
    </details>`;
}

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

function renderScript(s, idx) {
  const [riskText, riskCls] = RISK_LABEL(s.riskScore);
  const isInline = s.url === 'inline';
  const thirdPartyBadge = s.isThirdParty
    ? '<span class="badge badge-3p">3rd party</span>'
    : '<span class="badge badge-1p">1st party</span>';

  let tieBadge = '';
  if (s.threatIntelMatch) {
    const label = s.threatIntelSource === 'demo'
      ? '⚠ TRACKER (demo TI)'
      : `⚠ THREAT · ${s.threatIntelSource ?? 'TI'}`;
    const cls = s.threatIntelSource === 'demo' ? 'badge-threat-demo' : 'badge-threat';
    tieBadge = `<span class="badge ${cls}">${label}</span>`;
  }

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

  const viewBtn = !isInline
    ? `<button class="view-script-btn" data-script-idx="${idx}">Ver script ↗</button>`
    : '';

  return `
    <li class="script-item">
      <div class="script-header">
        <span class="script-url" title="${s.url}">${shortUrl(s.url)}</span>
        ${thirdPartyBadge}${tieBadge}
        <span class="risk-pill ${riskCls}">${s.riskScore} ${riskText}</span>
      </div>
      <div class="risk-reason">${riskExplanation(s)}</div>
      ${netEvents || fpEvents || otherEvents
        ? `<div class="script-events">${netEvents}${fpEvents}${otherEvents}</div>`
        : ''}
      ${targets}
      ${viewBtn}
    </li>`;
}

function renderSummary(scripts) {
  const total = scripts.length;
  const high = scripts.filter((s) => s.riskScore >= 70).length;
  const med = scripts.filter((s) => s.riskScore >= 35 && s.riskScore < 70).length;
  const thirdParty = scripts.filter((s) => s.isThirdParty).length;
  const totalEvents = scripts.reduce(
    (acc, s) => acc + Object.values(s.eventCounts).reduce((a, b) => a + b, 0), 0
  );

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

async function getPlan() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: 'get_plan' }, (r) => { void chrome.runtime.lastError; resolve(r ?? {}); });
  });
}

export async function renderScriptSpyLive(container) {
  const [tabId, plan] = await Promise.all([getActiveTabId(), getPlan()]);
  const isPro = plan?.isPro ?? false;
  const isDevMode = plan?.devMode ?? false;

  const proBanner = isPro
    ? `<div class="spy-pro-banner ${isDevMode ? 'spy-pro-demo' : ''}">
        ✦ Threat Intelligence ${isDevMode ? 'activa (modo demo — backend no conectado)' : 'activa'}
        <span class="spy-pro-sources">URLhaus · MalwareBazaar · OpenPhish</span>
       </div>`
    : `<div class="spy-locked-banner">
        🔒 Threat Intelligence requiere Pro ✦ —
        <button class="link-btn" id="btn-go-pro">Ver plan</button>
       </div>`;

  container.innerHTML = `
    <div class="spy-toolbar">
      <span class="spy-label">Página: <strong class="spy-page">—</strong></span>
      <button id="btn-spy-refresh" class="btn-secondary">Actualizar</button>
      <button id="btn-spy-inject" class="btn-primary">Activar ScriptSpy</button>
    </div>
    ${proBanner}
    <div id="spy-summary-area"></div>
    ${renderLegend()}
    <ul class="script-list"></ul>`;

  let currentScripts = [];

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

    currentScripts = data.scripts;

    const pageHost = data.pageUrl
      ? (() => { try { return new URL(data.pageUrl).hostname; } catch { return data.pageUrl; } })()
      : '—';
    container.querySelector('.spy-page').textContent = pageHost;

    const summaryArea = container.querySelector('#spy-summary-area');
    const list = container.querySelector('.script-list');

    if (data.scripts.length) {
      summaryArea.innerHTML = renderSummary(data.scripts);
      list.innerHTML = data.scripts.map((s, i) => renderScript(s, i)).join('');

      // Wire up "Ver script" buttons
      list.querySelectorAll('.view-script-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          const s = currentScripts[parseInt(btn.dataset.scriptIdx, 10)];
          if (s?.url && s.url !== 'inline') {
            chrome.tabs.create({ url: s.url });
          }
        });
      });
    } else {
      summaryArea.innerHTML = '';
      list.innerHTML = '<li><p class="loading">Sin datos. Navega en la página activa, activa ScriptSpy y pulsa Actualizar.</p></li>';
    }
  }

  let autoRefreshTimer = null;

  function startAutoRefresh() {
    if (autoRefreshTimer) { return; }
    autoRefreshTimer = setInterval(refresh, 3000);
  }

  function stopAutoRefresh() {
    clearInterval(autoRefreshTimer);
    autoRefreshTimer = null;
  }

  // Stop auto-refresh when popup is closed
  window.addEventListener('unload', stopAutoRefresh);

  container.querySelector('#btn-go-pro')?.addEventListener('click', () => {
    // Switch to Pro tab
    document.querySelector('[data-view="pro"]')?.click();
  });

  container.querySelector('#btn-spy-refresh').addEventListener('click', refresh);

  container.querySelector('#btn-spy-inject').addEventListener('click', async () => {
    if (!tabId) { return; }
    const btn = container.querySelector('#btn-spy-inject');
    btn.disabled = true;
    btn.textContent = 'Inyectando…';
    const res = await sendMsg({ type: 'inject_scriptspy', tabId });
    if (res?.ok) {
      btn.textContent = 'ScriptSpy activo ✓';
      setTimeout(() => { refresh(); startAutoRefresh(); }, 600);
    } else {
      btn.disabled = false;
      btn.textContent = 'Activar ScriptSpy';
      const list = container.querySelector('.script-list');
      list.innerHTML = `<li><p class="error">${res?.reason ?? 'Error al inyectar.'}</p></li>`;
    }
  });

  refresh();
}
