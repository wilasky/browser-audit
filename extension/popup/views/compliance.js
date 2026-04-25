import { esc } from '../../shared/sanitize.js';
import { isAIConfigured, summarizePrivacyPolicy } from '../../shared/ai-client.js';

function sendMsg(msg) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(msg, (r) => {
      void chrome.runtime.lastError;
      resolve(r ?? null);
    });
  });
}

async function getActiveTabId() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab?.id ?? null;
}

// --- Score calculation ---

function calcCookieScore(r) {
  const issues = [];
  let pts = 100;

  // Cookies cargadas y no hay banner detectado
  if (r.cookies.count > 0 && r.banners.length === 0) {
    issues.push({ s: 'fail', t: 'Cookies cargadas sin banner de consentimiento detectado' });
    pts -= 30;
  }

  if (r.banners.length > 0) {
    const b = r.banners[0];
    if (b.hasAcceptBtn && !b.hasRejectBtn) {
      issues.push({ s: 'fail', t: 'Banner con "Aceptar" pero sin "Rechazar" — no cumple RGPD' });
      pts -= 25;
    }
    if (b.hasRejectBtn && b.hasAcceptBtn) {
      issues.push({ s: 'pass', t: 'Banner con opciones Aceptar y Rechazar visibles' });
    }
    if (!b.hasConfigBtn) {
      issues.push({ s: 'warn', t: 'Banner sin botón de "Configurar preferencias"' });
      pts -= 10;
    }
  } else if (r.cookies.count === 0) {
    issues.push({ s: 'pass', t: 'No se cargan cookies en esta página' });
  }

  if (r.cookies.count > 20) {
    issues.push({ s: 'warn', t: `${r.cookies.count} cookies activas — revisa cuáles son realmente necesarias` });
    pts -= 5;
  }

  return { score: Math.max(0, pts), issues };
}

function calcGdprScore(r) {
  const issues = [];
  let pts = 100;

  if (r.policyLinks.length === 0) {
    issues.push({ s: 'fail', t: 'No se encontró link a política de privacidad' });
    pts -= 30;
  } else {
    issues.push({ s: 'pass', t: `Política de privacidad enlazada (${r.policyLinks.length} link${r.policyLinks.length > 1 ? 's' : ''})` });
  }

  if (r.thirdPartyScripts.length > 5) {
    issues.push({ s: 'warn', t: `${r.thirdPartyScripts.length} dominios de terceros cargando scripts — revisa que estén declarados` });
    pts -= 15;
  }

  // Forms con campos sensibles
  for (const form of r.forms) {
    if (form.method === 'GET' && form.sensitive.some((s) => s.type === 'password')) {
      issues.push({ s: 'fail', t: 'Formulario con contraseña usando GET (envía datos en la URL)' });
      pts -= 30;
    }
    const noAutocomplete = form.sensitive.filter((s) =>
      s.type === 'password' && (s.autocomplete === 'on (default)' || s.autocomplete === 'on')
    );
    if (noAutocomplete.length > 0) {
      issues.push({ s: 'warn', t: `Formulario con autocomplete activo en campo password` });
      pts -= 5;
    }
  }

  return { score: Math.max(0, pts), issues };
}

function calcSecurityScore(r) {
  const issues = [];
  let pts = 100;

  if (!r.isHttps) {
    issues.push({ s: 'fail', t: 'La página NO usa HTTPS' });
    pts -= 50;
  } else {
    issues.push({ s: 'pass', t: 'HTTPS activo' });
  }

  if (r.mixedContent > 0) {
    issues.push({ s: 'fail', t: `${r.mixedContent} recurso(s) cargado(s) por HTTP en página HTTPS (mixed content)` });
    pts -= 20;
  }

  const h = r.headers ?? {};

  const headerChecks = [
    { key: 'hsts', name: 'HSTS', weight: 10, hint: 'Protege contra downgrade attacks' },
    { key: 'csp', name: 'Content-Security-Policy', weight: 15, hint: 'Bloquea XSS y carga de recursos no autorizados' },
    { key: 'xfo', name: 'X-Frame-Options', weight: 5, hint: 'Previene clickjacking' },
    { key: 'xcto', name: 'X-Content-Type-Options', weight: 3, hint: 'Previene MIME sniffing' },
    { key: 'referrerPolicy', name: 'Referrer-Policy', weight: 5, hint: 'Controla qué Referer envías' },
    { key: 'permissionsPolicy', name: 'Permissions-Policy', weight: 3, hint: 'Restringe APIs disponibles' },
  ];

  for (const c of headerChecks) {
    if (h[c.key]) {
      issues.push({ s: 'pass', t: `${c.name}: configurado` });
    } else {
      issues.push({ s: 'warn', t: `${c.name}: no presente — ${c.hint}` });
      pts -= c.weight;
    }
  }

  return { score: Math.max(0, pts), issues };
}

