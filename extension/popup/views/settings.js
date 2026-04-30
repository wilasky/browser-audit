import { esc } from '../../shared/sanitize.js';
import { listProviders, getAIConfig, saveAIConfig } from '../../shared/ai-client.js';
import { getLanguagePreference, setLanguage, t } from '../../shared/i18n.js';

function sendMsg(msg) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(msg, (r) => {
      void chrome.runtime.lastError;
      resolve(r ?? null);
    });
  });
}

// --- Default settings + persistence ---

const DEFAULTS = {
  autoAudit: true,
  auditInterval: 24, // hours
  scriptSpyAutoStart: false,
  showFirstParty: false,
  alertOnScoreDrop: true,
  scoreDropThreshold: 10,
  defaultProfile: 'basic',
  fingerprintAutoCalc: true,
};

async function loadPrefs() {
  const s = await chrome.storage.local.get('userPrefs');
  return { ...DEFAULTS, ...(s.userPrefs ?? {}) };
}

async function savePrefs(prefs) {
  await chrome.storage.local.set({ userPrefs: prefs });
}

// --- History chart ---

function levelColor(level) {
  return level === 'green' ? '#22c55e'
    : level === 'amber' ? '#f59e0b'
    : level === 'red' ? '#ef4444'
    : '#888';
}

function renderHistoryChart(history) {
  if (!history.length) {
    return `<p class="settings-hint">${esc(t('settings.history_empty'))}</p>`;
  }

  // history comes newest-first from chrome.storage; reverse to plot chronologically
  const items = history.slice(0, 14).reverse();
  const single = items.length === 1;
  const last = items[items.length - 1];
  const first = items[0];

  // Chart dimensions — wider and slightly taller than before, with breathing room
  const w = 340, h = 100, padX = 8, padY = 14;

  // Scale: pad ±5 around min/max so a flat sequence still draws above the bottom
  const rawMin = Math.min(...items.map((it) => it.score));
  const rawMax = Math.max(...items.map((it) => it.score));
  const yMin = Math.max(0, Math.min(rawMin - 5, 95));
  const yMax = Math.min(100, Math.max(rawMax + 5, yMin + 10));

  const xStep = items.length > 1 ? (w - padX * 2) / (items.length - 1) : 0;
  const points = items.map((item, i) => {
    const x = padX + i * xStep;
    const y = h - padY - ((item.score - yMin) / (yMax - yMin)) * (h - padY * 2);
    return { x, y, score: item.score, level: item.level, date: item.completedAt };
  });

  const lineColor = levelColor(last.level);
  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  // Filled area below the line for visual weight
  const areaPath = single
    ? ''
    : `${linePath} L ${points[points.length - 1].x.toFixed(1)} ${h - padY} L ${points[0].x.toFixed(1)} ${h - padY} Z`;

  const dots = points.map((p) => {
    const isLast = p === last;
    const r = isLast ? 5 : 3;
    const color = levelColor(p.level);
    const tooltip = `${p.score}% · ${new Date(p.date).toLocaleString()}`;
    return `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${r}" fill="${color}" ${isLast ? `stroke="${color}" stroke-opacity="0.3" stroke-width="6"` : ''}><title>${esc(tooltip)}</title></circle>`;
  }).join('');

  // Best / worst markers
  const bestScore = rawMax, worstScore = rawMin;

  // Footer line: current · delta · count
  let deltaHtml;
  if (single) {
    deltaHtml = `<span class="settings-hint">${esc(t('settings.history_one_audit'))}</span>`;
  } else {
    const delta = last.score - first.score;
    const fdate = new Date(first.date).toLocaleDateString();
    let txt;
    let color;
    if (delta > 0) { txt = t('settings.history_delta_up', { n: delta, date: fdate }); color = '#22c55e'; }
    else if (delta < 0) { txt = t('settings.history_delta_down', { n: delta, date: fdate }); color = '#ef4444'; }
    else { txt = t('settings.history_no_change'); color = '#888'; }
    deltaHtml = `<span style="color:${color}">${esc(txt)}</span>`;
  }

  return `
    <div class="hist-chart-wrap">
      <svg class="hist-svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="hist-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="${lineColor}" stop-opacity="0.35"/>
            <stop offset="100%" stop-color="${lineColor}" stop-opacity="0"/>
          </linearGradient>
        </defs>
        ${areaPath ? `<path d="${areaPath}" fill="url(#hist-grad)" stroke="none"/>` : ''}
        ${linePath ? `<path d="${linePath}" stroke="${lineColor}" stroke-width="2" fill="none" stroke-linejoin="round" stroke-linecap="round"/>` : ''}
        ${dots}
      </svg>
      <div class="hist-meta">
        <div class="hist-meta-current">
          <span class="hist-meta-label">${esc(t('settings.history_current'))}</span>
          <strong style="color:${lineColor}">${last.score}</strong>
        </div>
        ${single ? '' : `
          <div class="hist-meta-extremes">
            <span class="hist-meta-label">${esc(t('settings.history_best'))}</span>
            <strong style="color:${levelColor(items.find((i) => i.score === bestScore)?.level)}">${bestScore}</strong>
            <span class="hist-meta-sep">·</span>
            <span class="hist-meta-label">${esc(t('settings.history_worst'))}</span>
            <strong style="color:${levelColor(items.find((i) => i.score === worstScore)?.level)}">${worstScore}</strong>
          </div>`}
        ${deltaHtml}
        <span class="settings-hint hist-meta-count">${esc(t('settings.history_count', { n: items.length }))}</span>
      </div>
    </div>`;
}

