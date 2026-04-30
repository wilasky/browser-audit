import { esc } from '../../shared/sanitize.js';
import { analyzeScriptSource, fetchScriptSource } from '../../shared/script-analyzer.js';
import { t, localized } from '../../shared/i18n.js';
import knownHashes from '../../data/known-hashes.json';

// Build a Map<hash, entry> once at module load — O(1) lookup per analysis.
const KNOWN_HASH_MAP = new Map(knownHashes.entries.map((e) => [e.hash, e]));

// Persisted hash history per script URL. Limit to last 5 entries to avoid
// unbounded storage growth across many sites.
const HASH_HISTORY_KEY = 'scriptHashHistory';
const HASH_HISTORY_PER_URL = 5;

async function pushHashHistory(url, hash) {
  const stored = await chrome.storage.local.get(HASH_HISTORY_KEY);
  const all = stored[HASH_HISTORY_KEY] ?? {};
  const list = all[url] ?? [];
  // Don't duplicate consecutive identical hashes
  if (list.length === 0 || list[list.length - 1].hash !== hash) {
    list.push({ hash, seenAt: Date.now() });
    while (list.length > HASH_HISTORY_PER_URL) { list.shift(); }
    all[url] = list;
    await chrome.storage.local.set({ [HASH_HISTORY_KEY]: all });
  }
  return list;
}

function renderHashStatus(history, currentHash) {
  // history is the list AFTER pushing the current hash. Compare current
  // against the previous entry (if any) to detect a change since last visit.
  if (history.length === 1) {
    return `<div class="hash-status hash-status-new">${esc(t('sd.hash_first'))}</div>`;
  }
  const prev = history[history.length - 2];
  const prevDate = new Date(prev.seenAt).toLocaleDateString();
  if (prev.hash === currentHash) {
    return `<div class="hash-status hash-status-ok">${esc(t('sd.hash_unchanged', { date: prevDate }))}</div>`;
  }
  return `<div class="hash-status hash-status-changed">${esc(t('sd.hash_changed', { date: prevDate, prev: prev.hash.slice(0, 12) + '…' }))}</div>`;
}

function renderKnownMatch(hash) {
  const entry = KNOWN_HASH_MAP.get(hash);
  if (!entry) { return ''; }
  const trustLabel = localized(knownHashes.trustLevels?.[entry.trust]) || entry.trust;
  return `<div class="hash-status hash-status-known">${t('sd.known_match', {
    vendor: esc(entry.vendor), version: esc(entry.version), trust: esc(trustLabel),
  })}</div>`;
}

function renderSourceMap(sourceMapUrl) {
  if (!sourceMapUrl) { return ''; }
  return `
    <div class="hash-status hash-status-known">
      <span>${esc(t('sd.source_map_label'))}: <code>${esc(sourceMapUrl.length > 60 ? sourceMapUrl.slice(0, 57) + '…' : sourceMapUrl)}</code></span>
      <button class="btn-icon source-map-btn" data-source-map="${esc(sourceMapUrl)}" title="${esc(t('sd.source_map_tip'))}">${esc(t('sd.source_map_btn'))}</button>
    </div>`;
}

function renderExfiltration(exf) {
  if (!exf) { return ''; }
  const readsList = exf.reads.map((r) => `<code>${esc(r)}</code>`).join(' · ');
  const sendsList = exf.sends.map((s) => `<code>${esc(s)}</code>`).join(' · ');
  return `
    <section class="exfil-warn">
      <h3 class="sd-section-title">${esc(t('sd.exfil_title'))}</h3>
      <p class="exfil-msg">${t('sd.exfil_msg')}</p>
      <div class="exfil-rows">
        <div><span class="settings-hint">${esc(t('sd.exfil_reads'))}:</span> ${readsList}</div>
        <div><span class="settings-hint">${esc(t('sd.exfil_sends'))}:</span> ${sendsList}</div>
      </div>
    </section>`;
}

function sendMsg(msg) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(msg, (r) => {
      void chrome.runtime.lastError;
      resolve(r ?? null);
    });
  });
}

