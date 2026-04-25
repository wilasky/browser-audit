import { renderHealthOverview } from './views/health-overview.js';
import { renderScriptSpyLive } from './views/scriptspy-live.js';
import { renderCompliance } from './views/compliance.js';
import { renderSettings } from './views/settings.js';
import { renderOnboarding, shouldShowOnboarding } from './views/onboarding.js';
import { renderFingerprintDetail } from './views/fingerprint-detail.js';

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
    const { calculateFingerprintDetail } = await import('../shared/fingerprint.js');
    const detail = await calculateFingerprintDetail();
    await chrome.storage.local.set({
      fingerprintEntropy: detail.totalEntropy,
      canvasBlocked: detail.canvasBlocked,
    });
  } catch {
    // Non-fatal
  }

  root.innerHTML = '<p class="loading">Cargando auditoría…</p>';
  const audit = await sendMsg({ type: 'get_audit' });

  if (audit) {
    renderHealthOverview(audit, root);
    // Wire fingerprint detail view — fires when user clicks on that check
    root.addEventListener('open-fingerprint', () => {
      renderFingerprintDetail(root).catch(console.error);
      root.addEventListener('fp-back', () => loadHealthView().catch(console.error), { once: true });
    }, { once: true });
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
  } else if (view === 'compliance') {
    renderCompliance(root).catch(console.error);
  } else if (view === 'settings') {
    renderSettings(root).catch(console.error);
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