// --- Section renderers ---

function renderHistorySection(history) {
  return `
    <section class="settings-section">
      <h3 class="settings-heading">${esc(t('settings.history'))}</h3>
      ${renderHistoryChart(history ?? [])}
      ${history.length > 0 ? `
        <div class="settings-row">
          <button id="btn-clear-history" class="btn-secondary">${esc(t('settings.history_clear'))}</button>
        </div>
      ` : ''}
    </section>`;
}

function renderAuditSection(prefs) {
  return `
    <section class="settings-section">
      <h3 class="settings-heading">${esc(t('settings.audit_auto'))}</h3>
      <label class="settings-toggle">
        <input type="checkbox" id="pref-auto-audit" ${prefs.autoAudit ? 'checked' : ''}/>
        <span>${esc(t('settings.audit_re'))}</span>
      </label>
      <div class="settings-row settings-indent">
        <label class="settings-label">${esc(t('settings.audit_interval'))}</label>
        <select id="pref-interval" class="settings-select">
          <option value="1" ${prefs.auditInterval === 1 ? 'selected' : ''}>${esc(t('settings.audit_hourly'))}</option>
          <option value="6" ${prefs.auditInterval === 6 ? 'selected' : ''}>${esc(t('settings.audit_6h'))}</option>
          <option value="12" ${prefs.auditInterval === 12 ? 'selected' : ''}>${esc(t('settings.audit_12h'))}</option>
          <option value="24" ${prefs.auditInterval === 24 ? 'selected' : ''}>${esc(t('settings.audit_daily'))}</option>
          <option value="168" ${prefs.auditInterval === 168 ? 'selected' : ''}>${esc(t('settings.audit_weekly'))}</option>
        </select>
      </div>
      <label class="settings-toggle">
        <input type="checkbox" id="pref-fp-auto" ${prefs.fingerprintAutoCalc ? 'checked' : ''}/>
        <span>${esc(t('settings.audit_fp'))}</span>
      </label>
      <p class="settings-hint">${esc(t('settings.audit_fp_hint'))}</p>
    </section>`;
}

function renderLanguageSection(currentLang) {
  return `
    <section class="settings-section">
      <h3 class="settings-heading">${esc(t('settings.lang_title'))}</h3>
      <div class="settings-row">
        <label class="settings-label">${esc(t('settings.lang_label'))}</label>
        <select id="pref-lang" class="settings-select">
          <option value="auto" ${currentLang === 'auto' ? 'selected' : ''}>${esc(t('settings.lang_auto'))}</option>
          <option value="es" ${currentLang === 'es' ? 'selected' : ''}>${esc(t('settings.lang_es'))}</option>
          <option value="en" ${currentLang === 'en' ? 'selected' : ''}>${esc(t('settings.lang_en'))}</option>
        </select>
      </div>
      <p class="settings-hint">${esc(t('settings.lang_hint'))}</p>
    </section>`;
}

