import { renderHealthOverview } from './views/health-overview.js';
import { renderScriptSpyLive } from './views/scriptspy-live.js';

const root = document.getElementById('view-root');
const tabs = document.querySelectorAll('.tab-btn');

function setView(view) {
  tabs.forEach((t) => t.classList.toggle('active', t.dataset.view === view));

  if (view === 'health') {
    loadHealthView();
  } else {
    renderScriptSpyLive(root);
  }
}

async function loadHealthView() {
  root.innerHTML = '<p class="loading">Cargando auditoría…</p>';

  const audit = await new Promise((resolve) =>
    chrome.runtime.sendMessage({ type: 'get_audit' }, resolve)
  );

  if (audit) {
    renderHealthOverview(audit, root);
  } else {
    root.innerHTML = '<p class="loading">Ejecutando primera auditoría…</p>';
    chrome.runtime.sendMessage({ type: 'run_audit' }, (freshAudit) => {
      if (freshAudit) {
        renderHealthOverview(freshAudit, root);
      } else {
        root.innerHTML = '<p class="error">No se pudo completar la auditoría.</p>';
      }
    });
  }
}

tabs.forEach((btn) => {
  btn.addEventListener('click', () => setView(btn.dataset.view));
});

setView('health');
