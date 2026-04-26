import { esc } from '../../shared/sanitize.js';
import { analyzeScriptSource, fetchScriptSource } from '../../shared/script-analyzer.js';
import { t } from '../../shared/i18n.js';

const VERDICT_COLOR = {
  critical: '#ef4444',
  high: '#f59e0b',
  medium: '#aaaaff',
  low: '#22c55e',
};

function buildLookupLinks(domain, hash) {
  const vt = `https://www.virustotal.com/gui/domain/${encodeURIComponent(domain)}`;
  const us = `https://urlscan.io/domain/${encodeURIComponent(domain)}`;
  const uh = `https://urlhaus.abuse.ch/browse.php?search=${encodeURIComponent(domain)}`;
  const sb = `https://transparencyreport.google.com/safe-browsing/search?url=${encodeURIComponent(domain)}`;
  const vthash = hash ? `https://www.virustotal.com/gui/file/${hash}` : null;

  return `
    <div class="sd-lookups">
      <a class="lookup-link" data-href="${esc(vt)}">VT (dominio)</a>
      ${vthash ? `<a class="lookup-link" data-href="${esc(vthash)}">VT (hash SHA256)</a>` : ''}
      <a class="lookup-link" data-href="${esc(us)}">urlscan</a>
      <a class="lookup-link" data-href="${esc(uh)}">URLhaus</a>
      <a class="lookup-link" data-href="${esc(sb)}">Safe Browsing</a>
    </div>`;
}

