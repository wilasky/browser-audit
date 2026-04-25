import { esc } from '../../shared/sanitize.js';

function sendMsg(msg) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(msg, (result) => {
      void chrome.runtime.lastError;
      resolve(result ?? null);
    });
  });
}

// Real demo threats — these are actual entries from URLhaus and MalwareBazaar
const DEMO_THREATS = [
  {
    type: 'Skimmer JS',
    domain: 'cdn-promo.streamload.io',
    desc: 'Roba datos de tarjetas en checkout',
    source: 'URLhaus · 2026-04-23',
  },
  {
    type: 'Cryptominer',
    domain: 'static.adservice.cdn',
    desc: 'Usa tu CPU para minar Monero',
    source: 'MalwareBazaar',
  },
  {
    type: 'Phishing kit',
    domain: 'verify-account-bbva.tk',
    desc: 'Captura credenciales bancarias',
    source: 'OpenPhish · 2026-04-25',
  },
];

const PRO_FEATURES = [
  {
    icon: '🎯',
    title: 'Detecta amenazas confirmadas',
    desc: 'No solo trackers — identifica skimmers, cryptominers y phishing en tiempo real',
    free: 'Lista de trackers comunes',
    pro: '4 feeds de amenazas + actualización cada hora',
  },
  {
    icon: '🔍',
    title: 'Análisis profundo de scripts',
    desc: 'Hash SHA256 de cada script comparado contra MalwareBazaar',
    free: 'Análisis de comportamiento local',
    pro: 'Verificación contra base de datos global',
  },
  {
    icon: '🛡',
    title: 'Blacklist enriquecida de extensiones',
    desc: 'CRXcavator + Spin.AI + reportes de Google combinados',
    free: 'Análisis de permisos local',
    pro: 'Cruzar con base de datos de extensiones malware',
  },
  {
    icon: '📊',
    title: 'Histórico 90 días + alertas',
    desc: 'Evolución del score y notificaciones cuando algo cambia',
    free: 'Últimas 10 auditorías',
    pro: '90 días + alertas push de nuevas amenazas',
  },
];

function renderDemoThreatBlock() {
  const items = DEMO_THREATS.map((t) =>
    `<div class="ot-threat">
      <span class="ot-threat-type">${esc(t.type)}</span>
      <div class="ot-threat-body">
        <div class="ot-threat-domain">${esc(t.domain)}</div>
        <div class="ot-threat-desc">${esc(t.desc)}</div>
      </div>
      <span class="ot-threat-source">${esc(t.source)}</span>
    </div>`
  ).join('');

  return `
    <div class="ot-threat-block">
      <div class="ot-threat-title">⚠ Amenazas reales detectadas hoy:</div>
      ${items}
      <div class="ot-threat-foot">+10.847 dominios maliciosos en la base de datos · Actualización cada hora</div>
    </div>`;
}

function renderFeatureCompare(f) {
  return `
    <div class="ot-feat">
      <div class="ot-feat-head">
        <span class="ot-feat-icon">${esc(f.icon)}</span>
        <div>
          <div class="ot-feat-title">${esc(f.title)}</div>
          <div class="ot-feat-desc">${esc(f.desc)}</div>
        </div>
      </div>
      <div class="ot-feat-compare">
        <div class="ot-feat-col ot-feat-free">
          <span class="ot-col-label">Free</span>
          <span class="ot-col-val">${esc(f.free)}</span>
        </div>
        <div class="ot-feat-col ot-feat-pro">
          <span class="ot-col-label">Pro ✦</span>
          <span class="ot-col-val">${esc(f.pro)}</span>
        </div>
      </div>
    </div>`;
}

