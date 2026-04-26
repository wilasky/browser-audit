import { esc } from '../../shared/sanitize.js';
import { isAIConfigured, summarizePrivacyPolicy } from '../../shared/ai-client.js';
import { t } from '../../shared/i18n.js';

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

  const md = r.mixedDetail ?? { total: 0 };
  if (md.total > 0) {
    const parts = [];
    if (md.images) { parts.push(`${md.images} imágenes`); }
    if (md.scripts) { parts.push(`${md.scripts} scripts`); }
    if (md.links) { parts.push(`${md.links} CSS`); }
    if (md.iframes) { parts.push(`${md.iframes} iframes`); }
    issues.push({ s: 'fail', t: `${md.total} recursos por HTTP en página HTTPS (${parts.join(', ')})` });
    pts -= Math.min(40, md.total * 5);
  }

  const h = r.headers ?? {};

  const headerChecks = [
    { key: 'hsts', name: 'HSTS', weight: 10, hint: 'Protege contra downgrade attacks' },
    { key: 'csp', name: 'Content-Security-Policy', weight: 15, hint: 'Bloquea XSS y recursos no autorizados' },
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

  if (h.poweredBy) {
    issues.push({ s: 'warn', t: `X-Powered-By revela tecnología: "${h.poweredBy}"` });
    pts -= 3;
  }
  if (h.server && /\d/.test(h.server)) {
    issues.push({ s: 'warn', t: `Server header revela versión: "${h.server}"` });
    pts -= 3;
  }
  if (h.xxss) {
    issues.push({ s: 'warn', t: 'X-XSS-Protection presente (deprecated, mejor CSP)' });
  }
  if (h.cspReportOnly && !h.csp) {
    issues.push({ s: 'warn', t: 'CSP en modo Report-Only únicamente — no bloquea ataques' });
    pts -= 5;
  }

  return { score: Math.max(0, pts), issues };
}

