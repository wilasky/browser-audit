import { exportAuditJSON, exportAuditPDF } from '../export.js';

const STATUS_ICON = { pass: '✓', warn: '⚠', fail: '✗', skipped: '—', unknown: '?' };
const STATUS_CLASS = { pass: 'pass', warn: 'warn', fail: 'fail', skipped: 'skip', unknown: 'skip' };

const PROFILES = {
  all:     { label: 'Todo',           filter: () => true },
  basic:   { label: 'Básico',         filter: (r) => ['critical', 'high'].includes(r.severity) },
  privacy: { label: 'Privacidad',     filter: (r) => r.category === 'privacy' || r.category === 'leaks' || r.category === 'fingerprint' },
  security:{ label: 'Seguridad',      filter: (r) => r.category === 'security' || r.category === 'updates' },
  failed:  { label: 'Solo fallos',    filter: (r) => r.status === 'fail' || r.status === 'warn' },
};

function sendMsg(msg) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(msg, (result) => {
      void chrome.runtime.lastError;
      resolve(result ?? null);
    });
  });
}

function scoreCircleSVG(score, level) {
  const r = 44;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  const color = level === 'green' ? '#22c55e' : level === 'amber' ? '#f59e0b' : '#ef4444';

  return `
    <svg viewBox="0 0 100 100" class="score-circle">
      <circle cx="50" cy="50" r="${r}" fill="none" stroke="#2a2a2e" stroke-width="10"/>
      <circle cx="50" cy="50" r="${r}" fill="none" stroke="${color}" stroke-width="10"
        stroke-dasharray="${dash.toFixed(1)} ${circ.toFixed(1)}"
        stroke-dashoffset="${circ / 4}"
        stroke-linecap="round"/>
      <text x="50" y="54" text-anchor="middle" font-size="22" font-weight="700" fill="${color}">${score}</text>
    </svg>`;
}

function groupByCategory(results, categories) {
  const map = {};
  for (const cat of categories) { map[cat.id] = { ...cat, checks: [] }; }
  for (const r of results) {
    if (map[r.category]) { map[r.category].checks.push(r); }
  }
  return Object.values(map).filter((c) => c.checks.length > 0);
}

function severityLabel(severity) {
  const labels = { critical: 'CRÍTICO', high: 'ALTO', medium: 'MEDIO', low: 'BAJO' };
  const cls = { critical: 'sev-critical', high: 'sev-high', medium: 'sev-medium', low: 'sev-low' };
  return `<span class="sev-badge ${cls[severity] ?? ''}">${labels[severity] ?? severity}</span>`;
}

function renderCheck(r, fixMap) {
  const cls = STATUS_CLASS[r.status] ?? 'skip';
  const icon = STATUS_ICON[r.status] ?? '?';
  const fix = fixMap[r.id];

  const showFix = fix && r.status !== 'pass' && r.status !== 'skipped';
  const canApply = fix?.type === 'apply' || r.canApply;

  let fixBtn = '';
  if (showFix) {
    if (canApply) {
      fixBtn = `<button class="fix-btn fix-apply" data-check-id="${r.id}">⚡ Aplicar ahora</button>`;
    } else if (fix.type === 'navigate' || fix.type === 'externalLink') {
      fixBtn = `<button class="fix-btn" data-check-id="${r.id}">Arreglar →</button>`;
    } else {
      fixBtn = `<button class="fix-btn" data-check-id="${r.id}">Ver opciones</button>`;
    }
  }

  return `
    <li class="check-item check-${cls}" data-check-id="${r.id}">
      <div class="check-row">
        <span class="check-icon">${icon}</span>
        <div class="check-main">
          <div class="check-title-row">
            <span class="check-title">${r.title}</span>
            ${severityLabel(r.severity)}
          </div>
          <span class="check-detail">${r.detail ?? ''}</span>
        </div>
        <div class="check-actions">${fixBtn}</div>
      </div>
      <div class="check-rationale" id="rationale-${r.id}" style="display:none">
        ${r.rationale ?? ''}
        ${fix?.instructions ? `<div class="fix-instructions">${fix.instructions}</div>` : ''}
      </div>
    </li>`;
}

function renderCategory(cat, fixMap) {
  const pass = cat.checks.filter((c) => c.status === 'pass').length;
  const fail = cat.checks.filter((c) => c.status === 'fail').length;
  const warn = cat.checks.filter((c) => c.status === 'warn').length;

  const checks = cat.checks.map((r) => renderCheck(r, fixMap)).join('');
  const statsHtml = [
    fail > 0 ? `<span class="cat-stat stat-fail">${fail} fallo${fail > 1 ? 's' : ''}</span>` : '',
    warn > 0 ? `<span class="cat-stat stat-warn">${warn} aviso${warn > 1 ? 's' : ''}</span>` : '',
    pass > 0 ? `<span class="cat-stat stat-pass">${pass} ok</span>` : '',
  ].filter(Boolean).join('');

  return `
    <section class="category">
      <div class="cat-header">
        <h2 class="cat-title">${cat.icon} ${cat.label}</h2>
        <div class="cat-stats">${statsHtml}</div>
      </div>
      <ul class="check-list">${checks}</ul>
    </section>`;
}

function renderProfileSelector(activeProfile) {
  return Object.entries(PROFILES).map(([key, p]) =>
    `<button class="profile-btn ${key === activeProfile ? 'active' : ''}" data-profile="${key}">${p.label}</button>`
  ).join('');
}

