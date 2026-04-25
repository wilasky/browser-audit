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
  const thirdPartyBadge = s.isThirdParty ? '<span class="badge badge-3p">3rd</span>' : '';
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
    const list = container.querySelector('.script-list');
    list.innerHTML = data.scripts.length
      ? data.scripts.map(renderScript).join('')
      : '<li><p class="loading">Sin datos. Pulsa Activar ScriptSpy y luego Actualizar.</p></li>';
  }

  container.querySelector('#btn-spy-refresh').addEventListener('click', refresh);

  container.querySelector('#btn-spy-inject').addEventListener('click', async () => {
    if (!tabId) { return; }
    const btn = container.querySelector('#btn-spy-inject');
    btn.disabled = true;
    btn.textContent = 'Inyectando…';
    const res = await sendMsg({ type: 'inject_scriptspy', tabId });
    btn.textContent = res?.ok ? 'ScriptSpy activo' : 'Error al inyectar';
    if (res?.ok) { setTimeout(refresh, 600); }
  });

  refresh();
}