// --- Rendering ---

function renderIssue(i) {
  const icons = { pass: '✓', warn: '⚠', fail: '✗' };
  return `
    <li class="comp-issue comp-${i.s}">
      <span class="comp-issue-icon">${icons[i.s] ?? '?'}</span>
      <span>${esc(i.t)}</span>
    </li>`;
}

function renderSection(name, scoreData) {
  const scoreColor = scoreData.score >= 80 ? '#22c55e' : scoreData.score >= 60 ? '#f59e0b' : '#ef4444';
  return `
    <section class="comp-section">
      <div class="comp-section-header">
        <h3 class="comp-section-title">${esc(name)}</h3>
        <span class="comp-section-score" style="color:${scoreColor}">${scoreData.score}</span>
      </div>
      <ul class="comp-issues">
        ${scoreData.issues.map(renderIssue).join('')}
      </ul>
    </section>`;
}

function renderReport(r) {
  const cookieScore = calcCookieScore(r);
  const gdprScore = calcGdprScore(r);
  const secScore = calcSecurityScore(r);

  const total = Math.round((cookieScore.score + gdprScore.score + secScore.score) / 3);
  const totalColor = total >= 80 ? '#22c55e' : total >= 60 ? '#f59e0b' : '#ef4444';

  const headers = r.headers ?? {};
  const headerSummary = Object.entries(headers)
    .filter(([k]) => k !== 'error')
    .map(([k, v]) =>
      `<div class="comp-hdr-row">
        <span class="comp-hdr-name">${esc(k)}</span>
        <span class="comp-hdr-val ${v ? 'present' : 'missing'}">${v ? '✓' : '✗ no presente'}</span>
      </div>`
    ).join('');

  return `
    <div class="comp-overview">
      <div class="comp-host">${esc(r.host)}</div>
      <div class="comp-total" style="color:${totalColor}">${total}<span class="comp-total-suffix">/100</span></div>
      <div class="comp-total-label">Cumplimiento general</div>
      <div class="comp-summary">
        🍪 ${r.cookies.count} cookies · 🛡 ${r.banners.length > 0 ? 'Banner detectado' : 'Sin banner'} ·
        📄 ${r.policyLinks.length} link${r.policyLinks.length !== 1 ? 's' : ''} privacidad ·
        🌐 ${r.thirdPartyScripts.length} 3rd party
      </div>
    </div>

    ${renderSection('🍪 Cookies & Consentimiento', cookieScore)}
    ${renderSection('📋 RGPD / LSSI', gdprScore)}
    ${renderSection('🔒 Headers de seguridad', secScore)}

    <details class="comp-details">
      <summary>Ver headers HTTP detectados</summary>
      <div class="comp-hdr-list">
        ${headerSummary || '<p class="loading">No se pudieron leer los headers</p>'}
      </div>
    </details>

    ${r.thirdPartyScripts.length > 0 ? `
      <details class="comp-details">
        <summary>Dominios de terceros cargados (${r.thirdPartyScripts.length})</summary>
        <div class="comp-3rd">${r.thirdPartyScripts.map(esc).join(' · ')}</div>
      </details>
    ` : ''}

    ${r.forms.length > 0 ? `
      <details class="comp-details">
        <summary>Formularios con campos sensibles (${r.forms.length})</summary>
        <div class="comp-forms">
          ${r.forms.map((f) => `
            <div class="comp-form">
              <strong>${esc(f.method)} ${esc(f.action)}</strong>
              <div>${f.sensitive.map((s) => esc(`${s.type}:${s.name}`)).join(' · ')}</div>
            </div>
          `).join('')}
        </div>
      </details>
    ` : ''}
  `;
}