function renderViewSection(prefs) {
  return `
    <section class="settings-section">
      <h3 class="settings-heading">${esc(t('settings.view_health'))}</h3>
      <div class="settings-row">
        <label class="settings-label">${esc(t('settings.default_profile'))}</label>
        <select id="pref-default-profile" class="settings-select">
          <option value="basic" ${prefs.defaultProfile === 'basic' ? 'selected' : ''}>${esc(t('profile.basic'))}</option>
          <option value="advanced" ${prefs.defaultProfile === 'advanced' ? 'selected' : ''}>${esc(t('profile.advanced'))}</option>
          <option value="failed" ${prefs.defaultProfile === 'failed' ? 'selected' : ''}>${esc(t('profile.failed'))}</option>
          <option value="CIS" ${prefs.defaultProfile === 'CIS' ? 'selected' : ''}>CIS Benchmark</option>
          <option value="CCN" ${prefs.defaultProfile === 'CCN' ? 'selected' : ''}>ENS (CCN-STIC)</option>
          <option value="NIST" ${prefs.defaultProfile === 'NIST' ? 'selected' : ''}>NIST SP 800-53</option>
        </select>
      </div>
    </section>`;
}

function renderScriptSpySection(prefs) {
  return `
    <section class="settings-section">
      <h3 class="settings-heading">${esc(t('settings.scriptspy'))}</h3>
      <label class="settings-toggle">
        <input type="checkbox" id="pref-spy-auto" ${prefs.scriptSpyAutoStart ? 'checked' : ''}/>
        <span>${esc(t('settings.spy_auto'))}</span>
      </label>
      <p class="settings-hint">${esc(t('settings.spy_auto_hint'))}</p>
      <label class="settings-toggle">
        <input type="checkbox" id="pref-show-1p" ${prefs.showFirstParty ? 'checked' : ''}/>
        <span>${esc(t('settings.spy_show_1p'))}</span>
      </label>
      <p class="settings-hint">${esc(t('settings.spy_show_1p_hint'))}</p>
    </section>`;
}

function renderAlertsSection(prefs) {
  return `
    <section class="settings-section">
      <h3 class="settings-heading">${esc(t('settings.alerts'))}</h3>
      <label class="settings-toggle">
        <input type="checkbox" id="pref-alert-drop" ${prefs.alertOnScoreDrop ? 'checked' : ''}/>
        <span>${esc(t('settings.alert_drop'))}</span>
      </label>
      <div class="settings-row settings-indent">
        <label class="settings-label">${esc(t('settings.alert_threshold'))}</label>
        <select id="pref-threshold" class="settings-select">
          <option value="5" ${prefs.scoreDropThreshold === 5 ? 'selected' : ''}>${esc(t('settings.alert_5'))}</option>
          <option value="10" ${prefs.scoreDropThreshold === 10 ? 'selected' : ''}>${esc(t('settings.alert_10'))}</option>
          <option value="20" ${prefs.scoreDropThreshold === 20 ? 'selected' : ''}>${esc(t('settings.alert_20'))}</option>
        </select>
      </div>
    </section>`;
}

