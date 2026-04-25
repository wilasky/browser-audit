import { calculateFingerprintDetail } from '../../shared/fingerprint.js';

const UNIQUENESS_LABEL = {
  common: { text: 'Común', cls: 'fp-common', icon: '🟢' },
  rare:   { text: 'Único',  cls: 'fp-rare',   icon: '🔴' },
};

function renderSignal(s) {
  const u = UNIQUENESS_LABEL[s.uniqueness] ?? UNIQUENESS_LABEL.common;
  const bits = s.entropyBits.toFixed(1);
  const barWidth = Math.min(100, (s.entropyBits / 10) * 100);
  const barColor = s.uniqueness === 'rare' ? '#ef4444' : '#22c55e';

  return `
    <div class="fp-signal ${s.highlight ? 'fp-highlight' : ''}">
      <div class="fp-signal-header">
        <span class="fp-signal-name">${s.name}</span>
        <span class="fp-uniq ${u.cls}">${u.icon} ${u.text}</span>
        <span class="fp-bits">${bits} bits</span>
      </div>
      <div class="fp-value">${s.value}</div>
      <div class="fp-bar-wrap">
        <div class="fp-bar" style="width:${barWidth}%;background:${barColor}"></div>
      </div>
      <div class="fp-tip">${s.tip}</div>
    </div>`;
}

export async function renderFingerprintDetail(container) {
  container.innerHTML = '<p class="loading">Calculando huella digital detallada…</p>';

  try {
    const detail = await calculateFingerprintDetail();
    const color = detail.level === 'green' ? '#22c55e' : detail.level === 'amber' ? '#f59e0b' : '#ef4444';
    const rare = detail.signals.filter((s) => s.uniqueness === 'rare').length;

    container.innerHTML = `
      <div class="fp-wrap">
        <div class="fp-header">
          <button class="fp-back link-btn" id="btn-fp-back">← Volver</button>
          <h2 class="fp-title">Huella digital del navegador</h2>
        </div>

        <div class="fp-score-row">
          <div class="fp-total" style="color:${color}">${detail.totalEntropy} bits</div>
          <div class="fp-score-meta">
            <div class="fp-level-text" style="color:${color}">${detail.levelText}</div>
            <div class="fp-stats">${rare} señal${rare !== 1 ? 'es' : ''} única${rare !== 1 ? 's' : ''} de ${detail.signals.length}</div>
          </div>
        </div>

        <div class="fp-entropy-bar-wrap">
          <div class="fp-entropy-bar" style="width:${Math.min(100, (detail.totalEntropy / 40) * 100)}%;background:${color}"></div>
          <div class="fp-entropy-scale">
            <span>0</span><span>20 bits<br><small>común</small></span>
            <span>30 bits<br><small>único</small></span><span>40+</span>
          </div>
        </div>

        <div class="fp-signals">
          ${detail.signals.map(renderSignal).join('')}
        </div>

        <div class="fp-footer">
          <p>Para reducir tu huella: usa Firefox + uBlock Origin, o el modo Turbo de Brave.
          Chrome ofrece poca protección contra fingerprinting por diseño.</p>
          <a href="#" id="btn-fp-eff" class="link-btn">Ver análisis completo en Cover Your Tracks (EFF) ↗</a>
        </div>
      </div>`;

    container.querySelector('#btn-fp-back').addEventListener('click', () => {
      container.dispatchEvent(new CustomEvent('fp-back'));
    });

    container.querySelector('#btn-fp-eff').addEventListener('click', (e) => {
      e.preventDefault();
      chrome.tabs.create({ url: 'https://coveryourtracks.eff.org/' });
    });
  } catch (err) {
    container.innerHTML = `<p class="error">Error calculando huella: ${err.message}</p>`;
  }
}
