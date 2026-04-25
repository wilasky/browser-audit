import { esc } from '../../shared/sanitize.js';

function sendMsg(msg) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(msg, (result) => {
      void chrome.runtime.lastError;
      resolve(result ?? null);
    });
  });
}

function renderHistory(history) {
  if (!history.length) { return '<p class="loading">Sin historial todavía.</p>'; }

  const bars = history.slice(0, 10).map((h) => {
    const color = h.level === 'green' ? '#22c55e' : h.level === 'amber' ? '#f59e0b' : '#ef4444';
    const date = new Date(h.completedAt).toLocaleDateString('es', { month: 'short', day: 'numeric' });
    return `
      <div class="hist-bar-wrap" title="${date}: ${h.score} — ${h.label}">
        <div class="hist-bar" style="height:${h.score}%;background:${color}"></div>
        <div class="hist-score" style="color:${color}">${h.score}</div>
      </div>`;
  }).join('');

  return `<div class="hist-chart">${bars}</div>`;
}

export async function renderSettings(container) {
  const [plan, history] = await Promise.all([
    sendMsg({ type: 'get_plan' }),
    sendMsg({ type: 'get_history' }),
  ]);

  const storedKey = await chrome.storage.local.get('proApiKey').then((s) => s.proApiKey ?? '');

  container.innerHTML = `
    <div class="settings-wrap">
      <section class="settings-section">
        <h3 class="settings-heading">Historial de score</h3>
        ${renderHistory(history ?? [])}
      </section>

      <section class="settings-section">
        <h3 class="settings-heading">API Key Pro · Threat Intelligence</h3>

        <div class="api-info-box">
          <p class="settings-hint">
            La API Key conecta tu extensión con <strong>nuestro backend de threat intelligence</strong>
            (api.browseraudit.com). Permite verificar en tiempo real si los scripts y dominios
            que ves están en bases de datos de malware: URLhaus, MalwareBazaar, OpenPhish y
            extensiones blacklisteadas.
          </p>
          <p class="settings-hint" style="margin-top:6px">
            <strong>¿Qué se envía?</strong> Solo hashes SHA256. Nunca URLs ni datos personales.
          </p>
          <p class="settings-hint" style="margin-top:6px">
            <strong>¿Cómo conseguirla?</strong> Activa Pro en la pestaña ✦ y recibirás tu key por email.
            Para probar sin cuenta, usa el modo demo (gratis, datos simulados).
          </p>
        </div>

        <div class="api-key-row">
          <input id="input-api-key" type="password" class="api-key-input"
            placeholder="Pega tu API key cuando la tengas" />
          <button id="btn-save-key" class="btn-secondary">Guardar</button>
        </div>
        <p id="key-status" class="settings-hint"></p>
      </section>

      <section class="settings-section">
        <h3 class="settings-heading">Plan actual</h3>
        <p class="settings-hint">
          ${plan?.isPro
            ? `Plan <strong>PRO</strong>${plan.devMode ? ' (modo dev)' : ''} · ${esc(plan.email ?? '')}`
            : 'Plan <strong>FREE</strong> — activa Pro en la pestaña Pro ✦'}
        </p>
      </section>

      <section class="settings-section">
        <h3 class="settings-heading">Acerca de</h3>
        <p class="settings-hint">Browser Audit v0.1 · Privacidad por diseño.<br>
        No se envían URLs ni datos personales al servidor.</p>
      </section>
    </div>`;

  // Set value via DOM (not innerHTML) to avoid XSS
  container.querySelector('#input-api-key').value = storedKey;

  container.querySelector('#btn-save-key').addEventListener('click', async () => {
    const key = container.querySelector('#input-api-key').value.trim();
    await chrome.storage.local.set({ proApiKey: key || null });
    container.querySelector('#key-status').textContent = key ? 'API key guardada.' : 'API key eliminada.';
    setTimeout(() => { container.querySelector('#key-status').textContent = ''; }, 2000);
  });
}