function fmtBytes(n) {
  if (n === null || n === undefined) { return '—'; }
  if (n < 1024) { return `${n} B`; }
  if (n < 1024 * 1024) { return `${(n / 1024).toFixed(1)} KB`; }
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

function fmtMs(n) {
  if (n === null || n === undefined) { return '—'; }
  return `${n} ms`;
}

function deliveryLabel(deliveryType) {
  if (deliveryType === 'cache')          { return t('sd.runtime_delivery_cache'); }
  if (deliveryType === 'navigational-prefetch') { return t('sd.runtime_delivery_sw'); }
  if (!deliveryType || deliveryType === '')     { return t('sd.runtime_delivery_net'); }
  return deliveryType;
}

function asyncLabel(info) {
  if (info.async) { return t('sd.runtime_async_async'); }
  if (info.defer) { return t('sd.runtime_async_defer'); }
  return t('sd.runtime_async_sync');
}

function renderRuntimeTechSheet(info) {
  if (!info?.timing && info?.sri === null && info?.async === null) {
    return `<p class="settings-hint">${esc(t('sd.runtime_no_timing'))}</p>`;
  }
  const t1 = info.timing;
  const rows = [];
  if (t1) {
    rows.push([t('sd.runtime_size'),
      t('sd.runtime_size_value', { transferred: fmtBytes(t1.transferSize), decoded: fmtBytes(t1.decodedBodySize) })]);
    rows.push([t('sd.runtime_duration'), fmtMs(t1.duration)]);
    if (t1.nextHopProtocol) { rows.push([t('sd.runtime_protocol'), t1.nextHopProtocol]); }
    rows.push([t('sd.runtime_delivery'), deliveryLabel(t1.deliveryType)]);
    if (t1.initiatorType) { rows.push([t('sd.runtime_initiator'), t1.initiatorType]); }
  }
  if (info.async !== null) { rows.push([t('sd.runtime_async'), asyncLabel(info)]); }
  if (info.sri !== null) {
    rows.push([t('sd.runtime_sri'),
      info.sri ? t('sd.runtime_sri_yes', { hash: info.sri.slice(0, 24) + '…' }) : t('sd.runtime_sri_no')]);
  }
  return `<table class="sd-rt-table">${rows.map(([k, v]) => `<tr><td>${esc(k)}</td><td>${esc(v)}</td></tr>`).join('')}</table>`;
}

function renderRuntimeBehavior(script) {
  const events = Object.entries(script.eventCounts ?? {})
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1]);
  if (!events.length) {
    return `<p class="settings-hint">${esc(t('sd.runtime_no_events'))}</p>`;
  }
  const eventChips = events.map(([type, n]) =>
    `<span class="evt-chip">${esc(type)} ×${n}</span>`).join('');
  const targets = (script.targetsContacted ?? []).slice(0, 12);
  const targetsRow = targets.length
    ? `<div class="sd-rt-targets"><strong>${esc(t('sd.runtime_targets'))}:</strong> ${targets.map(esc).join(', ')}</div>`
    : '';
  return `
    <div class="sd-rt-events">${eventChips}</div>
    ${targetsRow}`;
}

