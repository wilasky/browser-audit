import { renderHealthOverview } from './views/health-overview.js';

const root = document.getElementById('view-root');

async function init() {
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

init();