function calcPentestScore(r) {
  const issues = [];
  let pts = 100;

  // Iframes inseguros
  const unsafeIframes = (r.iframes ?? []).filter((i) => i.crossOrigin && !i.sandbox);
  if (unsafeIframes.length > 0) {
    issues.push({ s: 'warn', t: `${unsafeIframes.length} iframe(s) cross-origin sin atributo sandbox` });
    pts -= Math.min(20, unsafeIframes.length * 5);
  } else if (r.iframes?.length > 0) {
    issues.push({ s: 'pass', t: 'Todos los iframes tienen sandbox o son same-origin' });
  }

  // SRI en scripts externos
  if (r.totalThirdPartyScripts > 0) {
    if (r.scriptsWithoutSRI === 0) {
      issues.push({ s: 'pass', t: `${r.totalThirdPartyScripts} scripts externos, todos con SRI` });
    } else {
      issues.push({ s: 'fail', t: `${r.scriptsWithoutSRI} de ${r.totalThirdPartyScripts} scripts externos SIN Subresource Integrity` });
      pts -= Math.min(30, r.scriptsWithoutSRI * 3);
    }
  }

  if (r.stylesheetsWithoutSRI > 0) {
    issues.push({ s: 'warn', t: `${r.stylesheetsWithoutSRI} CSS externos sin SRI` });
    pts -= 5;
  }

  // Inline event handlers (onclick, onerror, etc.)
  if (r.inlineHandlers > 5) {
    issues.push({ s: 'warn', t: `${r.inlineHandlers} elementos con event handlers inline (incompatible con CSP estricta)` });
    pts -= 5;
  }

  // Forms
  for (const form of r.forms ?? []) {
    if (!form.hasCsrfToken && form.method === 'POST' && form.sensitive.length > 0) {
      issues.push({ s: 'warn', t: `Formulario POST con campos sensibles sin token CSRF detectado` });
      pts -= 5;
    }
    if (form.actionCrossOrigin) {
      issues.push({ s: 'warn', t: `Formulario envía datos a otro dominio: ${form.action}` });
      pts -= 5;
    }
  }

  // Outdated libraries
  if (r.libs?.jquery) {
    const v = r.libs.jquery;
    const major = parseInt(v.split('.')[0], 10);
    if (major < 3) {
      issues.push({ s: 'fail', t: `jQuery ${v} obsoleto (XSS conocidos en 1.x/2.x)` });
      pts -= 15;
    } else {
      issues.push({ s: 'pass', t: `jQuery ${v} (versión moderna)` });
    }
  }

  // Cookies inseguras
  if (r.cookies.count > 0 && !r.isHttps) {
    issues.push({ s: 'fail', t: 'Cookies en página HTTP (interceptables en red)' });
    pts -= 20;
  }

  // Storage usage
  if (r.storage.lsSize > 100000) {
    issues.push({ s: 'warn', t: `localStorage con ${(r.storage.lsSize / 1024).toFixed(1)} KB de datos` });
  }

  // Service worker
  if (r.serviceWorker) {
    issues.push({ s: 'pass', t: `Service Worker registrado: ${r.serviceWorker.scriptURL ?? r.serviceWorker.scope}` });
  }

  if (issues.length === 0) {
    issues.push({ s: 'pass', t: 'Sin problemas técnicos detectados en esta página' });
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
  const pentestScore = calcPentestScore(r);

  const total = Math.round((cookieScore.score + gdprScore.score + secScore.score + pentestScore.score) / 4);
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
      <div class="comp-total-label">${esc(t('comp.score_overall'))}</div>
      <div class="comp-summary">
        🍪 ${r.cookies.count} cookies · 🛡 ${r.banners.length > 0 ? 'Banner OK' : 'Sin banner'} ·
        📄 ${r.policyLinks.length} legal ·
        🌐 ${r.thirdPartyScripts.length} 3rd party ·
        🖼 ${(r.iframes ?? []).length} iframes
      </div>
    </div>

    ${renderSection(t('comp.section_cookies'), cookieScore)}
    ${renderSection(t('comp.section_gdpr'), gdprScore)}
    ${renderSection(t('comp.section_headers'), secScore)}
    ${renderSection(t('comp.section_pentest'), pentestScore)}

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
              <div class="settings-hint">
                ${f.hasCsrfToken ? '✓ Token CSRF detectado' : '⚠ Sin token CSRF aparente'}
                ${f.actionCrossOrigin ? ' · ⚠ Action cross-origin' : ''}
              </div>
            </div>
          `).join('')}
        </div>
      </details>
    ` : ''}

    ${r.iframes?.length > 0 ? `
      <details class="comp-details">
        <summary>Iframes (${r.iframes.length})</summary>
        <div class="comp-3rd">
          ${r.iframes.map((i) => `
            <div class="comp-form">
              <strong>${esc(i.host || 'inline')}</strong> ${i.crossOrigin ? '<span style="color:#f59e0b">cross-origin</span>' : '<span style="color:#22c55e">same-origin</span>'}
              <div class="settings-hint">
                ${i.sandbox ? `sandbox="${esc(i.sandbox)}"` : '<span style="color:#ef4444">sin sandbox</span>'}
                ${i.allow ? ` · allow="${esc(i.allow.slice(0, 60))}"` : ''}
              </div>
            </div>
          `).join('')}
        </div>
      </details>
    ` : ''}

    ${Object.keys(r.libs ?? {}).length > 0 ? `
      <details class="comp-details">
        <summary>Librerías JavaScript detectadas</summary>
        <div class="comp-3rd">
          ${Object.entries(r.libs).map(([k, v]) => `<div><strong>${esc(k)}</strong>: ${esc(v)}</div>`).join('')}
        </div>
      </details>
    ` : ''}

    ${r.serviceWorker ? `
      <details class="comp-details">
        <summary>Service Worker activo</summary>
        <div class="comp-3rd">
          <div>Scope: ${esc(r.serviceWorker.scope)}</div>
          ${r.serviceWorker.scriptURL ? `<div>Script: ${esc(r.serviceWorker.scriptURL)}</div>` : ''}
        </div>
      </details>
    ` : ''}

    ${r.storage.lsCount + r.storage.ssCount > 0 ? `
      <details class="comp-details">
        <summary>Almacenamiento local (${r.storage.lsCount + r.storage.ssCount} entradas)</summary>
        <div class="comp-3rd">
          <div>localStorage: ${r.storage.lsCount} entradas · ${(r.storage.lsSize / 1024).toFixed(1)} KB</div>
          <div>sessionStorage: ${r.storage.ssCount} entradas · ${(r.storage.ssSize / 1024).toFixed(1)} KB</div>
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
        <span class="spy-label">${esc(t('comp.title'))}</span>
        <button id="btn-comp-run" class="btn-primary">${esc(t('comp.analyze'))}</button>
        <button id="btn-comp-ai" class="btn-secondary btn-ai" title="${aiReady ? esc(t('comp.ai_summarize')) : esc(t('comp.ai_no_config'))}">
          ${esc(t('comp.ai_summarize'))}
        </button>
      </div>
      <div id="comp-result">
        <p class="loading">${t('comp.intro')}</p>
      </div>
    </div>`;

  container.querySelector('#btn-comp-ai').addEventListener('click', async () => {
    if (!tabId) { return; }
    if (!(await isAIConfigured())) {
      alert(t('comp.ai_no_config'));
      return;
    }
    const result = container.querySelector('#comp-result');
    const btn = container.querySelector('#btn-comp-ai');
    btn.disabled = true;
    btn.textContent = t('comp.ai_extracting');

    try {
      const extracted = await sendMsg({ type: 'extract_page_text', tabId });
      if (!extracted?.ok || !extracted.result?.text) {
        result.innerHTML = `<p class="error">${esc(t('comp.ai_no_text'))}</p>`;
        btn.disabled = false; btn.textContent = t('comp.ai_summarize');
        return;
      }
      const { text, host, length, title } = extracted.result;

      btn.textContent = t('comp.ai_summarizing', { n: length.toLocaleString() });

      result.innerHTML = `
        <div class="ai-summary">
          <div class="ai-summary-header">
            <strong>${esc(t('comp.ai_summary'))}</strong>
            <span class="ai-summary-host">${esc(host)} · ${esc(title.slice(0, 60))}</span>
          </div>
          <p class="loading">${esc(t('comp.ai_summarizing_policy'))}</p>
        </div>`;

      const summary = await summarizePrivacyPolicy(text, host);

      const formatted = summary
        .split('\n')
        .map((line) => esc(line))
        .join('<br>');

      result.innerHTML = `
        <div class="ai-summary">
          <div class="ai-summary-header">
            <strong>${esc(t('comp.ai_summary'))}</strong>
            <span class="ai-summary-host">${esc(host)}</span>
          </div>
          <div class="ai-summary-body">${formatted}</div>
          <div class="ai-summary-foot">
            <span>${esc(t('comp.ai_pass_through'))}</span>
            <button id="btn-ai-back" class="btn-secondary">${esc(t('btn.back'))}</button>
          </div>
        </div>`;

      result.querySelector('#btn-ai-back').addEventListener('click', () => {
        result.innerHTML = `<p class="loading">${t('comp.intro')}</p>`;
      });

      btn.disabled = false;
      btn.textContent = t('comp.ai_summarize');
    } catch (err) {
      result.innerHTML = `<p class="error">${esc(t('common.error'))}: ${esc(err.message)}</p>`;
      btn.disabled = false;
      btn.textContent = t('comp.ai_summarize');
    }
  });

  container.querySelector('#btn-comp-run').addEventListener('click', async () => {
    if (!tabId) { return; }
    const btn = container.querySelector('#btn-comp-run');
    const result = container.querySelector('#comp-result');
    btn.disabled = true;
    btn.textContent = t('comp.analyzing');
    result.innerHTML = `<p class="loading">${esc(t('comp.analyzing_detail'))}</p>`;

    const res = await sendMsg({ type: 'run_compliance_probe', tabId });
    btn.disabled = false;
    btn.textContent = t('comp.analyze_again');

    if (!res?.ok) {
      const p = document.createElement('p');
      p.className = 'error';
      p.textContent = res?.reason ?? t('common.error');
      result.replaceChildren(p);
      return;
    }

    if (!res.result) {
      result.innerHTML = `<p class="error">${esc(t('comp.ai_no_data'))}</p>`;
      return;
    }

    result.innerHTML = renderReport(res.result);
  });
}