function renderAISection(aiConfig) {
  const providers = listProviders();
  const current = providers.find((p) => p.id === aiConfig.provider) ?? providers[0];

  return `
    <section class="settings-section">
      <h3 class="settings-heading">${esc(t('settings.ai'))}</h3>
      <div class="api-info-box">
        <p class="settings-hint">${t('settings.ai_intro')}</p>
        <p class="settings-hint" style="margin-top:6px">${t('settings.ai_features')}</p>
      </div>
      <div class="settings-row">
        <label class="settings-label">${esc(t('settings.ai_provider'))}</label>
        <select id="pref-ai-provider" class="settings-select">
          ${providers.map((p) =>
            `<option value="${esc(p.id)}" ${aiConfig.provider === p.id ? 'selected' : ''}>${esc(p.name)}</option>`
          ).join('')}
        </select>
      </div>
      <div class="api-key-row">
        <input id="input-ai-key" type="password" class="api-key-input"
          placeholder="${esc(current.keyPlaceholder)}" />
        <button id="btn-save-ai" class="btn-secondary">${esc(t('btn.save'))}</button>
      </div>
      <div class="settings-row">
        <label class="settings-label" style="font-size:10px">${esc(t('settings.ai_model'))}</label>
        <input id="input-ai-model" type="text" class="settings-input"
          placeholder="${esc(current.defaultModel)}" />
      </div>
      <p id="ai-status" class="settings-hint"></p>
      <p class="settings-hint">
        ${esc(t('settings.ai_get_key'))}
        ${providers.map((p) => `<a href="${esc(p.signupUrl)}" data-link class="link-btn">${esc(p.name)}</a>`).join(' · ')}
      </p>
    </section>`;
}

function renderPlanSection() {
  return `
    <section class="settings-section">
      <h3 class="settings-heading">${esc(t('settings.plan'))}</h3>
      <p class="settings-hint">${t('settings.plan_intro')}</p>
    </section>`;
}

function renderMutedSection(muted) {
  if (!muted.length) {
    return `
      <section class="settings-section">
        <h3 class="settings-heading">${esc(t('settings.muted'))}</h3>
        <p class="settings-hint">${esc(t('settings.muted_empty'))}</p>
      </section>`;
  }
  return `
    <section class="settings-section">
      <h3 class="settings-heading">${esc(t('settings.muted'))}</h3>
      <p class="settings-hint">${esc(t('settings.muted_intro'))}</p>
      <ul class="muted-list">
        ${muted.map((id) => `
          <li class="muted-item">
            <code class="muted-id">${esc(id)}</code>
            <button class="link-btn muted-unmute" data-mute-id="${esc(id)}" title="${esc(t('health.unmute_btn'))}">✕</button>
          </li>
        `).join('')}
      </ul>
    </section>`;
}

function renderDataSection() {
  return `
    <section class="settings-section">
      <h3 class="settings-heading">${esc(t('settings.import_export'))}</h3>
      <p class="settings-hint">${esc(t('settings.import_export_hint'))}</p>
      <div class="settings-row">
        <button id="btn-export-config" class="btn-secondary">${esc(t('settings.export_btn'))}</button>
        <button id="btn-import-config" class="btn-secondary">${esc(t('settings.import_btn'))}</button>
        <input type="file" id="input-import-file" accept="application/json" style="display:none"/>
      </div>
      <p id="config-status" class="settings-hint"></p>
    </section>

    <section class="settings-section">
      <h3 class="settings-heading">${esc(t('settings.deep_analysis'))}</h3>
      <p class="settings-hint">${esc(t('settings.deep_analysis_intro'))}</p>
      <div class="settings-row">
        <button id="btn-grant-hosts" class="btn-secondary btn-grant">${esc(t('settings.deep_grant'))}</button>
        <button id="btn-revoke-hosts" class="btn-secondary">${esc(t('settings.deep_revoke'))}</button>
      </div>
      <p id="hosts-status" class="settings-hint"></p>
    </section>

    <section class="settings-section">
      <h3 class="settings-heading">${esc(t('settings.data_privacy'))}</h3>
      <div class="settings-row">
        <button id="btn-clear-cache" class="btn-secondary">${esc(t('settings.clear_cache'))}</button>
        <button id="btn-clear-prefs" class="btn-secondary btn-reset">${esc(t('settings.clear_prefs'))}</button>
      </div>
      <p class="settings-hint">${esc(t('settings.privacy_note'))}</p>
    </section>`;
}

