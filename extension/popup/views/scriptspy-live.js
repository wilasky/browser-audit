const RISK_LABEL = (s) => s >= 70 ? ['ALTO', 'risk-high'] : s >= 35 ? ['MEDIO', 'risk-med'] : ['BAJO', 'risk-low'];

const EVENT_LABELS = {
  fetch: 'Fetch', xhr: 'XHR', beacon: 'Beacon', websocket: 'WebSocket',
  'cookie-read': 'Cookie R', 'cookie-write': 'Cookie W',
  'storage-read': 'Storage R', 'storage-write': 'Storage W',
  listen: 'Input listener', 'mouse-listen': 'Mouse listener', 'read-input': 'Form read',
  'fp-canvas': 'Canvas FP', 'fp-audio': 'Audio FP', 'fp-webgl': 'WebGL FP',
  'fp-navigator': 'Navigator FP', 'fp-screen': 'Screen FP', 'fp-fonts': 'Fonts FP',
  'fp-battery': 'Battery FP', 'script-inject': 'Script inject', 'page-start': 'Page',
};

function shortUrl(url) {
  if (url === 'inline') { return 'inline'; }
  try {
    const u = new URL(url);
    return u.hostname + (u.pathname !== '/' ? u.pathname.slice(0, 30) : '');
  } catch {
    return url.slice(0, 40);
  }
}

function renderScript(s) {
  const [riskText, riskCls] = RISK_LABEL(s.riskScore);
  const thirdPartyBadge = s.isThirdParty ? '<span class="badge badge-3p">3rd party</span>' : '';
  const tieBadge = s.threatIntelMatch ? '<span class="badge badge-threat">⚠ THREAT</span>' : '';

  const events = Object.entries(s.eventCounts)
    .filter(([, n]) => n > 0)
    .map(([type, n]) => `<span class="evt-chip">${EVENT_LABELS[type] ?? type} ×${n}</span>`)
    .join('');

  const targets = s.targetsContacted.length
    ? `<div class="script-targets">→ ${s.targetsContacted.join(', ')}</div>`
    : '';

  return `
    <li class="script-item">
      <div class="script-header">
        <span class="script-url" title="${s.url}">${shortUrl(s.url)}</span>
        ${thirdPartyBadge}${tieBadge}
        <span class="risk-pill ${riskCls}">${s.riskScore} ${riskText}</span>
      </div>
      <div class="script-events">${events}</div>
      ${targets}
    </li>`;
}

function renderEmpty() {
  return `<p class="loading">No hay datos aún. Navega en la pestaña activa y pulsa Actualizar.</p>`;
}

function renderData(data, container) {
  const { scripts, pageUrl } = data;
  const pageHost = pageUrl ? (() => { try { return new URL(pageUrl).hostname; } catch (_) { return pageUrl; } })() : '—';

  container.querySelector('.spy-page').textContent = pageHost;

  const list = container.querySelector('.script-list');
  list.innerHTML = scripts.length
    ? scripts.map(renderScript).join('')
    : renderEmpty();
}

export function renderScriptSpyLive(container) {
  container.innerHTML = `
    <div class="spy-toolbar">
      <span class="spy-label">Página: <strong class="spy-page">—</strong></span>
      <button id="btn-spy-refresh" class="btn-secondary">Actualizar</button>
      <button id="btn-spy-inject" class="btn-primary">Activar ScriptSpy</button>
    </div>
    <ul class="script-list"></ul>`;

  function refresh() {
    chrome.runtime.sendMessage({ type: 'get_scriptspy' }, (data) => {
      if (data) { renderData(data, container); }
    });
  }

  container.querySelector('#btn-spy-refresh').addEventListener('click', refresh);

  container.querySelector('#btn-spy-inject').addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'inject_scriptspy' }, () => {
      setTimeout(refresh, 800); // give instrumentation time to emit page-start
    });
  });

  refresh();
}