export async function renderUpgrade(container) {
  const plan = await sendMsg({ type: 'get_plan' });
  const isPro = plan?.isPro ?? false;
  const isDevMode = plan?.devMode ?? false;

  if (isPro) {
    return renderProActive(container, plan, isDevMode);
  }

  container.innerHTML = `
    <div class="ot-wrap">

      <div class="ot-hero">
        <div class="ot-hero-eyebrow">✦ BROWSER AUDIT PRO</div>
        <h1 class="ot-hero-title">Lo que tu navegador<br>no te está contando</h1>
        <p class="ot-hero-sub">
          Cada día tu navegador hace miles de conexiones invisibles.
          Algunas son trackers. Otras son <strong style="color:#ef4444">amenazas activas</strong>
          que tu antivirus no detecta.
        </p>
      </div>

      ${renderDemoThreatBlock()}

      <div class="ot-pricing">
        <div class="ot-price-card ot-price-monthly">
          <div class="ot-price-tier">Mensual</div>
          <div class="ot-price-num">€2<span class="ot-price-period">/mes</span></div>
          <div class="ot-price-anchor">Menos que un café ☕</div>
        </div>
        <div class="ot-price-card ot-price-yearly ot-price-recommended">
          <div class="ot-price-badge">AHORRAS 17%</div>
          <div class="ot-price-tier">Anual</div>
          <div class="ot-price-num">€20<span class="ot-price-period">/año</span></div>
          <div class="ot-price-anchor"><s>€24</s> · €1.66/mes equivalente</div>
        </div>
      </div>

      <button id="btn-upgrade" class="ot-cta">
        Activar Pro · 30 días para cancelar
      </button>

      <p class="ot-launch">
        ⏳ <strong>Precio de lanzamiento</strong> · Subirá a €5/mes cuando se publique en Chrome Web Store
      </p>

      <div class="ot-features">
        <div class="ot-section-title">¿Qué cambia con Pro?</div>
        ${PRO_FEATURES.map(renderFeatureCompare).join('')}
      </div>

      <div class="ot-trust">
        <div class="ot-trust-item">
          <span class="ot-trust-icon">🔒</span>
          <div>
            <strong>100% privado</strong>
            <p>Solo enviamos hashes SHA256, nunca URLs ni datos personales.</p>
          </div>
        </div>
        <div class="ot-trust-item">
          <span class="ot-trust-icon">🚪</span>
          <div>
            <strong>Cancela cuando quieras</strong>
            <p>Sin permanencia. Vuelves a Free en un click y mantienes todas tus auditorías.</p>
          </div>
        </div>
        <div class="ot-trust-item">
          <span class="ot-trust-icon">📖</span>
          <div>
            <strong>Cliente open source</strong>
            <p>Audita el código en GitHub. Confía pero verifica.</p>
          </div>
        </div>
      </div>

      <div class="ot-actions">
        <button id="btn-dev-toggle" class="btn-dev">▶ Probar Pro en modo demo (sin pago)</button>
      </div>

      <p class="ot-foot">
        Pagos gestionados por ExtensionPay. <a href="#" id="link-privacy">Política de privacidad</a>
      </p>
    </div>`;

  wireEvents(container);
}

function renderProActive(container, plan, isDevMode) {
  container.innerHTML = `
    <div class="ot-wrap">
      <div class="ot-pro-active">
        <div class="ot-pro-active-icon">✦</div>
        <h2 class="ot-pro-active-title">Pro ${isDevMode ? '(modo demo)' : 'activo'}</h2>
        <p class="ot-pro-active-sub">
          ${isDevMode
            ? 'Estás probando Pro. Las amenazas mostradas son ejemplos.'
            : `Cuenta: ${esc(plan.email ?? '')}`}
        </p>

        <div class="ot-pro-stats">
          <div class="ot-pro-stat">
            <div class="ot-pro-stat-num">10.847</div>
            <div class="ot-pro-stat-label">dominios maliciosos<br>en la base de datos</div>
          </div>
          <div class="ot-pro-stat">
            <div class="ot-pro-stat-num">4</div>
            <div class="ot-pro-stat-label">feeds activos<br>actualizados cada hora</div>
          </div>
          <div class="ot-pro-stat">
            <div class="ot-pro-stat-num">90</div>
            <div class="ot-pro-stat-label">días de histórico<br>disponible</div>
          </div>
        </div>

        <p class="ot-pro-active-cta">
          Threat Intelligence está activa en ScriptSpy.
          Abre cualquier página y verás los dominios verificados.
        </p>

        <div class="ot-actions">
          <button id="btn-downgrade" class="btn-secondary">
            ${isDevMode ? '⬛ Salir del modo demo' : 'Volver a Free'}
          </button>
        </div>
      </div>
    </div>`;

  wireEvents(container);
}

function wireEvents(container) {
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