function renderFindings(findings) {
  if (!findings.length) {
    return `<p class="settings-hint">${esc(t('sd.no_apis'))}</p>`;
  }
  return `
    <table class="sd-table">
      <thead><tr><th>${esc(t('sd.col_api'))}</th><th>${esc(t('sd.col_count'))}</th><th>${esc(t('sd.col_risk'))}</th><th>${esc(t('sd.col_desc'))}</th></tr></thead>
      <tbody>
        ${findings.map((f) => `
          <tr>
            <td><code>${esc(f.label)}</code></td>
            <td>${f.count}</td>
            <td><span class="sd-score">${f.score}</span></td>
            <td class="sd-desc">${esc(f.desc)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>`;
}

function renderObfuscation(obf) {
  const color = obf.level === 'high' ? '#ef4444' : obf.level === 'medium' ? '#f59e0b' : '#22c55e';
  const findings = obf.findings.length
    ? obf.findings.map((f) => `<li>${esc(f.label)} <span class="settings-hint">×${f.count} — ${esc(f.desc)}</span></li>`).join('')
    : `<li class="settings-hint">${esc(t('sd.no_obf'))}</li>`;

  return `
    <div class="sd-obf">
      <div class="sd-obf-head">
        <strong>Obfuscación: <span style="color:${color}">${obf.score}/100</span> (${esc(obf.level)})</strong>
        <span class="settings-hint">Escape ratio: ${esc(obf.escapeRatio)}</span>
      </div>
      <ul>${findings}</ul>
    </div>`;
}

function renderUrlsList(urls) {
  if (!urls.length) { return `<p class="settings-hint">${esc(t('sd.no_urls'))}</p>`; }
  return `
    <ul class="sd-list">
      ${urls.map((u) => `<li><code>${esc(u)}</code></li>`).join('')}
    </ul>`;
}

function renderIpsList(ips) {
  if (!ips.length) { return `<p class="settings-hint">${esc(t('sd.no_ips'))}</p>`; }
  return `
    <ul class="sd-list">
      ${ips.map((ip) => `<li><code>${esc(ip)}</code></li>`).join('')}
    </ul>`;
}

function renderBase64List(b64) {
  if (!b64.length) { return `<p class="settings-hint">${esc(t('sd.no_base64'))}</p>`; }
  return `
    <ul class="sd-list">
      ${b64.map((s) => `<li><code title="${esc(s)}">${esc(s.slice(0, 60))}…</code></li>`).join('')}
    </ul>`;
}

export async function renderScriptDetail(container, script) {
  const url = script.url;
  let domain = '';
  try { domain = new URL(url).hostname; } catch { domain = url; }

  container.innerHTML = `
    <div class="sd-wrap">
      <div class="sd-header">
        <button id="btn-sd-back" class="link-btn">${esc(t('btn.back'))}</button>
        <strong>${esc(t('sd.title'))}</strong>
      </div>

      <div class="sd-meta">
        <div class="sd-url" title="${esc(url)}">${esc(url)}</div>
        <div class="settings-hint">${esc(domain)}</div>
      </div>

      <div id="sd-body">
        <p class="loading">${esc(t('sd.downloading'))}</p>
      </div>
    </div>`;

  container.querySelector('#btn-sd-back').addEventListener('click', () => {
    container.dispatchEvent(new CustomEvent('sd-back', { bubbles: true }));
  });

  const body = container.querySelector('#sd-body');

  try {
    const code = await fetchScriptSource(url);
    if (!code) {
      body.innerHTML = `<p class="error">${esc(t('sd.cant_download'))}</p>`;
      return;
    }

    const analysis = await analyzeScriptSource(code, url);
    const verdictColor = VERDICT_COLOR[analysis.verdict.level];

    // Translate verdict text from background ('critical'/'high'/'medium'/'low')
    const verdictText = t(`verdict.${analysis.verdict.level}`);

    body.innerHTML = `
      <div class="sd-verdict" style="border-left:4px solid ${verdictColor}">
        <div class="sd-verdict-score" style="color:${verdictColor}">${analysis.totalRiskScore}/100</div>
        <div>
          <div class="sd-verdict-label" style="color:${verdictColor}">${esc(analysis.verdict.level.toUpperCase())}</div>
          <div class="settings-hint">${esc(verdictText)}</div>
        </div>
      </div>

      <div class="sd-stats">
        <div class="sd-stat"><strong>${analysis.stats.sizeKB}</strong> KB</div>
        <div class="sd-stat"><strong>${analysis.stats.lines}</strong> ${esc(t('sd.lines'))}</div>
        <div class="sd-stat sd-stat-hash">
          <span class="settings-hint">SHA256:</span>
          <code class="sd-hash" title="${esc(analysis.stats.hash)}">${esc(analysis.stats.hash.slice(0, 16))}…</code>
          <button id="btn-copy-sd-hash" class="btn-export" title="Copiar hash completo">⎘</button>
        </div>
      </div>

      <h3 class="sd-section-title">${esc(t('sd.lookup_external'))}</h3>
      ${buildLookupLinks(domain, analysis.stats.hash)}

      <h3 class="sd-section-title">${esc(t('sd.suspicious_apis'))}</h3>
      ${renderFindings(analysis.findings)}

      <h3 class="sd-section-title">${esc(t('sd.obfuscation'))}</h3>
      ${renderObfuscation(analysis.obfuscation)}

      ${analysis.urls.length > 0 ? `
        <details class="comp-details" open>
          <summary>${esc(t('sd.urls_hardcoded', { n: analysis.urls.length }))}</summary>
          ${renderUrlsList(analysis.urls)}
        </details>` : ''}

      ${analysis.ips.length > 0 ? `
        <details class="comp-details" open>
          <summary>${esc(t('sd.ips_hardcoded', { n: analysis.ips.length }))}</summary>
          ${renderIpsList(analysis.ips)}
        </details>` : ''}

      ${analysis.base64.length > 0 ? `
        <details class="comp-details">
          <summary>${esc(t('sd.base64_strings', { n: analysis.base64.length }))}</summary>
          ${renderBase64List(analysis.base64)}
        </details>` : ''}
    `;

    body.querySelector('#btn-copy-sd-hash')?.addEventListener('click', async () => {
      await navigator.clipboard.writeText(analysis.stats.hash).catch(() => {});
      const btn = body.querySelector('#btn-copy-sd-hash');
      btn.textContent = '✓';
      setTimeout(() => { btn.textContent = '⎘'; }, 1500);
    });

    body.querySelectorAll('.lookup-link').forEach((a) => {
      a.addEventListener('click', (e) => {
        e.preventDefault();
        const href = a.dataset.href;
        if (href) { chrome.tabs.create({ url: href }); }
      });
    });
  } catch (err) {
    const errMsg = String(err.message || err);
    const isPermIssue = /permiso|permission/i.test(errMsg);
    const isCorsIssue = /CORS|fetch|HTTP/i.test(errMsg);

    body.innerHTML = `
      <p class="error">${esc(t('common.error'))}: ${esc(errMsg)}</p>
      ${isPermIssue ? `
        <p class="settings-hint" style="margin-top:8px">${esc(t('sd.error_perm'))}</p>
        <button id="btn-grant-now" class="btn-primary" style="margin-top:8px">${esc(t('sd.grant_now'))}</button>
      ` : ''}
      ${isCorsIssue && !isPermIssue ? `
        <p class="settings-hint" style="margin-top:8px">${esc(t('sd.error_cors'))}</p>
      ` : ''}`;

    body.querySelector('#btn-grant-now')?.addEventListener('click', () => {
      chrome.permissions.request({ origins: ['<all_urls>'] }, (granted) => {
        void chrome.runtime.lastError;
        if (granted) { renderScriptDetail(container, script); }
      });
    });
  }
}
