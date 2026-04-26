import { esc } from '../../shared/sanitize.js';
import { t } from '../../shared/i18n.js';

const RISK_LABEL = (s) =>
  s >= 70 ? [t('risk.high'), 'risk-high'] : s >= 35 ? [t('risk.med'), 'risk-med'] : [t('risk.low'), 'risk-low'];

function evtLabel(type) {
  const map = {
    fetch: t('evt.fetch'), xhr: t('evt.xhr'), beacon: t('evt.beacon'), websocket: t('evt.websocket'),
    'cookie-read': t('evt.cookie_read'), 'cookie-write': t('evt.cookie_write'),
    'storage-read': t('evt.storage_read'), 'storage-write': t('evt.storage_write'),
    listen: t('evt.listen'), 'mouse-listen': t('evt.mouse_listen'), 'read-input': t('evt.read_input'),
    'fp-canvas': t('evt.fp_canvas'), 'fp-audio': t('evt.fp_audio'), 'fp-webgl': t('evt.fp_webgl'),
    'fp-navigator': t('evt.fp_navigator'), 'fp-screen': t('evt.fp_screen'), 'fp-fonts': t('evt.fp_fonts'),
    'fp-battery': t('evt.fp_battery'), 'script-inject': t('evt.script_inject'),
  };
  return map[type] ?? type;
}

const FP_TYPES = new Set(['fp-canvas', 'fp-audio', 'fp-webgl', 'fp-navigator', 'fp-screen', 'fp-fonts', 'fp-battery']);
const NET_TYPES = new Set(['fetch', 'xhr', 'beacon', 'websocket']);

