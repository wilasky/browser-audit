// "Is this site broken?" diagnosis modal.
//
// Cross-references the user's appliedFixes against a curated table of
// hardening settings known to break common website features. If any match
// the active site's domain, they bubble up as "likely culprits". Each entry
// offers a one-click "↶ Revert just this" that calls undo_individual_fix.

import { esc } from '../../shared/sanitize.js';
import { t, localized } from '../../shared/i18n.js';
import breakingTable from '../../data/breaking-settings.json';

function sendMsg(msg) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(msg, (r) => {
      void chrome.runtime.lastError;
      resolve(r ?? null);
    });
  });
}

function getActiveDomain() {
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const url = tabs?.[0]?.url ?? '';
      try {
        const u = new URL(url);
        if (u.protocol === 'http:' || u.protocol === 'https:') {
          resolve(u.hostname);
        } else {
          resolve(null);
        }
      } catch {
        resolve(null);
      }
    });
  });
}

// Match an entry from the breaking table to an applied fix. Both the api
// name and the value must match (different values may have different effects).
function matchEntry(applied, entry) {
  if (applied.api !== entry.api) { return false; }
  // brokenWhen can be a literal value or null/undefined. Use loose equality
  // because storage may serialize boolean false.
  // eslint-disable-next-line eqeqeq
  return applied.value == entry.brokenWhen;
}

// Check if the current domain matches one of the entry's known-affected sites.
// We compare hostname endings so subdomains count (mail.google.com → google.com).
function domainMatches(host, entryDomains) {
  if (!host || !entryDomains?.length) { return false; }
  return entryDomains.some((d) => host === d || host.endsWith(`.${d}`));
}

function renderEntry(entry, applied, isLikelyCulprit) {
  const symptom = localized(entry.symptom);
  return `
    <div class="diag-entry ${isLikelyCulprit ? 'diag-likely' : ''}" data-api="${esc(applied.api)}">
      ${isLikelyCulprit ? '<div class="diag-likely-tag">⭐</div>' : ''}
      <div class="diag-entry-head">
        <code class="diag-api">${esc(applied.api)}</code>
        <code class="diag-value">= ${esc(String(applied.value))}</code>
      </div>
      <div class="diag-symptom">${esc(symptom)}</div>
      <div class="diag-actions">
        <button class="btn-secondary diag-undo-btn" data-undo-api="${esc(applied.api)}">${esc(t('health.diagnose_undo'))}</button>
        <span class="diag-status"></span>
      </div>
    </div>`;
}

export async function openDiagnoseModal(rootContainer) {
  const [domain, stored] = await Promise.all([
    getActiveDomain(),
    chrome.storage.local.get(['appliedFixes', 'hardeningEnabled']),
  ]);

  const appliedRaw = stored.appliedFixes ?? [];
  const applied = appliedRaw
    .filter((a) => typeof a === 'object' && a.api && a.value !== undefined && a.value !== null);

  // Build the modal body depending on what we found.
  let body;
  if (!domain) {
    body = `<p class="settings-hint">${esc(t('health.diagnose_no_tab'))}</p>`;
  } else if (stored.hardeningEnabled === false) {
    // The toggle is paused — settings are cleared in Chrome even though the
    // appliedFixes list is preserved. Don't suggest reverting things that
    // are already inactive.
    body = `<p class="settings-hint">${esc(t('health.diagnose_paused'))}</p>`;
  } else if (applied.length === 0) {
    body = `<p class="settings-hint">${esc(t('health.diagnose_no_fixes'))}</p>`;
  } else {
    // Cross applied fixes with the breaking table.
    const matches = [];
    for (const a of applied) {
      for (const entry of breakingTable.entries) {
        if (matchEntry(a, entry)) {
          matches.push({
            applied: a,
            entry,
            isLikely: domainMatches(domain, entry.domains),
          });
        }
      }
    }
    if (matches.length === 0) {
      body = `<p class="settings-hint">${esc(t('health.diagnose_no_breakers', { n: applied.length }))}</p>`;
    } else {
      // Likely culprits first; the rest below.
      matches.sort((a, b) => Number(b.isLikely) - Number(a.isLikely));
      const hasLikely = matches.some((m) => m.isLikely);
      const heading = hasLikely
        ? `<p class="settings-hint">${esc(t('health.diagnose_intro_likely'))}</p>`
        : `<p class="settings-hint">${esc(t('health.diagnose_intro'))}</p>`;
      body = heading + matches.map((m) => renderEntry(m.entry, m.applied, m.isLikely)).join('');
    }
  }

  // Render the modal as an overlay siblings to root, so it does not get
  // wiped by re-renders of the underlying view.
  let overlay = document.getElementById('diag-overlay');
  if (overlay) { overlay.remove(); }
  overlay = document.createElement('div');
  overlay.id = 'diag-overlay';
  overlay.className = 'diag-overlay';
  overlay.innerHTML = `
    <div class="diag-modal">
      <div class="diag-modal-header">
        <strong>${esc(t('health.diagnose_title'))} ${domain ? `<code>${esc(domain)}</code>` : ''}</strong>
        <button class="diag-close" id="diag-close-btn">✕</button>
      </div>
      <div class="diag-body">${body}</div>
      <div class="diag-modal-footer">
        <button class="btn-secondary" id="diag-close-btn-2">${esc(t('health.diagnose_close'))}</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);

  function close() { overlay.remove(); }
  overlay.querySelector('#diag-close-btn').addEventListener('click', close);
  overlay.querySelector('#diag-close-btn-2').addEventListener('click', close);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) { close(); } });

  overlay.querySelectorAll('.diag-undo-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const api = btn.dataset.undoApi;
      const entry = btn.closest('.diag-entry');
      const status = entry.querySelector('.diag-status');
      btn.disabled = true;
      btn.textContent = t('health.diagnose_reverting');
      const res = await sendMsg({ type: 'undo_individual_fix', api });
      if (res?.ok) {
        status.textContent = t('health.diagnose_reverted');
        status.style.color = '#22c55e';
        entry.classList.add('diag-entry-done');
        // Re-run the audit so the overview reflects the change next time the
        // user closes the modal.
        sendMsg({ type: 'run_audit' });
        // Notify the underlying view it should refresh on next open.
        rootContainer.dispatchEvent(new CustomEvent('diag-undo-done', { bubbles: true }));
      } else {
        btn.disabled = false;
        btn.textContent = t('health.diagnose_undo');
        status.textContent = res?.reason ?? '?';
        status.style.color = '#ef4444';
      }
    });
  });
}
