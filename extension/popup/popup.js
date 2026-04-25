import { renderHealthOverview } from './views/health-overview.js';
import { renderScriptSpyLive } from './views/scriptspy-live.js';

// Wraps sendMessage and silences lastError so Chrome doesn't log it as unchecked
function sendMsg(msg) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(msg, (result) => {
      void chrome.runtime.lastError; // mark as checked
      resolve(result ?? null);
    });
  });
}

const root = document.getElementById('view-root');
const tabs = document.querySelectorAll('.tab-btn');

function setView(view) {
  tabs.forEach((t) => t.classList.toggle('active', t.dataset.view === view));

  if (view === 'health') {
    loadHealthView().catch(console.error);
  } else {
    renderScriptSpyLive(root).catch(console.error);
  }
}

async function loadHealthView() {
  root.innerHTML = '<p class="loading">Cargando auditoría…</p>';

  const audit = await sendMsg({ type: 'get_audit' });

  if (audit) {
    renderHealthOverview(audit, root);
  } else {
    root.innerHTML = '<p class="loading">Ejecutando primera auditoría…</p>';
    const freshAudit = await sendMsg({ type: 'run_audit' });
    if (freshAudit) {
      renderHealthOverview(freshAudit, root);
    } else {
      root.innerHTML = '<p class="error">No se pudo completar la auditoría.</p>';
    }
  }
}

tabs.forEach((btn) => {
  btn.addEventListener('click', () => setView(btn.dataset.view));
});

setView('health');