async function renderRuntimeFallback(container, script, errorReason) {
  const url = script.url;
  let domain = '';
  try { domain = new URL(url).hostname; } catch { domain = url; }

  let info = null;
  if (script._tabId) {
    const res = await sendMsg({ type: 'get_script_runtime_info', tabId: script._tabId, url });
    if (res?.ok) { info = res.info; }
  }

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

      <div class="sd-rt-banner">
        <div class="sd-rt-banner-msg">${esc(t('sd.runtime_banner', { reason: errorReason }))}</div>
        <div class="settings-hint">${esc(t('sd.runtime_subtitle'))}</div>
        <div class="sd-rt-banner-btns">
          <button id="btn-rt-retry" class="btn-secondary">${esc(t('sd.runtime_retry'))}</button>
          <button id="btn-rt-view-source" class="btn-secondary">${esc(t('sd.runtime_view_source'))}</button>
        </div>
      </div>

      <h3 class="sd-section-title">${esc(t('sd.runtime_section_tech'))}</h3>
      ${info ? renderRuntimeTechSheet(info) : `<p class="settings-hint">${esc(t('sd.runtime_no_dom'))}</p>`}

      <h3 class="sd-section-title">${esc(t('sd.runtime_section_behavior'))}</h3>
      ${renderRuntimeBehavior(script)}

      <h3 class="sd-section-title">${esc(t('sd.runtime_section_lookups'))}</h3>
      ${buildLookupLinks(domain, null)}
    </div>`;

  container.querySelector('#btn-sd-back').addEventListener('click', () => {
    container.dispatchEvent(new CustomEvent('sd-back', { bubbles: true }));
  });
  container.querySelector('#btn-rt-retry').addEventListener('click', () => {
    renderScriptDetail(container, script);
  });
  container.querySelector('#btn-rt-view-source').addEventListener('click', async () => {
    // Chrome blocks tabs.create({url:'view-source:...'}). Copy the prefixed
    // URL to the clipboard so the user pastes it into the address bar.
    const btn = container.querySelector('#btn-rt-view-source');
    try {
      await navigator.clipboard.writeText(`view-source:${url}`);
      const orig = btn.textContent;
      btn.textContent = t('sd.runtime_view_source_copied');
      setTimeout(() => { btn.textContent = orig; }, 3000);
    } catch {
      // Clipboard blocked too — fall back to opening the URL plain.
      chrome.tabs.create({ url });
    }
  });
  container.querySelectorAll('.lookup-link').forEach((a) => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      const href = a.dataset.href;
      if (href) { chrome.tabs.create({ url: href }); }
    });
  });
}

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
      <a class="lookup-link" data-href="${esc(vt)}">${esc(t('sd.lookup_vt_domain'))}</a>
      ${vthash ? `<a class="lookup-link" data-href="${esc(vthash)}">${esc(t('sd.lookup_vt_hash'))}</a>` : ''}
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
            <td class="sd-desc">${esc(t(f.descKey))}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>`;
}

function renderEndpoints(endpoints) {
  if (!endpoints?.length) {
    return `<p class="settings-hint">${esc(t('sd.endpoints_none'))}</p>`;
  }
  const rows = endpoints.map((e) => {
    let host = e.url;
    try { host = new URL(e.url).hostname; } catch { /* keep raw */ }
    return `
      <tr>
        <td><code class="endp-api">${esc(e.api)}</code></td>
        <td class="endp-host"><code>${esc(host)}</code></td>
        <td class="endp-url settings-hint" title="${esc(e.url)}">${esc(e.url.length > 60 ? e.url.slice(0, 57) + '…' : e.url)}</td>
      </tr>`;
  }).join('');
  return `<table class="sd-table sd-endp-table"><tbody>${rows}</tbody></table>`;
}

