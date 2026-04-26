import { calculateFingerprintDetail } from '../../shared/fingerprint.js';
import { esc } from '../../shared/sanitize.js';
import { t } from '../../shared/i18n.js';

function getUniq() {
  return {
    common: { text: t('fp.uniqueness_common'), cls: 'fp-common', icon: '●' },
    rare:   { text: t('fp.uniqueness_rare'),   cls: 'fp-rare',   icon: '◆' },
  };
}

function renderSignal(s) {
  const UNIQ = getUniq();
  const u = UNIQ[s.uniqueness] ?? UNIQ.common;
  const bits = s.entropyBits.toFixed(1);
  const barPct = Math.min(100, (s.entropyBits / 10) * 100);
  const barColor = s.uniqueness === 'rare' ? '#ef4444' : '#22c55e';

  return `
    <div class="fp-signal ${s.highlight ? 'fp-highlight' : ''}">
      <div class="fp-signal-header">
        <span class="fp-signal-name">${esc(s.name)}</span>
        <span class="fp-bits">${esc(bits)} bits</span>
        <span class="fp-uniq ${u.cls}">${esc(u.icon)} ${esc(u.text)}</span>
      </div>
      <div class="fp-value" title="${esc(s.value)}">${esc(s.value)}</div>
      <div class="fp-bar-wrap"><div class="fp-bar" style="width:${barPct}%;background:${barColor}"></div></div>
      <div class="fp-tip">${esc(s.detail)}</div>
    </div>`;
}

export async function renderFingerprintDetail(container) {
  container.innerHTML = `<p class="loading">${esc(t('fp.calculating'))}</p>`;

  try {
    const d = await calculateFingerprintDetail();
    const color = d.level === 'green' ? '#22c55e' : d.level === 'amber' ? '#f59e0b' : '#ef4444';
    const rare = d.signals.filter((s) => s.uniqueness === 'rare').length;
    const barPct = Math.min(100, (d.totalEntropy / 40) * 100);

    // Translate the level text from background ('green'/'amber'/'red')
    const levelKey = d.level === 'green' ? 'fp.level_low' : d.level === 'amber' ? 'fp.level_medium' : 'fp.level_high';

    container.innerHTML = `
      <div class="fp-wrap">
        <div class="fp-header">
          <button id="btn-fp-back" class="link-btn">${esc(t('btn.back'))}</button>
          <span class="fp-title">${esc(t('fp.title'))}</span>
        </div>

        <div class="fp-score-row">
          <div class="fp-total" style="color:${color}">${d.totalEntropy}</div>
          <div>
            <div class="fp-bits-label">${esc(t('fp.bits_label'))}</div>
            <div class="fp-level-text" style="color:${color}">${esc(t(levelKey))}</div>
            <div class="fp-stats">${esc(t('fp.unique_signals', { n: rare, total: d.signals.length }))}</div>
          </div>
        </div>

        <div class="fp-entropy-bar-wrap">
          <div class="fp-entropy-bar" style="width:${barPct}%;background:${color}"></div>
        </div>
        <div class="fp-entropy-scale">
          <span>0</span><span style="margin-left:50%">22 · ~</span><span style="margin-left:auto">40+ bits</span>
        </div>

        <div class="fp-hash-row">
          <span class="fp-hash-label">${esc(t('fp.id_label'))}</span>
          <span class="fp-hash-val" id="fp-hash">${esc(d.fingerprintHash)}</span>
          <button id="btn-copy-hash" class="btn-export" title="${esc(t('fp.copy_hash_tip'))}">⎘</button>
        </div>

        <div class="fp-signals">
          ${d.signals.map(renderSignal).join('')}
        </div>

        <div class="fp-actions-block">
          <h3 class="fp-actions-title">${esc(t('fp.actions_title'))}</h3>

          <div class="fp-action">
            <div class="fp-action-head">
              <strong>${esc(t('fp.action1_title'))}</strong>
              <button class="fp-action-btn" data-flag="chrome://flags/#reduce-user-agent">${esc(t('fp.action_btn1'))}</button>
            </div>
            <p class="fp-action-desc">${t('fp.action1_desc')}</p>
          </div>

          <div class="fp-action">
            <div class="fp-action-head">
              <strong>${esc(t('fp.action2_title'))}</strong>
              <button class="fp-action-btn" data-flag="https://chromewebstore.google.com/search/canvas%20blocker">${esc(t('fp.action_btn2'))}</button>
            </div>
            <p class="fp-action-desc">${t('fp.action2_desc')}</p>
          </div>

          <div class="fp-action">
            <div class="fp-action-head">
              <strong>${esc(t('fp.action3_title'))}</strong>
              <button class="fp-action-btn" data-flag="https://brave.com/download/">${esc(t('fp.action_btn3'))}</button>
            </div>
            <p class="fp-action-desc">${t('fp.action3_desc')}</p>
          </div>

          <div class="fp-action">
            <div class="fp-action-head">
              <strong>${esc(t('fp.action4_title'))}</strong>
              <button class="fp-action-btn" data-flag="https://www.torproject.org/download/">${esc(t('fp.action_btn4'))}</button>
            </div>
            <p class="fp-action-desc">${t('fp.action4_desc')}</p>
          </div>

          ${d.canvasBlocked
            ? `<div class="fp-success">${esc(t('fp.canvas_blocked'))}</div>`
            : ''}
        </div>

        <div class="fp-footer">
          <p>${t('fp.what_is')}</p>

          <p style="margin-top:8px"><strong>${esc(t('fp.compare_title'))}</strong>:</p>
          <div class="fp-compare-links">
            <button class="fp-action-btn" data-flag="https://coveryourtracks.eff.org/">EFF Cover Your Tracks</button>
            <button class="fp-action-btn" data-flag="https://amiunique.org/fp">amiunique.org</button>
            <button class="fp-action-btn" data-flag="https://browserleaks.com/">BrowserLeaks</button>
            <button class="fp-action-btn" data-flag="https://abrahamjuliot.github.io/creepjs/">CreepJS</button>
          </div>
          <p style="margin-top:6px;font-size:9px;color:#444">${esc(t('fp.compare_note'))}</p>
        </div>
      </div>`;

    container.querySelector('#btn-fp-back').addEventListener('click', () => {
      container.dispatchEvent(new CustomEvent('fp-back', { bubbles: true }));
    });

    container.querySelector('#btn-copy-hash').addEventListener('click', async () => {
      await navigator.clipboard.writeText(d.fingerprintHash).catch(() => {});
      const btn = container.querySelector('#btn-copy-hash');
      btn.textContent = '✓';
      setTimeout(() => { btn.textContent = '⎘'; }, 1500);
    });

    container.querySelectorAll('.fp-action-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const url = btn.dataset.flag;
        if (url) { chrome.tabs.create({ url }); }
      });
    });
  } catch (err) {
    const p = document.createElement('p');
    p.className = 'error';
    p.textContent = t('fp.error_calc', { msg: err.message });
    container.replaceChildren(p);
  }
}
