import { exportAuditJSON, exportAuditPDF } from '../export.js';
import { esc } from '../../shared/sanitize.js';
import { t } from '../../shared/i18n.js';
import { checkText } from '../../shared/baseline-i18n.js';
import baseline from '../../data/baseline.v1.json';

const STATUS_ICON = { pass: '✓', warn: '⚠', fail: '✗', skipped: '—', unknown: '?' };
const STATUS_CLASS = { pass: 'pass', warn: 'warn', fail: 'fail', skipped: 'skip', unknown: 'skip' };

// Score labels come from audit-engine in Spanish — translate to current locale here
function translateScoreLabel(label) {
  const map = {
    'Excelente': t('score.excellent'),
    'Bueno': t('score.good'),
    'Mejorable': t('score.improvable'),
    'Riesgo moderado': t('score.moderate_risk'),
    'Riesgo elevado': t('score.high_risk'),
    'Riesgo crítico': t('score.critical'),
  };
  return map[label] ?? label;
}

function getProfiles() {
  return {
    all:      { label: t('profile.standard'), filter: (r) => !r.advanced },
    advanced: { label: t('profile.advanced'), filter: () => true },
    basic:    { label: t('profile.basic'),    filter: (r) => ['critical', 'high'].includes(r.severity) && !r.advanced },
    failed:   { label: t('profile.failed'),   filter: (r) => r.status === 'fail' || r.status === 'warn' },
    CIS:      { label: 'CIS',       filter: (r) => (r.frameworks ?? []).some((f) => f.startsWith('CIS')) },
    CCN:      { label: 'ENS',       filter: (r) => (r.frameworks ?? []).some((f) => f.startsWith('CCN')) },
    NIST:     { label: 'NIST',      filter: (r) => (r.frameworks ?? []).some((f) => f.startsWith('NIST')) },
  };
}
const PROFILES = getProfiles();

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
  const labels = {
    critical: t('severity.critical'),
    high: t('severity.high'),
    medium: t('severity.medium'),
    low: t('severity.low'),
  };
  const cls = { critical: 'sev-critical', high: 'sev-high', medium: 'sev-medium', low: 'sev-low' };
  return `<span class="sev-badge ${cls[severity] ?? ''}">${esc(labels[severity] ?? severity)}</span>`;
}

function frameworkBadges(frameworks) {
  if (!frameworks || frameworks.length === 0) { return ''; }
  // Show one consolidated badge: families joined, full IDs in tooltip
  const families = [...new Set(frameworks.map((f) => f.split('-')[0]))];
  const tooltip = frameworks.join(' · ');
  return `<span class="fw-badge" title="${esc(tooltip)}">${esc(families.join(' '))}</span>`;
}

function renderCheck(r, fixMap) {
  const cls = STATUS_CLASS[r.status] ?? 'skip';
  const icon = STATUS_ICON[r.status] ?? '?';
  const fix = fixMap[r.id];

  const isFingerprintCheck = r.id === 'fingerprint-entropy';
  const showFix = fix && r.status !== 'pass' && r.status !== 'skipped';
  const canApply = fix?.type === 'apply' || r.canApply;

  // Fingerprint check always shows a "Ver detalles" button
  const detailBtn = isFingerprintCheck
    ? `<button class="fix-btn fix-detail" data-check-id="${r.id}">${esc(t('health.see_details'))}</button>`
    : '';

  let fixBtn = '';
  if (showFix) {
    if (canApply) {
      fixBtn = `<button class="fix-btn fix-apply" data-check-id="${r.id}">${esc(t('health.apply_now'))}</button>`;
    } else if (fix.type === 'navigate' || fix.type === 'externalLink') {
      fixBtn = `<button class="fix-btn" data-check-id="${r.id}">${esc(t('health.fix_btn'))}</button>`;
    } else {
      fixBtn = `<button class="fix-btn" data-check-id="${r.id}">${esc(t('health.show_options'))}</button>`;
    }
  }

  return `
    <li class="check-item check-${cls}" data-check-id="${esc(r.id)}">
      <div class="check-row">
        <span class="check-icon">${esc(icon)}</span>
        <div class="check-main">
          <div class="check-title-row">
            <span class="check-title">${esc(checkText(r.id, r.title, 'title'))}</span>
            ${severityLabel(r.severity)}
            ${frameworkBadges(r.frameworks)}
          </div>
          <span class="check-detail">${esc(r.detail ?? '')}</span>
        </div>
        <div class="check-actions">${detailBtn}${fixBtn}</div>
      </div>
      <div class="check-rationale" id="rationale-${esc(r.id)}" style="display:none">
        ${esc(checkText(r.id, r.rationale, 'rationale'))}
        ${fix?.instructions ? `<div class="fix-instructions">${esc(checkText(r.id, fix.instructions, 'instructions'))}</div>` : ''}
      </div>
    </li>`;
}