function getLegendItems() {
  const isEs = t('btn.save') === 'Guardar';
  // Bilingual definitions — switch by detection of current language
  if (isEs) {
    return [
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
  }
  return [
    { section: 'Origin', items: [
      ['1st party', 'Script from same domain as the page'],
      ['3rd party', 'External script — can track you across sites'],
    ]},
    { section: 'Risk', items: [
      ['HIGH ≥70', 'Highly suspicious behavior'],
      ['MED ≥35', 'Activity that deserves attention'],
      ['LOW <35', 'No warning signs'],
    ]},
    { section: 'Network', items: [
      ['Fetch / XHR', 'HTTP request made by the script'],
      ['Beacon', 'Silent data send (no response expected)'],
      ['WebSocket', 'Persistent bidirectional connection'],
      ['→ domain', 'Network destinations contacted'],
    ]},
    { section: 'Storage', items: [
      ['Cookie R/W', 'Cookie read / write'],
      ['Storage R/W', 'localStorage or sessionStorage read / write'],
    ]},
    { section: 'Inputs', items: [
      ['Input listener', 'Script listens to keyboard or form events'],
      ['Mouse', 'Script tracks mouse movement or clicks'],
      ['Form read', 'Script read form content (FormData)'],
      ['Script inject', 'Script dynamically injected another script'],
    ]},
    { section: 'Fingerprinting (FP)', items: [
      ['Canvas FP', 'Reads canvas rendering to identify GPU/fonts'],
      ['Audio FP', 'Measures audio processing for unique identifier'],
      ['WebGL FP', 'Reads GPU parameters via WebGL'],
      ['Navigator FP', 'Reads userAgent, language, CPU, device memory'],
      ['Screen FP', 'Reads resolution and color depth'],
      ['Fonts FP', 'Detects installed system fonts'],
      ['Battery FP', 'Reads battery state (very precise identifier)'],
    ]},
  ];
}

function renderLegend() {
  const sections = getLegendItems().map(({ section, items }) => {
    const rows = items.map(([term, def]) =>
      `<tr><td class="leg-term">${esc(term)}</td><td class="leg-def">${esc(def)}</td></tr>`
    ).join('');
    return `<tr class="leg-section-row"><td colspan="2" class="leg-section">${esc(section)}</td></tr>${rows}`;
  }).join('');

  return `
    <details class="legend-wrap">
      <summary class="legend-toggle">${esc(t('spy.legend'))}</summary>
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
  const fpTotal = [...FP_TYPES].reduce((acc, type) => acc + (c[type] ?? 0), 0);
  if (fpTotal > 0) { reasons.push(t('risk.fp_techniques', { n: fpTotal })); }
  if ((c['beacon'] ?? 0) > 0) { reasons.push(t('risk.silent_beacon', { n: c['beacon'] })); }
  if ((c['mouse-listen'] ?? 0) > 0) { reasons.push(t('risk.mouse_tracking')); }
  if (s.isThirdParty && (c['read-input'] ?? 0) > 0) { reasons.push(t('risk.form_reading')); }
  if (s.targetsContacted.length > 2) { reasons.push(t('risk.targets', { n: s.targetsContacted.length })); }
  if (s.threatIntelMatch) { reasons.push(t('risk.threat_match')); }
  return reasons.length ? reasons.join(' · ') : t('risk.no_suspicious');
}

function buildLookupLinks(url) {
  if (!url || url === 'inline') { return ''; }
  let domain;
  try { domain = new URL(url).hostname; } catch { return ''; }

  // All endpoints search by domain — VT search by URL fails for script paths
  const vt = `https://www.virustotal.com/gui/domain/${encodeURIComponent(domain)}`;
  const us = `https://urlscan.io/domain/${encodeURIComponent(domain)}`;
  const uh = `https://urlhaus.abuse.ch/browse.php?search=${encodeURIComponent(domain)}`;
  const sb = `https://transparencyreport.google.com/safe-browsing/search?url=${encodeURIComponent(domain)}`;

  return `
    <div class="script-lookup">
      <span class="lookup-label">${esc(domain)}:</span>
      <a class="lookup-link" data-href="${esc(vt)}" title="VirusTotal — análisis multi-engine del dominio">VirusTotal</a>
      <a class="lookup-link" data-href="${esc(us)}" title="urlscan.io — historial de escaneos del dominio">urlscan</a>
      <a class="lookup-link" data-href="${esc(uh)}" title="URLhaus — base de datos de malware (abuse.ch)">URLhaus</a>
      <a class="lookup-link" data-href="${esc(sb)}" title="Google Safe Browsing — estado del dominio">Safe Browsing</a>
    </div>`;
}

function renderScript(s, idx) {
  const [riskText, riskCls] = RISK_LABEL(s.riskScore);
  const isInline = s.url === 'inline';
  const thirdPartyBadge = s.isThirdParty
    ? `<span class="badge badge-3p">${esc(t('badge.third_party'))}</span>`
    : `<span class="badge badge-1p">${esc(t('badge.first_party'))}</span>`;

  // Threat Intel badge (only shown when real backend confirms a match)
  const tieBadge = s.threatIntelMatch && s.threatIntelSource !== 'demo'
    ? `<span class="badge badge-threat">⚠ THREAT · ${esc(s.threatIntelSource ?? 'TI')}</span>`
    : '';

  const netEvents = Object.entries(s.eventCounts)
    .filter(([type, n]) => NET_TYPES.has(type) && n > 0)
    .map(([type, n]) => `<span class="evt-chip evt-net">${esc(evtLabel(type))} ×${n}</span>`)
    .join('');

  const fpEvents = Object.entries(s.eventCounts)
    .filter(([type, n]) => FP_TYPES.has(type) && n > 0)
    .map(([type, n]) => `<span class="evt-chip evt-fp">${esc(evtLabel(type))} ×${n}</span>`)
    .join('');

  const otherEvents = Object.entries(s.eventCounts)
    .filter(([type, n]) => !NET_TYPES.has(type) && !FP_TYPES.has(type) && type !== 'page-start' && n > 0)
    .map(([type, n]) => `<span class="evt-chip">${esc(evtLabel(type))} ×${n}</span>`)
    .join('');

  const targets = s.targetsContacted.length
    ? `<div class="script-targets"><span class="targets-label">→</span> ${s.targetsContacted.map(esc).join(', ')}</div>`
    : '';

  const viewBtn = !isInline
    ? `<button class="view-script-btn" data-script-idx="${idx}">${esc(t('spy.view_source'))}</button>
       <button class="analyze-script-btn" data-script-idx="${idx}">${esc(t('spy.deep_analysis'))}</button>`
    : '';

  const lookups = buildLookupLinks(s.url);

  return `
    <li class="script-item">
      <div class="script-header">
        <span class="script-url" title="${esc(s.url)}">${esc(shortUrl(s.url))}</span>
        ${thirdPartyBadge}${tieBadge}
        <span class="risk-pill ${riskCls}">${s.riskScore} ${esc(riskText)}</span>
      </div>
      <div class="risk-reason">${esc(riskExplanation(s))}</div>
      ${netEvents || fpEvents || otherEvents
        ? `<div class="script-events">${netEvents}${fpEvents}${otherEvents}</div>`
        : ''}
      ${targets}
      ${lookups}
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

function hasHostPermission() {
  return new Promise((resolve) => {
    chrome.permissions.contains({ origins: ['<all_urls>'] }, (has) => {
      void chrome.runtime.lastError;
      resolve(has);
    });
  });
}

function requestHostPermission() {
  return new Promise((resolve) => {
    chrome.permissions.request({ origins: ['<all_urls>'] }, (granted) => {
      void chrome.runtime.lastError;
      resolve(granted);
    });
  });
}

export async function renderScriptSpyLive(container) {
  const [tabId, hasHostPerm] = await Promise.all([
    getActiveTabId(),
    hasHostPermission(),
  ]);

  const hostBanner = !hasHostPerm
    ? `<div class="spy-host-banner">
        <span>${esc(t('spy.host_banner'))}</span>
        <button id="btn-grant-host" class="btn-primary btn-grant-host">${esc(t('spy.activate_host'))}</button>
       </div>`
    : '';

  container.innerHTML = `
    <div class="spy-toolbar">
      <span class="spy-label">${esc(t('spy.page'))}: <strong class="spy-page">—</strong></span>
      <button id="btn-spy-refresh" class="btn-secondary">${esc(t('spy.refresh'))}</button>
      <button id="btn-spy-inject" class="btn-primary">${esc(t('spy.activate'))}</button>
    </div>
    ${hostBanner}
    <div id="spy-summary-area"></div>
    ${renderLegend()}
    <ul class="script-list"></ul>`;

  container.querySelector('#btn-grant-host')?.addEventListener('click', async () => {
    const granted = await requestHostPermission();
    if (granted) {
      // Re-render to remove the banner
      renderScriptSpyLive(container).catch(console.error);
    }
  });

  let currentScripts = [];
  let autoRefreshTimer = null;

  function sendMsg(msg) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(msg, (result) => {
        void chrome.runtime.lastError;
        resolve(result ?? null);
      });
    });
  }

  function startAutoRefresh() {
    if (autoRefreshTimer) { return; }
    autoRefreshTimer = setInterval(refresh, 3000);
  }

  function stopAutoRefresh() {
    if (autoRefreshTimer) { clearInterval(autoRefreshTimer); autoRefreshTimer = null; }
  }

  let refreshInFlight = false;

  async function refresh() {
    if (!tabId || refreshInFlight) { return; }
    const pageEl = container.querySelector('.spy-page');
    if (!pageEl) { stopAutoRefresh(); return; }

    refreshInFlight = true;
    const refreshBtn = container.querySelector('#btn-spy-refresh');
    if (refreshBtn) { refreshBtn.textContent = '⌛'; }

    const data = await sendMsg({ type: 'get_scriptspy', tabId });
    refreshInFlight = false;
    if (refreshBtn && container.querySelector('#btn-spy-refresh')) {
      container.querySelector('#btn-spy-refresh').textContent = t('spy.refresh');
    }
    if (!data) { return; }

    // Re-check after async — the container may have been replaced during await
    if (!container.querySelector('.spy-page')) { stopAutoRefresh(); return; }

    currentScripts = data.scripts;

    if (data.pageUrl) {
      let host = data.pageUrl;
      let isHttps = false;
      let isSystem = false;
      try {
        const u = new URL(data.pageUrl);
        host = u.hostname || u.pathname;
        isHttps = u.protocol === 'https:';
        isSystem = ['chrome:', 'chrome-extension:', 'about:', 'edge:'].includes(u.protocol);
      } catch { /* keep raw */ }
      const lock = isSystem ? '⚙' : isHttps ? '🔒' : '⚠';
      pageEl.textContent = '';
      // Build interactive content: lock icon + hostname (clickable to open in new tab)
      const lockSpan = document.createElement('span');
      lockSpan.textContent = lock + ' ';
      lockSpan.title = isSystem ? 'Página del sistema'
        : isHttps ? 'Conexión HTTPS segura'
        : 'Conexión HTTP sin cifrar';
      pageEl.appendChild(lockSpan);
      const link = document.createElement('a');
      link.textContent = host;
      link.href = '#';
      link.style.color = 'inherit';
      link.style.textDecoration = 'underline';
      link.style.cursor = 'pointer';
      link.title = (data.pageTitle || data.pageUrl).slice(0, 200);
      link.addEventListener('click', (e) => {
        e.preventDefault();
        chrome.tabs.create({ url: data.pageUrl });
      });
      pageEl.appendChild(link);
    } else {
      pageEl.textContent = '—';
    }

    const summaryArea = container.querySelector('#spy-summary-area');
    const list = container.querySelector('.script-list');
    if (!summaryArea || !list) { stopAutoRefresh(); return; }

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

      // External lookup links (VirusTotal, urlscan, URLhaus, Safe Browsing)
      list.querySelectorAll('.lookup-link').forEach((a) => {
        a.addEventListener('click', (e) => {
          e.preventDefault();
          const href = a.dataset.href;
          if (href) { chrome.tabs.create({ url: href }); }
        });
      });

      // Deep analysis button — fires event for popup.js to switch view
      list.querySelectorAll('.analyze-script-btn').forEach((btn) => {
        btn.addEventListener('click', async () => {
          const s = currentScripts[parseInt(btn.dataset.scriptIdx, 10)];
          if (!s?.url || s.url === 'inline') { return; }

          // Ask for permission first if not granted (avoids a frustrating error inside detail view)
          const has = await hasHostPermission();
          if (!has) {
            const granted = await requestHostPermission();
            if (!granted) {
              alert(t('spy.no_perm_alert'));
              return;
            }
          }

          stopAutoRefresh();
          container.dispatchEvent(new CustomEvent('open-script-detail', {
            bubbles: true,
            detail: s,
          }));
        });
      });
    } else {
      summaryArea.innerHTML = '';
      list.innerHTML = `<li><p class="loading">${esc(t('spy.no_data'))}</p></li>`;
    }
  }

  // Stop auto-refresh when popup is closed
  window.addEventListener('unload', stopAutoRefresh);

  container.querySelector('#btn-spy-refresh').addEventListener('click', refresh);

  // Persist active state per tab so ScriptSpy stays "active" even when
  // the popup closes / reopens. Use local storage (more compatible than session).
  const stateKey = `scriptspyActive_${tabId}`;
  const stored = await chrome.storage.local.get(stateKey).catch(() => ({}));
  const wasActive = !!stored[stateKey];

  if (wasActive) {
    const btn = container.querySelector('#btn-spy-inject');
    btn.textContent = t('spy.active');
    btn.disabled = true;
    refresh();
    startAutoRefresh();
  }

  container.querySelector('#btn-spy-inject').addEventListener('click', async () => {
    if (!tabId) { return; }
    const btn = container.querySelector('#btn-spy-inject');
    btn.disabled = true;
    btn.textContent = t('spy.activating');
    const res = await sendMsg({ type: 'inject_scriptspy', tabId });
    if (res?.ok) {
      btn.textContent = t('spy.active');
      await chrome.storage.local.set({ [stateKey]: Date.now() }).catch(() => {});
      setTimeout(() => { refresh(); startAutoRefresh(); }, 600);
    } else {
      btn.disabled = false;
      btn.textContent = t('spy.activate');
      const list = container.querySelector('.script-list');
      const li = document.createElement('li');
      const p = document.createElement('p');
      p.className = 'error';
      p.textContent = res?.reason ?? t('spy.error_inject');
      li.appendChild(p);
      list.replaceChildren(li);
    }
  });

  refresh();
}
