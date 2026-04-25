import { calculateFingerprintDetail } from '../../shared/fingerprint.js';
import { esc } from '../../shared/sanitize.js';

const UNIQ = {
  common: { text: 'Común',  cls: 'fp-common', icon: '●' },
  rare:   { text: 'Único',  cls: 'fp-rare',   icon: '◆' },
};

function renderSignal(s) {
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
  container.innerHTML = '<p class="loading">Calculando huella digital…</p>';

  try {
    const d = await calculateFingerprintDetail();
    const color = d.level === 'green' ? '#22c55e' : d.level === 'amber' ? '#f59e0b' : '#ef4444';
    const rare = d.signals.filter((s) => s.uniqueness === 'rare').length;
    const barPct = Math.min(100, (d.totalEntropy / 40) * 100);

    container.innerHTML = `
      <div class="fp-wrap">
        <div class="fp-header">
          <button id="btn-fp-back" class="link-btn">← Volver</button>
          <span class="fp-title">Análisis de huella digital</span>
        </div>

        <div class="fp-score-row">
          <div class="fp-total" style="color:${color}">${d.totalEntropy}</div>
          <div>
            <div class="fp-bits-label">bits de entropía</div>
            <div class="fp-level-text" style="color:${color}">${esc(d.levelText)}</div>
            <div class="fp-stats">${rare} señal${rare !== 1 ? 'es únicas' : ' única'} de ${d.signals.length}</div>
          </div>
        </div>

        <div class="fp-entropy-bar-wrap">
          <div class="fp-entropy-bar" style="width:${barPct}%;background:${color}"></div>
        </div>
        <div class="fp-entropy-scale">
          <span>0</span><span style="margin-left:50%">22 · moderado</span><span style="margin-left:auto">40+ bits</span>
        </div>

        <div class="fp-hash-row">
          <span class="fp-hash-label">ID de tu navegador:</span>
          <span class="fp-hash-val" id="fp-hash">${esc(d.fingerprintHash)}</span>
          <button id="btn-copy-hash" class="btn-export" title="Copiar hash">⎘</button>
        </div>

        <div class="fp-signals">
          ${d.signals.map(renderSignal).join('')}
        </div>

        <div class="fp-actions-block">
          <h3 class="fp-actions-title">⚙ Cómo reducir tu huella</h3>

          <div class="fp-action">
            <div class="fp-action-head">
              <strong>1. Activar User-Agent reducido (Chrome)</strong>
              <button class="fp-action-btn" data-flag="chrome://flags/#reduce-user-agent">Abrir flag →</button>
            </div>
            <p class="fp-action-desc">
              Chrome puede reducir la información del User-Agent automáticamente.
              Esto reduce ~3 bits de entropía. Activa <code>Reduce User-Agent string</code>.
            </p>
          </div>

          <div class="fp-action">
            <div class="fp-action-head">
              <strong>2. Bloquear canvas con extensión</strong>
              <button class="fp-action-btn" data-flag="https://chromewebstore.google.com/search/canvas%20blocker">Buscar →</button>
            </div>
            <p class="fp-action-desc">
              Chrome no bloquea canvas nativamente. Instala una extensión como
              <code>Canvas Blocker</code> o <code>Trace</code> que añadan ruido aleatorio.
              Reduce ~8 bits de entropía.
            </p>
          </div>

          <div class="fp-action">
            <div class="fp-action-head">
              <strong>3. Cambiar a Brave o Firefox</strong>
              <button class="fp-action-btn" data-flag="https://brave.com/download/">Brave →</button>
            </div>
            <p class="fp-action-desc">
              <strong>Brave</strong> bloquea canvas, WebGL y audio fingerprinting por defecto.
              <strong>Firefox</strong> con "Strict tracking protection" también lo hace.
              Cero configuración necesaria.
            </p>
          </div>

          <div class="fp-action">
            <div class="fp-action-head">
              <strong>4. Tor Browser (máxima privacidad)</strong>
              <button class="fp-action-btn" data-flag="https://www.torproject.org/download/">Descargar →</button>
            </div>
            <p class="fp-action-desc">
              Para casos extremos: Tor Browser estandariza todas las señales para que
              todos los usuarios tengan el mismo fingerprint (~10 bits de entropía total).
              Más lento pero indistinguible.
            </p>
          </div>

          ${d.canvasBlocked
            ? '<div class="fp-success">✓ Tu navegador YA está bloqueando el canvas fingerprint. Buen trabajo.</div>'
            : ''}
        </div>

        <div class="fp-footer">
          <p><strong>¿Qué es esto?</strong> Cada señal es un dato que tu navegador revela a las webs que visitas.
          Combinadas forman un identificador casi único aunque borres las cookies. El hash de arriba representa
          tu "huella" actual — sería el ID con el que te seguiría un tracker.</p>
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
    p.textContent = `Error calculando huella: ${err.message}`;
    container.replaceChildren(p);
  }
}