function renderAboutSection() {
  return `
    <section class="settings-section">
      <h3 class="settings-heading">${esc(t('settings.about'))}</h3>
      <p class="settings-hint">${t('settings.about_text')}</p>
      <div class="settings-row">
        <a href="https://github.com/wilasky/browser-audit" data-link class="link-btn">GitHub</a>
        <a href="https://github.com/wilasky/browser-audit/blob/main/docs/PRIVACY_POLICY.md" data-link class="link-btn">${esc(t('settings.privacy_link'))}</a>
        <button id="btn-feedback" class="link-btn" style="background:none;border:none;cursor:pointer;font-size:12px;padding:0">${esc(t('settings.feedback'))}</button>
      </div>
    </section>`;
}

// --- Main ---

export async function renderSettings(container) {
  const [history, prefs, aiConfig, currentLang, mutedStore] = await Promise.all([
    sendMsg({ type: 'get_history' }),
    loadPrefs(),
    getAIConfig(),
    getLanguagePreference(),
    chrome.storage.local.get('mutedChecks'),
  ]);
  const mutedChecks = mutedStore?.mutedChecks ?? [];

  container.innerHTML = `
    <div class="settings-wrap">
      ${renderLanguageSection(currentLang)}
      ${renderHistorySection(history ?? [])}
      ${renderAuditSection(prefs)}
      ${renderViewSection(prefs)}
      ${renderScriptSpySection(prefs)}
      ${renderAlertsSection(prefs)}
      ${renderAISection(aiConfig)}
      ${renderPlanSection()}
      ${renderMutedSection(mutedChecks)}
      ${renderDataSection()}
      ${renderAboutSection()}
    </div>`;

  // --- Wire prefs changes ---
  function bindPref(id, key, type = 'checkbox') {
    const el = container.querySelector(`#${id}`);
    if (!el) { return; }
    el.addEventListener('change', async () => {
      const cur = await loadPrefs();
      let val;
      if (type === 'checkbox') { val = el.checked; }
      else if (type === 'number') { val = parseInt(el.value, 10); }
      else { val = el.value; }
      await savePrefs({ ...cur, [key]: val });
    });
  }

  // Language change → reload popup to apply
  container.querySelector('#pref-lang').addEventListener('change', async (e) => {
    await setLanguage(e.target.value);
    location.reload();
  });

  bindPref('pref-auto-audit', 'autoAudit');
  bindPref('pref-interval', 'auditInterval', 'number');
  bindPref('pref-fp-auto', 'fingerprintAutoCalc');
  bindPref('pref-default-profile', 'defaultProfile', 'select');
  bindPref('pref-spy-auto', 'scriptSpyAutoStart');
  bindPref('pref-show-1p', 'showFirstParty');
  bindPref('pref-alert-drop', 'alertOnScoreDrop');
  bindPref('pref-threshold', 'scoreDropThreshold', 'number');

  // --- AI config ---
  container.querySelector('#input-ai-key').value = aiConfig.apiKey ?? '';
  container.querySelector('#input-ai-model').value = aiConfig.model ?? '';

  container.querySelector('#pref-ai-provider').addEventListener('change', async (e) => {
    const cur = await getAIConfig();
    await saveAIConfig({ ...cur, provider: e.target.value, apiKey: cur.apiKey, model: cur.model });
  });

  container.querySelector('#btn-save-ai').addEventListener('click', async () => {
    const provider = container.querySelector('#pref-ai-provider').value;
    const apiKey = container.querySelector('#input-ai-key').value.trim();
    const model = container.querySelector('#input-ai-model').value.trim();
    await saveAIConfig({ provider, apiKey, model });
    const status = container.querySelector('#ai-status');
    status.textContent = t('settings.ai_saved');
    status.style.color = '#22c55e';
    setTimeout(() => { status.textContent = ''; status.style.color = ''; }, 4000);
  });

  // --- Data actions ---
  container.querySelector('#btn-clear-history')?.addEventListener('click', async () => {
    if (confirm(t('settings.history_confirm'))) {
      await chrome.storage.local.remove('auditHistory');
      renderSettings(container);
    }
  });

  // --- Import / Export config ---
  container.querySelector('#btn-export-config').addEventListener('click', async () => {
    const data = await chrome.storage.local.get(['userPrefs', 'aiConfig']);
    // Strip the API key from export — security
    const exported = {
      version: 1,
      exportedAt: new Date().toISOString(),
      userPrefs: data.userPrefs ?? {},
      aiConfig: data.aiConfig ? { provider: data.aiConfig.provider, model: data.aiConfig.model } : null,
    };
    const blob = new Blob([JSON.stringify(exported, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `browser-audit-config-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  });

  const fileInput = container.querySelector('#input-import-file');
  container.querySelector('#btn-import-config').addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) { return; }
    const status = container.querySelector('#config-status');
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!data.version) { throw new Error(t('settings.import_invalid')); }
      const updates = {};
      if (data.userPrefs && typeof data.userPrefs === 'object') {
        updates.userPrefs = { ...DEFAULTS, ...data.userPrefs };
      }
      if (data.aiConfig?.provider) {
        const cur = await getAIConfig();
        updates.aiConfig = { provider: data.aiConfig.provider, model: data.aiConfig.model ?? '', apiKey: cur.apiKey };
      }
      await chrome.storage.local.set(updates);
      status.textContent = t('settings.import_ok');
      status.style.color = '#22c55e';
      setTimeout(() => renderSettings(container), 1500);
    } catch (err) {
      status.textContent = `Error: ${err.message}`;
      status.style.color = '#ef4444';
    }
    fileInput.value = '';
  });

  container.querySelector('#btn-grant-hosts').addEventListener('click', () => {
    chrome.permissions.request({ origins: ['<all_urls>'] }, (granted) => {
      void chrome.runtime.lastError;
      const status = container.querySelector('#hosts-status');
      status.textContent = granted ? t('settings.deep_granted') : t('settings.deep_denied');
      status.style.color = granted ? '#22c55e' : '#ef4444';
    });
  });

  container.querySelector('#btn-revoke-hosts').addEventListener('click', () => {
    chrome.permissions.remove({ origins: ['<all_urls>'] }, (removed) => {
      void chrome.runtime.lastError;
      const status = container.querySelector('#hosts-status');
      status.textContent = removed ? t('settings.deep_revoked') : '—';
      status.style.color = '#888';
    });
  });

  container.querySelector('#btn-clear-cache').addEventListener('click', async () => {
    await chrome.storage.local.remove('tiCache');
    alert(t('settings.cache_cleared'));
  });

  container.querySelector('#btn-clear-prefs').addEventListener('click', async () => {
    if (confirm(t('settings.prefs_confirm'))) {
      await chrome.storage.local.remove('userPrefs');
      renderSettings(container);
    }
  });

  // --- Muted checks unmute ---
  container.querySelectorAll('.muted-unmute').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.muteId;
      const stored = await chrome.storage.local.get('mutedChecks');
      const next = (stored.mutedChecks ?? []).filter((x) => x !== id);
      await chrome.storage.local.set({ mutedChecks: next });
      // Re-run the audit so the score reflects the change next time the user
      // opens Health, then re-render this Settings view to drop the entry.
      sendMsg({ type: 'run_audit' });
      renderSettings(container);
    });
  });

  // --- External links ---
  container.querySelectorAll('[data-link]').forEach((a) => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      chrome.tabs.create({ url: a.href });
    });
  });

  // --- Feedback button — opens GitHub issue with pre-filled context ---
  container.querySelector('#btn-feedback')?.addEventListener('click', () => {
    const ua = navigator.userAgent;
    const chromeVersion = (ua.match(/Chrome\/([\d.]+)/) || [])[1] ?? 'unknown';
    const lang = navigator.language;
    const body = encodeURIComponent(
`**Tipo:** [Bug / Sugerencia / Pregunta]

**Descripción:**


**Pasos para reproducir (si aplica):**
1.
2.
3.

**Contexto:**
- Lucent versión: 0.2.2
- Chrome: ${chromeVersion}
- SO/idioma: ${lang}
`
    );
    chrome.tabs.create({
      url: `https://github.com/wilasky/browser-audit/issues/new?body=${body}`,
    });
  });
}
