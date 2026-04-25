function sendMsg(msg) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(msg, (result) => {
      void chrome.runtime.lastError;
      resolve(result ?? null);
    });
  });
}

const FREE_FEATURES = [
  'Browser Health Check completo (16 chequeos)',
  'ScriptSpy: detección local de trackers',
  'Score de seguridad en tiempo real',
  'Botones de arreglo directos a settings de Chrome',
];

const PRO_FEATURES = [
  'Todo lo anterior, sin límites',
  'Threat intelligence en tiempo real (URLhaus, MalwareBazaar, PhishTank)',
  'Hash check de scripts (SHA256)',
  'Blacklist enriquecida de extensiones (CRXcavator)',
  'Export PDF/JSON de auditorías',
  'Histórico 90 días',
  'Reglas YARA en navegador',
];

export async function renderUpgrade(container) {
  const plan = await sendMsg({ type: 'get_plan' });
  const isPro = plan?.isPro ?? false;
  const isDevMode = plan?.devMode ?? false;

  const proStatus = isPro
    ? `<div class="plan-badge plan-pro">Plan PRO ${isDevMode ? '(dev)' : '✓'}</div>`
    : `<div class="plan-badge plan-free">Plan FREE</div>`;

  const freeList = FREE_FEATURES.map((f) => `<li>✓ ${f}</li>`).join('');
  const proList = PRO_FEATURES.map((f) => `<li>✦ ${f}</li>`).join('');

  container.innerHTML = `
    <div class="upgrade-wrap">
      <div class="upgrade-header">
        <h2 class="upgrade-title">Browser Audit</h2>
        ${proStatus}
      </div>

      <div class="plan-cols">
        <div class="plan-col plan-col-free">
          <div class="plan-col-head">Free</div>
          <ul class="plan-list">${freeList}</ul>
          <div class="plan-price">Gratis</div>
        </div>
        <div class="plan-col plan-col-pro ${isPro ? 'active' : ''}">
          <div class="plan-col-head">Pro ✦</div>
          <ul class="plan-list">${proList}</ul>
          <div class="plan-price">€15/mes · €120/año</div>
          ${!isPro ? `<button id="btn-upgrade" class="btn-primary">Activar Pro →</button>` : ''}
        </div>
      </div>

      <div class="plan-actions">
        ${isPro
          ? `<button id="btn-downgrade" class="btn-secondary">Volver a Free</button>`
          : ''}
        <button id="btn-dev-toggle" class="btn-dev">
          ${isPro ? 'Desactivar Pro (dev)' : 'Simular Pro (dev)'}
        </button>
      </div>

      <p class="plan-note">
        Los pagos se gestionan via ExtensionPay. Tu privacidad está protegida —
        solo se envían hashes anónimos al servidor Pro.
      </p>
    </div>`;

  container.querySelector('#btn-dev-toggle')?.addEventListener('click', async () => {
    const res = await sendMsg({ type: 'dev_toggle_pro' });
    if (res) { renderUpgrade(container); }
  });

  container.querySelector('#btn-upgrade')?.addEventListener('click', () => {
    // Phase 8: replace with ExtPay.openPaymentPage()
    chrome.tabs.create({ url: 'https://extensionpay.com' });
  });

  container.querySelector('#btn-downgrade')?.addEventListener('click', async () => {
    await sendMsg({ type: 'reset_plan' });
    renderUpgrade(container);
  });
}
