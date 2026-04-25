function sendMsg(msg) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(msg, (result) => {
      void chrome.runtime.lastError;
      resolve(result ?? null);
    });
  });
}

const FREE_FEATURES = [
  { icon: '✓', text: 'Browser Health Check completo (16 chequeos)' },
  { icon: '✓', text: 'ScriptSpy: detección local de scripts y trackers' },
  { icon: '✓', text: 'Score de seguridad en tiempo real' },
  { icon: '✓', text: 'Export JSON y PDF de auditorías' },
  { icon: '✓', text: 'Sin cuenta ni registro' },
];

const PRO_FEATURES = [
  { icon: '✦', text: 'Threat intelligence en tiempo real', sub: 'URLhaus · MalwareBazaar · PhishTank · OpenPhish' },
  { icon: '✦', text: 'Detección de scripts maliciosos confirmados', sub: 'Cruza SHA256 de cada script con bases de datos de malware' },
  { icon: '✦', text: 'Blacklist enriquecida de extensiones', sub: 'CRXcavator + Spin.AI + reportes de Google' },
  { icon: '✦', text: 'Reglas YARA en el navegador', sub: 'Detecta cryptominers, skimmers, stealers por patrón de código' },
  { icon: '✦', text: 'Histórico 90 días', sub: 'Evolución del score y alertas a lo largo del tiempo' },
];

function renderDemoTI() {
  return `
    <div class="ti-demo">
      <div class="ti-demo-title">⚠ Así se ve Threat Intelligence en acción:</div>
      <div class="ti-demo-item">
        <span class="ti-demo-badge">URLhaus</span>
        <span class="ti-script">cdn.malware-example.com/loader.js</span>
        <span class="ti-verdict ti-critical">MALICIOSO CONFIRMADO</span>
      </div>
      <div class="ti-demo-item">
        <span class="ti-demo-badge">MalwareBazaar</span>
        <span class="ti-script">static.skimmer-js.io/checkout.min.js</span>
        <span class="ti-verdict ti-critical">SKIMMER DETECTADO</span>
      </div>
      <div class="ti-demo-item">
        <span class="ti-demo-badge">OpenPhish</span>
        <span class="ti-script">→ login.banco-falso.net</span>
        <span class="ti-verdict ti-high">PHISHING</span>
      </div>
      <div class="ti-demo-note">Ejemplo ilustrativo · Los datos reales vienen de feeds actualizados cada hora</div>
    </div>`;
}

export async function renderUpgrade(container) {
  const plan = await sendMsg({ type: 'get_plan' });
  const isPro = plan?.isPro ?? false;
  const isDevMode = plan?.devMode ?? false;

  const badge = isPro
    ? `<span class="plan-badge plan-pro">Plan PRO${isDevMode ? ' (demo)' : ' ✓'}</span>`
    : `<span class="plan-badge plan-free">Plan FREE</span>`;

  const freeList = FREE_FEATURES.map((f) =>
    `<li><span class="feat-icon feat-free">${f.icon}</span>${f.text}</li>`
  ).join('');

  const proList = PRO_FEATURES.map((f) =>
    `<li>
      <span class="feat-icon feat-pro">${f.icon}</span>
      <span class="feat-text">${f.text}${f.sub ? `<br><span class="feat-sub">${f.sub}</span>` : ''}</span>
    </li>`
  ).join('');

  container.innerHTML = `
    <div class="upgrade-wrap">
      <div class="upgrade-header">
        <div>
          <h2 class="upgrade-title">Browser Audit</h2>
          <p class="upgrade-sub">Seguridad y privacidad que puedes ver</p>
        </div>
        ${badge}
      </div>

      <div class="plan-cols">
        <div class="plan-col">
          <div class="plan-col-head">Free</div>
          <ul class="plan-list">${freeList}</ul>
          <div class="plan-price-tag">Gratis · siempre</div>
        </div>

        <div class="plan-col plan-col-pro ${isPro ? 'active' : ''}">
          <div class="plan-col-head">Pro ✦</div>
          <ul class="plan-list">${proList}</ul>
          <div class="plan-price-tag">
            <strong>€5/mes</strong> · €40/año
            <span class="plan-launch-badge">Precio de lanzamiento</span>
          </div>
          ${!isPro ? `<button id="btn-upgrade" class="btn-primary">Activar Pro →</button>` : ''}
        </div>
      </div>

      ${renderDemoTI()}

      <div class="plan-actions">
        ${isPro
          ? `<button id="btn-downgrade" class="btn-secondary">Volver a Free</button>`
          : ''}
        <button id="btn-dev-toggle" class="btn-dev" title="Simula Pro para ver la UI sin pagar">
          ${isPro ? '⬛ Desactivar demo Pro' : '▶ Probar Pro (demo)'}
        </button>
      </div>

      <p class="plan-privacy-note">
        🔒 Privacidad garantizada — el servidor Pro solo recibe hashes SHA256,
        nunca URLs ni datos personales.
        <a href="#" id="link-privacy">Ver política</a>
      </p>
    </div>`;

  container.querySelector('#btn-dev-toggle')?.addEventListener('click', async () => {
    await sendMsg({ type: 'dev_toggle_pro' });
    renderUpgrade(container);
  });

  container.querySelector('#btn-upgrade')?.addEventListener('click', () => {
    chrome.tabs.create({ url: 'https://extensionpay.com' });
  });

  container.querySelector('#btn-downgrade')?.addEventListener('click', async () => {
    await sendMsg({ type: 'reset_plan' });
    renderUpgrade(container);
  });

  container.querySelector('#link-privacy')?.addEventListener('click', (e) => {
    e.preventDefault();
    chrome.tabs.create({ url: 'https://github.com/wilasky/browser-audit/blob/main/docs/PRIVACY_POLICY.md' });
  });
}