function applyFix(fix, api, expected, btn) {
  if (fix?.type === 'apply' || api) {
    // Apply directly via background
    btn.disabled = true;
    btn.textContent = 'Aplicando…';
    sendMsg({ type: 'apply_fix', api, value: expected }).then((res) => {
      if (res?.ok) {
        btn.textContent = '✓ Aplicado';
        btn.classList.add('fix-applied');
        // Update the check item visual
        const item = btn.closest('.check-item');
        if (item) { item.className = item.className.replace(/check-\w+/, 'check-pass'); }
        const icon = item?.querySelector('.check-icon');
        if (icon) { icon.textContent = '✓'; }
      } else {
        btn.disabled = false;
        btn.textContent = '⚡ Aplicar ahora';
        const item = btn.closest('.check-item');
        if (item) {
          let err = item.querySelector('.apply-error');
          if (!err) { err = document.createElement('div'); err.className = 'apply-error'; item.appendChild(err); }
          err.textContent = res?.reason ?? 'No se pudo aplicar — requiere permiso "privacy"';
        }
      }
    });
    return;
  }
  if ((fix?.type === 'navigate' || fix?.type === 'externalLink') && fix.url) {
    chrome.tabs.create({ url: fix.url });
    return;
  }
  if (fix?.type === 'showInstructions' && fix.instructions) {
    const existing = btn.parentElement.querySelector('.fix-instructions');
    if (existing) { existing.remove(); return; }
    const panel = document.createElement('div');
    panel.className = 'fix-instructions';
    panel.textContent = fix.instructions;
    btn.parentElement.appendChild(panel);
  }
}

export function renderHealthOverview(audit, container) {
  let activeProfile = 'all';
  const { label, level } = audit;

  const fixMap = {};
  const apiMap = {};   // checkId -> api string (for direct apply)
  const expectedMap = {}; // checkId -> expected value

  for (const r of audit.results) {
    if (r.fix) { fixMap[r.id] = r.fix; }
    if (r.api) { apiMap[r.id] = r.api; }
    if (r.expected !== undefined) { expectedMap[r.id] = r.expected; }
  }

  function render() {
    const profileFilter = PROFILES[activeProfile].filter;
    const filtered = audit.results.filter(profileFilter);

    const filteredScore = (() => {
      let tw = 0, lost = 0;
      for (const r of filtered) {
        if (r.status === 'skipped') { continue; }
        tw += r.weight;
        if (r.status === 'fail') { lost += r.weight; }
        if (r.status === 'warn') { lost += r.weight * 0.5; }
      }
      return tw === 0 ? 100 : Math.max(0, Math.round(100 - (lost / tw) * 100));
    })();

    const groups = groupByCategory(filtered, audit.categories);

    container.innerHTML = `
      <div class="overview-header">
        ${scoreCircleSVG(filteredScore, level)}
        <div class="score-meta">
          <div class="score-label">${label}</div>
          <div class="score-sub">
            ${audit.results.filter((r) => r.status === 'fail').length} fallos ·
            ${audit.results.filter((r) => r.status === 'warn').length} avisos ·
            ${audit.results.filter((r) => r.status === 'pass').length} ok
          </div>
          <div class="score-sub">${new Date(audit.completedAt).toLocaleTimeString()} · baseline v${audit.baselineVersion}</div>
          <div class="header-actions">
            <button id="btn-refresh" class="btn-secondary">↺ Actualizar</button>
            <button id="btn-grant-permissions" class="btn-secondary">+ Activar chequeos</button>
            <div class="export-row">
              <button id="btn-export-json" class="btn-export">↓ JSON</button>
              <button id="btn-export-pdf" class="btn-export">↓ PDF</button>
            </div>
          </div>
        </div>
      </div>

      <div class="profile-bar">
        <span class="profile-label">Vista:</span>
        ${renderProfileSelector(activeProfile)}
      </div>

      <div class="categories">${groups.map((c) => renderCategory(c, fixMap)).join('')}</div>`;

    // Events
    container.querySelector('#btn-refresh').addEventListener('click', async () => {
      container.innerHTML = '<p class="loading">Auditando…</p>';
      const freshAudit = await sendMsg({ type: 'run_audit' });
      if (freshAudit) { renderHealthOverview(freshAudit, container); }
    });

    container.querySelector('#btn-grant-permissions').addEventListener('click', () => {
      chrome.permissions.request({ permissions: ['management', 'privacy'] }, async (granted) => {
        void chrome.runtime.lastError;
        if (granted) {
          container.innerHTML = '<p class="loading">Auditando con todos los permisos…</p>';
          const freshAudit = await sendMsg({ type: 'run_audit' });
          if (freshAudit) { renderHealthOverview(freshAudit, container); }
        }
      });
    });

    container.querySelector('#btn-export-json').addEventListener('click', () => exportAuditJSON(audit));
    container.querySelector('#btn-export-pdf').addEventListener('click', () => exportAuditPDF(audit));

    // Profile filter buttons
    container.querySelectorAll('.profile-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        activeProfile = btn.dataset.profile;
        render();
      });
    });

    // Fix / Apply buttons
    container.querySelectorAll('.fix-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const checkId = btn.dataset.checkId;
        const fix = fixMap[checkId];
        const api = apiMap[checkId];
        const expected = expectedMap[checkId];
        applyFix(fix, api, expected, btn);
      });
    });

    // Click on check title row toggles rationale
    container.querySelectorAll('.check-item').forEach((item) => {
      item.querySelector('.check-title-row')?.addEventListener('click', () => {
        const id = item.dataset.checkId;
        const panel = document.getElementById(`rationale-${id}`);
        if (panel) { panel.style.display = panel.style.display === 'none' ? 'block' : 'none'; }
      });
    });
  }

  render();
}
