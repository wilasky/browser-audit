import { esc } from '../../shared/sanitize.js';
import { t } from '../../shared/i18n.js';
import { checkText, translateDetail } from '../../shared/baseline-i18n.js';

const STATUS_ICON = { pass: '✓', warn: '⚠', fail: '✗', skipped: '—', unknown: '?' };
const STATUS_COLOR = {
  pass: '#22c55e',
  warn: '#f59e0b',
  fail: '#ef4444',
  skipped: '#666',
  unknown: '#666',
};

function sendMsg(msg) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(msg, (r) => {
      void chrome.runtime.lastError;
      resolve(r ?? null);
    });
  });
}

function renderFrameworkChips(frameworks) {
  if (!frameworks?.length) {
    return `<span class="settings-hint">${esc(t('hd.frameworks_none'))}</span>`;
  }
  return frameworks.map((f) =>
    `<span class="hd-fw-chip">${esc(f)}</span>`
  ).join('');
}

function severityChip(severity) {
  const labels = {
    critical: t('severity.critical'),
    high: t('severity.high'),
    medium: t('severity.medium'),
    low: t('severity.low'),
  };
  const cls = { critical: 'sev-critical', high: 'sev-high', medium: 'sev-medium', low: 'sev-low' };
  return `<span class="sev-badge ${cls[severity] ?? ''}">${esc(labels[severity] ?? severity)}</span>`;
}