function renderCategory(cat, fixMap) {
  const pass = cat.checks.filter((c) => c.status === 'pass').length;
  const fail = cat.checks.filter((c) => c.status === 'fail').length;
  const warn = cat.checks.filter((c) => c.status === 'warn').length;

  const checks = cat.checks.map((r) => renderCheck(r, fixMap)).join('');
  const statsHtml = [
    fail > 0 ? `<span class="cat-stat stat-fail">${fail} ${esc(t('status.fail'))}</span>` : '',
    warn > 0 ? `<span class="cat-stat stat-warn">${warn} ${esc(t('status.warn'))}</span>` : '',
    pass > 0 ? `<span class="cat-stat stat-pass">${pass} ${esc(t('status.pass'))}</span>` : '',
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

async function applyFix(fix, api, expected, btn) {
  if (fix?.type === 'apply' || api) {
    btn.disabled = true;
    btn.textContent = t('health.applying');

    // Auto-request privacy permission if missing
    const hasPrivacy = await new Promise((resolve) =>
      chrome.permissions.contains({ permissions: ['privacy'] }, (has) => {
        void chrome.runtime.lastError;
        resolve(has);
      })
    );

    if (!hasPrivacy) {
      btn.textContent = t('health.requesting_perm');
      const granted = await new Promise((resolve) =>
        chrome.permissions.request({ permissions: ['privacy'] }, (g) => {
          void chrome.runtime.lastError;
          resolve(g);
        })
      );
      if (!granted) {
        btn.disabled = false;
        btn.textContent = t('health.apply_now');
        const item = btn.closest('.check-item');
        if (item) {
          let err = item.querySelector('.apply-error');
          if (!err) { err = document.createElement('div'); err.className = 'apply-error'; item.appendChild(err); }
          err.textContent = t('health.no_perm_apply');
        }
        return;
      }
    }

    const res = await sendMsg({ type: 'apply_fix', api, value: expected });
    if (res?.ok) {
      btn.textContent = t('health.applied');
      btn.classList.add('fix-applied');
      const item = btn.closest('.check-item');
      if (item) { item.className = item.className.replace(/check-\w+/, 'check-pass'); }
      const icon = item?.querySelector('.check-icon');
      if (icon) { icon.textContent = '✓'; }
    } else {
      btn.disabled = false;
      btn.textContent = t('health.apply_now');
      const item = btn.closest('.check-item');
      if (item) {
        let err = item.querySelector('.apply-error');
        if (!err) { err = document.createElement('div'); err.className = 'apply-error'; item.appendChild(err); }
        err.textContent = res?.reason ?? 'No se pudo aplicar (puede requerir reauditar para verificar).';
      }
    }
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

export async function renderHealthOverview(audit, container) {
  // Read user-configured default profile from prefs
  const stored = await chrome.storage.local.get('userPrefs');
  const defaultProfile = stored.userPrefs?.defaultProfile ?? 'all';
  let activeProfile = PROFILES[defaultProfile] ? defaultProfile : 'all';
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
        // Same rule as audit-engine: only pass/warn/fail count
        if (r.status !== 'pass' && r.status !== 'warn' && r.status !== 'fail') { continue; }
        tw += r.weight;
        if (r.status === 'fail') { lost += r.weight; }
        if (r.status === 'warn') { lost += r.weight * 0.5; }
      }
      return tw === 0 ? 100 : Math.max(0, Math.round(100 - (lost / tw) * 100));
    })();

    const groups = groupByCategory(filtered, audit.categories);

    // Stats based on current profile filter, not full audit
    const fc = filtered.filter((r) => r.status === 'fail').length;
    const wc = filtered.filter((r) => r.status === 'warn').length;
    const pc = filtered.filter((r) => r.status === 'pass').length;
    const sc = filtered.filter((r) => r.status === 'skipped').length;
    const uc = filtered.filter((r) => r.status === 'unknown').length;

    const isFiltered = activeProfile !== 'all';
    const profileLabel = PROFILES[activeProfile].label;

    container.innerHTML = `
      <div class="overview-header">
        ${scoreCircleSVG(filteredScore, level)}
        <div class="score-meta">
          <div class="score-label">${esc(translateScoreLabel(label))}</div>
          <div class="score-sub">
            <strong>${filtered.length}</strong> ${esc(t('status.checks'))} ·
            <span style="color:#ef4444">${fc} ${esc(t('status.fail'))}</span> ·
            <span style="color:#f59e0b">${wc} ${esc(t('status.warn'))}</span> ·
            <span style="color:#22c55e">${pc} ${esc(t('status.pass'))}</span>${sc + uc > 0 ? ` · ${sc + uc} ${esc(t('status.na'))}` : ''}
          </div>
          ${isFiltered ? `<div class="score-sub score-context">${esc(t('health.score_filter'))} <strong>${esc(profileLabel)}</strong> · ${esc(t('health.score_global'))}: <strong>${audit.score}</strong></div>` : ''}
          <div class="score-sub">${esc(t('health.audited_label'))} ${new Date(audit.completedAt).toLocaleTimeString()} · ${esc(t('health.checks_count'))}${esc(audit.baselineVersion)}</div>
          <div class="header-actions">
            <button id="btn-refresh" class="btn-secondary">${esc(t('health.refresh'))}</button>
            ${sc > 0 ? `<button id="btn-grant-permissions" class="btn-secondary btn-grant" title="${esc(t('health.grant_tip', { n: sc }))}">${esc(t('health.grant', { n: sc }))}</button>` : ''}
            <button id="btn-reset-fixes" class="btn-secondary btn-reset" title="${esc(t('health.reset_tip'))}">${esc(t('health.reset'))}</button>
            <div class="export-row">
              <button id="btn-export-json" class="btn-export">↓ JSON</button>
              <button id="btn-export-pdf" class="btn-export">↓ PDF</button>
              <button id="btn-import-json" class="btn-export">${esc(t('health.import'))}</button>
              <input type="file" id="input-audit-json" accept="application/json" style="display:none"/>
            </div>
          </div>
        </div>
      </div>

      <div class="profile-bar">
        <span class="profile-label">${esc(t('profile.label'))}</span>
        ${renderProfileSelector(activeProfile)}
      </div>

      <div class="categories">${groups.map((c) => renderCategory(c, fixMap)).join('')}</div>`;

    // Events
    container.querySelector('#btn-refresh').addEventListener('click', async () => {
      container.innerHTML = `<p class="loading">${esc(t('health.auditing'))}</p>`;
      const freshAudit = await sendMsg({ type: 'run_audit' });
      if (freshAudit) { renderHealthOverview(freshAudit, container); }
    });

    container.querySelector('#btn-grant-permissions')?.addEventListener('click', () => {
      chrome.permissions.request({ permissions: ['management', 'privacy', 'contentSettings'] }, async (granted) => {
        void chrome.runtime.lastError;
        if (granted) {
          container.innerHTML = `<p class="loading">${esc(t('health.auditing'))}</p>`;
          const freshAudit = await sendMsg({ type: 'run_audit' });
          if (freshAudit) { renderHealthOverview(freshAudit, container); }
        }
      });
    });

    // Build a filtered audit copy that respects the active profile
    const filteredAudit = {
      ...audit,
      score: filteredScore,
      results: filtered,
      profile: activeProfile,
      profileLabel: PROFILES[activeProfile].label,
    };

    container.querySelector('#btn-export-json').addEventListener('click', () => exportAuditJSON(filteredAudit));
    container.querySelector('#btn-export-pdf').addEventListener('click', () => exportAuditPDF(filteredAudit));

    // Import previously exported audit
    const fileInput = container.querySelector('#input-audit-json');
    container.querySelector('#btn-import-json').addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', async (e) => {
      const file = e.target.files?.[0];
      if (!file) { return; }
      try {
        const data = JSON.parse(await file.text());
        if (!data.results || !Array.isArray(data.results)) {
          throw new Error(t('health.import_invalid'));
        }

        // Build a baseline lookup so we can enrich older exports that didn't include api/expected
        const baselineMap = {};
        for (const c of baseline.checks) {
          if (c.method?.api && c.method?.expected !== undefined && c.method?.canApply) {
            baselineMap[c.id] = { api: c.method.api, value: c.method.expected };
          }
        }

        // Detect applicable settings: prefer JSON's api/expected, fall back to baseline by id
        const applicableFixes = data.results
          .filter((r) => r.status === 'pass')
          .map((r) => {
            if (r.api && r.expected !== undefined && r.expected !== null) {
              return { api: r.api, value: r.expected };
            }
            if (baselineMap[r.id]) { return baselineMap[r.id]; }
            return null;
          })
          .filter(Boolean);

        let shouldApply = false;
        if (applicableFixes.length > 0) {
          shouldApply = confirm(
            `Este archivo contiene ${applicableFixes.length} ajustes hardenizados.\n\n` +
            '¿Aplicarlos a tu Chrome ahora?\n\n' +
            'OK = Aplicar (sube el score real)\n' +
            'Cancelar = Solo ver el audit (no aplica nada)'
          );
        }

        if (shouldApply) {
          // Request privacy permission if needed
          const hasPrivacy = await new Promise((resolve) =>
            chrome.permissions.contains({ permissions: ['privacy'] }, (has) => {
              void chrome.runtime.lastError;
              resolve(has);
            })
          );
          if (!hasPrivacy) {
            const granted = await new Promise((resolve) =>
              chrome.permissions.request({ permissions: ['privacy'] }, (g) => {
                void chrome.runtime.lastError;
                resolve(g);
              })
            );
            if (!granted) {
              alert(t('health.no_perm_apply'));
              shouldApply = false;
            }
          }
        }

        if (shouldApply) {
          container.innerHTML = `<p class="loading">Aplicando ${applicableFixes.length} ajustes…</p>`;
          const res = await sendMsg({ type: 'apply_batch', fixes: applicableFixes });
          // After applying, re-run a real audit to show actual current state
          container.innerHTML = `<p class="loading">${esc(t('health.auditing'))}</p>`;
          const fresh = await sendMsg({ type: 'run_audit' });
          if (fresh) {
            renderHealthOverview(fresh, container);
            setTimeout(() => alert(`✓ ${res?.applied ?? 0} ajustes aplicados.`), 100);
          }
        } else {
          // Just visualize the imported audit
          const importedAudit = {
            score: data.score ?? audit.score,
            label: data.label ?? audit.label,
            level: data.level ?? audit.level,
            completedAt: data.completedAt ? new Date(data.completedAt).getTime() : Date.now(),
            baselineVersion: data.baselineVersion ?? 'imported',
            results: data.results,
            categories: audit.categories,
          };
          await chrome.storage.local.set({ lastAudit: importedAudit });
          renderHealthOverview(importedAudit, container);
        }
      } catch (err) {
        alert(t('health.import_error', { msg: err.message }));
      }
      fileInput.value = '';
    });

    container.querySelector('#btn-reset-fixes').addEventListener('click', async () => {
      // Send ALL applicable APIs from the audit to reset — works even for changes
      // made before tracking was implemented
      const apis = audit.results
        .filter((r) => r.canApply && r.api)
        .map((r) => r.api);
      if (apis.length === 0) {
        alert(t('health.reset_no_changes'));
        return;
      }
      if (!confirm(t('health.reset_confirm', { n: apis.length }))) { return; }
      const res = await sendMsg({ type: 'reset_applied_fixes', apis });
      if (res) {
        container.innerHTML = `<p class="loading">${esc(t('health.reset_done', { n: res.count }))}</p>`;
        const fresh = await sendMsg({ type: 'run_audit' });
        if (fresh) { renderHealthOverview(fresh, container); }
      } else {
        alert(t('health.reset_error'));
      }
    });

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
        // Localize instructions for the inline panel
        const localFix = fix ? { ...fix, instructions: fix.instructions ? checkText(checkId, fix.instructions, 'instructions') : fix.instructions } : fix;
        applyFix(localFix, api, expected, btn);
      });
    });

    // Click on check title row toggles rationale
    container.querySelectorAll('.check-item').forEach((item) => {
      item.querySelector('.check-title-row')?.addEventListener('click', () => {
        const id = item.dataset.checkId;
        if (id === 'fingerprint-entropy') {
          container.dispatchEvent(new CustomEvent('open-fingerprint', { bubbles: true }));
          return;
        }
        const panel = document.getElementById(`rationale-${id}`);
        if (panel) { panel.style.display = panel.style.display === 'none' ? 'block' : 'none'; }
      });
    });
  }

  render();
}