// --- Entry point ---

export async function renderCompliance(container) {
  const tabId = await getActiveTabId();
  const aiReady = await isAIConfigured();

  container.innerHTML = `
    <div class="comp-wrap">
      <div class="comp-toolbar">
        <span class="spy-label">Análisis RGPD / LSSI / Cookies de la página activa</span>
        <button id="btn-comp-run" class="btn-primary">Analizar página</button>
        <button id="btn-comp-ai" class="btn-secondary btn-ai" title="${aiReady ? 'Resume con IA la política de privacidad de esta página' : 'Configura una API key en Settings ⚙ para activar el resumen con IA'}">
          ✨ Resumir con IA
        </button>
      </div>
      <div id="comp-result">
        <p class="loading">Pulsa <strong>Analizar página</strong> para evaluar la web actual contra criterios de cumplimiento.</p>
      </div>
    </div>`;

  container.querySelector('#btn-comp-ai').addEventListener('click', async () => {
    if (!tabId) { return; }
    if (!(await isAIConfigured())) {
      alert('Configura una API key de Claude u OpenAI en la pestaña ⚙ Settings → Asistente IA.');
      return;
    }
    const result = container.querySelector('#comp-result');
    const btn = container.querySelector('#btn-comp-ai');
    btn.disabled = true;
    btn.textContent = '✨ Extrayendo texto…';

    try {
      const extracted = await sendMsg({ type: 'extract_page_text', tabId });
      if (!extracted?.ok || !extracted.result?.text) {
        result.innerHTML = '<p class="error">No se pudo extraer el texto de la página.</p>';
        btn.disabled = false; btn.textContent = '✨ Resumir con IA';
        return;
      }
      const { text, host, length, title } = extracted.result;

      btn.textContent = `✨ Resumiendo (${length.toLocaleString()} chars)…`;

      result.innerHTML = `
        <div class="ai-summary">
          <div class="ai-summary-header">
            <strong>Análisis IA</strong>
            <span class="ai-summary-host">${esc(host)} · ${esc(title.slice(0, 60))}</span>
          </div>
          <p class="loading">Resumiendo política de privacidad…</p>
        </div>`;

      const summary = await summarizePrivacyPolicy(text, host);

      const formatted = summary
        .split('\n')
        .map((line) => esc(line))
        .join('<br>');

      result.innerHTML = `
        <div class="ai-summary">
          <div class="ai-summary-header">
            <strong>✨ Resumen IA</strong>
            <span class="ai-summary-host">${esc(host)}</span>
          </div>
          <div class="ai-summary-body">${formatted}</div>
          <div class="ai-summary-foot">
            <span>El contenido pasó por tu API key de IA. No por nuestros servidores.</span>
            <button id="btn-ai-back" class="btn-secondary">Volver</button>
          </div>
        </div>`;

      result.querySelector('#btn-ai-back').addEventListener('click', () => {
        result.innerHTML = '<p class="loading">Pulsa <strong>Analizar página</strong> para evaluar cumplimiento.</p>';
      });

      btn.disabled = false;
      btn.textContent = '✨ Resumir con IA';
    } catch (err) {
      result.innerHTML = `<p class="error">Error IA: ${esc(err.message)}</p>`;
      btn.disabled = false;
      btn.textContent = '✨ Resumir con IA';
    }
  });

  container.querySelector('#btn-comp-run').addEventListener('click', async () => {
    if (!tabId) { return; }
    const btn = container.querySelector('#btn-comp-run');
    const result = container.querySelector('#comp-result');
    btn.disabled = true;
    btn.textContent = 'Analizando…';
    result.innerHTML = '<p class="loading">Inspeccionando cookies, headers, formularios y scripts…</p>';

    const res = await sendMsg({ type: 'run_compliance_probe', tabId });
    btn.disabled = false;
    btn.textContent = 'Volver a analizar';

    if (!res?.ok) {
      const p = document.createElement('p');
      p.className = 'error';
      p.textContent = res?.reason ?? 'Error al analizar la página.';
      result.replaceChildren(p);
      return;
    }

    if (!res.result) {
      result.innerHTML = '<p class="error">La página no devolvió datos. ¿Es una página del sistema?</p>';
      return;
    }

    result.innerHTML = renderReport(res.result);
  });
}