export async function renderHealthDetail(container, check) {
  const status = check.status ?? 'unknown';
  const icon = STATUS_ICON[status];
  const color = STATUS_COLOR[status];
  const isMuted = !!check.muted;

  const title = checkText(check.id, check.title, 'title');
  const rationale = checkText(check.id, check.rationale, 'rationale');
  const detail = translateDetail(check.detail ?? '');
  const fixInstructions = check.fix?.instructions
    ? checkText(check.id, check.fix.instructions, 'instructions')
    : null;

  // Action buttons depend on what the check supports
  const actions = [];
  if (check.canApply && check.api && check.expected !== undefined && status !== 'pass' && !isMuted) {
    actions.push({ id: 'btn-hd-apply', label: t('health.apply_now'), cls: 'btn-primary' });
  }
  if (check.fix?.url) {
    actions.push({ id: 'btn-hd-open', label: t('hd.action_open'), cls: 'btn-secondary', url: check.fix.url });
  }
  if (status === 'fail' || status === 'warn' || isMuted) {
    actions.push({
      id: 'btn-hd-mute',
      label: isMuted ? t('health.unmute_btn') : t('health.mute_btn'),
      cls: 'btn-secondary',
    });
  }

  const apiLine = check.api
    ? `<tr><td>${esc(t('hd.api_label'))}</td><td><code>${esc(check.api)}</code></td></tr>`
    : '';
  const expectedLine = check.expected !== undefined && check.expected !== null
    ? `<tr><td>${esc(t('hd.expected_label'))}</td><td><code>${esc(String(check.expected))}</code></td></tr>`
    : '';

  container.innerHTML = `
    <div class="hd-wrap">
      <div class="hd-header">
        <button id="btn-hd-back" class="link-btn">${esc(t('btn.back'))}</button>
        <strong>${esc(t('hd.title'))}</strong>
      </div>

      <div class="hd-status-row" style="border-left:4px solid ${color}">
        <div class="hd-status-icon" style="color:${color}">${esc(icon)}</div>
        <div class="hd-status-main">
          <div class="hd-title">${esc(title)}</div>
          <div class="hd-status-text" style="color:${color}">${esc(t(`status.${status === 'pass' ? 'pass' : status === 'warn' ? 'warn' : status === 'fail' ? 'fail' : 'na'}`))}</div>
          ${isMuted ? `<span class="muted-chip" style="margin-top:4px">${esc(t('health.muted_chip'))}</span>` : ''}
        </div>
      </div>

      <div class="hd-meta-grid">
        <div class="hd-meta-item">
          <div class="hd-meta-label">${esc(t('hd.severity_label'))}</div>
          ${severityChip(check.severity)}
        </div>
        <div class="hd-meta-item">
          <div class="hd-meta-label">${esc(t('hd.weight_label'))}</div>
          <span class="hd-weight">${esc(String(check.weight ?? '?'))}</span>
        </div>
      </div>

      <div class="hd-section">
        <div class="hd-section-label">${esc(t('hd.frameworks_label'))}</div>
        <div class="hd-fw-row">${renderFrameworkChips(check.frameworks)}</div>
      </div>

      ${detail ? `
        <div class="hd-section">
          <div class="hd-section-label">${esc(t('hd.detail_label'))}</div>
          <div class="hd-detail-value">${esc(detail)}</div>
        </div>` : ''}

      ${rationale ? `
        <div class="hd-section">
          <div class="hd-section-label">${esc(t('hd.rationale_label'))}</div>
          <div class="hd-rationale">${esc(rationale)}</div>
        </div>` : ''}

      ${fixInstructions ? `
        <div class="hd-section hd-section-fix">
          <div class="hd-section-label">${esc(t('hd.fix_label'))}</div>
          <div class="hd-fix-text">${esc(fixInstructions)}</div>
        </div>` : ''}

      ${(apiLine || expectedLine) ? `
        <div class="hd-section">
          <div class="hd-section-label">${esc(t('hd.tech_label'))}</div>
          <table class="hd-tech-table">
            ${apiLine}
            ${expectedLine}
            ${check.method?.type ? `<tr><td>${esc(t('hd.method_label'))}</td><td><code>${esc(check.method.type)}</code></td></tr>` : ''}
          </table>
        </div>` : ''}

      ${actions.length ? `
        <div class="hd-section">
          <div class="hd-section-label">${esc(t('hd.actions_label'))}</div>
          <div class="hd-actions">
            ${actions.map((a) => `<button id="${a.id}" class="${a.cls}" ${a.url ? `data-url="${esc(a.url)}"` : ''}>${esc(a.label)}</button>`).join('')}
          </div>
        </div>` : ''}
    </div>`;

  container.querySelector('#btn-hd-back').addEventListener('click', () => {
    container.dispatchEvent(new CustomEvent('hd-back', { bubbles: true }));
  });

  container.querySelector('#btn-hd-open')?.addEventListener('click', () => {
    const url = container.querySelector('#btn-hd-open')?.dataset.url;
    if (url) { chrome.tabs.create({ url }); }
  });

  container.querySelector('#btn-hd-apply')?.addEventListener('click', async () => {
    const btn = container.querySelector('#btn-hd-apply');
    btn.disabled = true;
    btn.textContent = t('health.applying');
    const res = await sendMsg({ type: 'apply_fix', api: check.api, value: check.expected });
    if (res?.ok) {
      // Force a fresh audit so lastAudit reflects the new state, then bounce
      // back. Without this, the overview re-renders with the stale audit
      // result and the check still shows as failing.
      await sendMsg({ type: 'run_audit' });
      container.dispatchEvent(new CustomEvent('hd-back', { bubbles: true }));
    } else {
      btn.disabled = false;
      btn.textContent = t('health.apply_now');
      let err = container.querySelector('.hd-apply-error');
      if (!err) {
        err = document.createElement('div');
        err.className = 'hd-apply-error apply-error';
        btn.parentElement.appendChild(err);
      }
      err.textContent = res?.reason ?? t('health.audit_failed');
    }
  });

  container.querySelector('#btn-hd-mute')?.addEventListener('click', async () => {
    const stored = await chrome.storage.local.get('mutedChecks');
    const set = new Set(stored.mutedChecks ?? []);
    if (set.has(check.id)) { set.delete(check.id); } else { set.add(check.id); }
    await chrome.storage.local.set({ mutedChecks: [...set] });
    // Wait for the re-audit to complete so the overview shows the muted
    // state (and the recalculated score) on the next render.
    await sendMsg({ type: 'run_audit' });
    container.dispatchEvent(new CustomEvent('hd-back', { bubbles: true }));
  });
}