function renderObfuscation(obf) {
  const color = obf.level === 'high' ? '#ef4444' : obf.level === 'medium' ? '#f59e0b' : '#22c55e';
  const findings = obf.findings.length
    ? obf.findings.map((f) => `<li>${esc(f.label)} <span class="settings-hint">×${f.count} — ${esc(t(f.descKey))}</span></li>`).join('')
    : `<li class="settings-hint">${esc(t('sd.no_obf'))}</li>`;

  const levelLabel = t(`sa.obf_level_${obf.level}`);

  return `
    <div class="sd-obf">
      <div class="sd-obf-head">
        <strong>${esc(t('sd.obf_score_label'))} <span style="color:${color}">${obf.score}/100</span> (${esc(levelLabel)})</strong>
        <span class="settings-hint">${esc(t('sd.escape_ratio'))} ${esc(obf.escapeRatio)}</span>
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
    if (code === null) {
      // url === 'inline' — there is no source URL to fetch. Show the runtime
      // fallback so the user still gets behavior + lookups.
      await renderRuntimeFallback(container, script, t('sd.runtime_inline'));
      return;
    }

    const analysis = await analyzeScriptSource(code, url);
    const verdictColor = VERDICT_COLOR[analysis.verdict.level];

    // Translate verdict text from background ('critical'/'high'/'medium'/'low')
    const verdictText = t(`verdict.${analysis.verdict.level}`);

    // Persist this hash and look it up against (a) prior visits to this URL
    // and (b) the curated known-hashes DB. Both surface as small status
    // banners directly under the verdict.
    const history = await pushHashHistory(url, analysis.stats.hash);
    const hashStatusHTML = renderHashStatus(history, analysis.stats.hash);
    const knownMatchHTML = renderKnownMatch(analysis.stats.hash);
    const sourceMapHTML = renderSourceMap(analysis.sourceMapUrl);
    const exfiltrationHTML = renderExfiltration(analysis.exfiltration);

    body.innerHTML = `
      <div class="sd-verdict" style="border-left:4px solid ${verdictColor}">
        <div class="sd-verdict-score" style="color:${verdictColor}">${analysis.totalRiskScore}/100</div>
        <div>
          <div class="sd-verdict-label" style="color:${verdictColor}">${esc(analysis.verdict.level.toUpperCase())}</div>
          <div class="settings-hint">${esc(verdictText)}</div>
        </div>
      </div>

      ${knownMatchHTML}
      ${hashStatusHTML}
      ${sourceMapHTML}
      ${exfiltrationHTML}

      <div class="sd-stats">
        <div class="sd-stat"><strong>${analysis.stats.sizeKB}</strong> KB</div>
        <div class="sd-stat"><strong>${analysis.stats.lines}</strong> ${esc(t('sd.lines'))}</div>
        <div class="sd-stat sd-stat-hash">
          <span class="settings-hint">SHA256:</span>
          <code class="sd-hash" title="${esc(analysis.stats.hash)}">${esc(analysis.stats.hash.slice(0, 16))}…</code>
          <button id="btn-copy-sd-hash" class="btn-icon" title="${esc(t('sd.copy_hash_full'))}">⎘</button>
        </div>
      </div>

      <h3 class="sd-section-title">${esc(t('sd.lookup_external'))}</h3>
      ${buildLookupLinks(domain, analysis.stats.hash)}

      <h3 class="sd-section-title">${esc(t('sd.suspicious_apis'))}</h3>
      ${renderFindings(analysis.findings)}

      <h3 class="sd-section-title">${esc(t('sd.endpoints_title'))}${analysis.endpoints?.length ? ` (${analysis.endpoints.length})` : ''}</h3>
      ${renderEndpoints(analysis.endpoints ?? [])}

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

    body.querySelectorAll('.source-map-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const url = btn.dataset.sourceMap;
        if (url) { chrome.tabs.create({ url }); }
      });
    });
  } catch (err) {
    const errMsg = String(err.message || err);
    const isPermIssue = /permiso|permission/i.test(errMsg);

    // Permission errors are actionable on their own (ask for host permission
    // and retry). For everything else — CDN block, HTTP error, CORS — fall
    // through to the runtime fallback so the user gets a useful tech sheet
    // instead of a dead-end.
    if (isPermIssue) {
      body.innerHTML = `
        <p class="error">${esc(t('common.error'))}: ${esc(errMsg)}</p>
        <p class="settings-hint" style="margin-top:8px">${esc(t('sd.error_perm'))}</p>
        <button id="btn-grant-now" class="btn-primary" style="margin-top:8px">${esc(t('sd.grant_now'))}</button>`;
      body.querySelector('#btn-grant-now')?.addEventListener('click', () => {
        chrome.permissions.request({ origins: ['<all_urls>'] }, (granted) => {
          void chrome.runtime.lastError;
          if (granted) { renderScriptDetail(container, script); }
        });
      });
      return;
    }

    await renderRuntimeFallback(container, script, errMsg);
  }
}
