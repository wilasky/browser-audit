import { renderHealthOverview } from './views/health-overview.js';
import { renderScriptSpyLive } from './views/scriptspy-live.js';
import { renderUpgrade } from './views/upgrade.js';
import { renderOnboarding, shouldShowOnboarding } from './views/onboarding.js';
import { calculateFingerprintEntropy } from '../shared/fingerprint.js';

const root = document.getElementById('view-root');
const tabs = document.querySelectorAll('.tab-btn');

function sendMsg(msg) {
  return new Promise((resolve) => {
    try {
      chrome.runtime.sendMessage(msg, (result) => {
        void chrome.runtime.lastError;
        resolve(result ?? null);
      });
    } catch (err) {
      if (err.message?.includes('Extension context invalidated')) {
        root.innerHTML = '<p class="error">Extensión recargada. Cierra y vuelve a abrir el popup.</p>';
      }
      resolve(null);
    }
  });
}

function setActiveTab(view) {
  tabs.forEach((t) => t.classList.toggle('active', t.dataset.view === view));
}

async function loadHealthView() {
  root.innerHTML = '<p class="loading">Calculando huella digital…</p>';

  try {
    const bits = await calculateFingerprintEntropy();
    await chrome.storage.local.set({ fingerprintEntropy: bits });
  } catch {
    // Non-fatal
  }

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

function setView(view) {
  setActiveTab(view);
  if (view === 'health') {
    loadHealthView().catch(console.error);
  } else if (view === 'scriptspy') {
    renderScriptSpyLive(root).catch(console.error);
  } else if (view === 'pro') {
    renderUpgrade(root).catch(console.error);
  }
}

tabs.forEach((btn) => {
  btn.addEventListener('click', () => setView(btn.dataset.view));
});

// Boot: show onboarding on first install, otherwise load health view
async function boot() {
  const showOnboarding = await shouldShowOnboarding();
  if (showOnboarding) {
    setActiveTab('health');
    renderOnboarding(root, () => {
      setView('health');
    });
  } else {
    setView('health');
  }
}

boot().catch(console.error);
