import { esc } from '../../shared/sanitize.js';
import { isAIConfigured, summarizePrivacyPolicy } from '../../shared/ai-client.js';
import { t, localized } from '../../shared/i18n.js';
import cookiePurposes from '../../data/cookie-purposes.json';
import cmpVendors from '../../data/cmp-vendors.json';
import syncVendors from '../../data/sync-vendors.json';
import tcfPurposes from '../../data/tcf-purposes.json';

// Pre-compile the cookie-purpose regexes once per popup load.
const COMPILED_PURPOSES = cookiePurposes.patterns.map((p) => ({
  ...p,
  rx: new RegExp(p.regex, 'i'),
}));

function classifyCookie(name) {
  for (const p of COMPILED_PURPOSES) {
    if (p.rx.test(name)) {
      return { purpose: p.purpose, vendor: p.vendor ?? null, sensitive: !!p.sensitive };
    }
  }
  return { purpose: 'unknown', vendor: null, sensitive: false };
}

function classifyAllCookies(cookies) {
  const groups = {};
  const sensitive = [];
  for (const c of cookies) {
    const cls = classifyCookie(c.name);
    const key = cls.purpose;
    if (!groups[key]) { groups[key] = []; }
    groups[key].push({ name: c.name, vendor: cls.vendor });
    if (cls.sensitive) {
      sensitive.push({ name: c.name, purpose: cls.purpose });
    }
  }
  return { groups, sensitive };
}

// Match script src + iframe src against a host fragment list.
function hostMatches(host, fragments) {
  if (!host) { return false; }
  return fragments.some((f) => host === f || host.endsWith(`.${f}`));
}

function detectCMPs(thirdPartyScripts, iframes) {
  const hits = [];
  const allHosts = [
    ...thirdPartyScripts,
    ...(iframes ?? []).map((i) => i.host).filter(Boolean),
  ];
  for (const cmp of cmpVendors.vendors) {
    if (allHosts.some((h) => hostMatches(h, cmp.domains))) {
      hits.push({ id: cmp.id, name: cmp.name });
    }
  }
  return hits;
}

function detectSyncVendors(thirdPartyScripts) {
  const hits = [];
  for (const v of syncVendors.vendors) {
    if (thirdPartyScripts.some((h) => hostMatches(h, [v.domain]))) {
      hits.push({ name: v.name, type: v.type, domain: v.domain });
    }
  }
  return hits;
}

function dependencyLevel(thirdPartyCount) {
  if (thirdPartyCount < 5)  { return { key: 'low',    color: '#22c55e' }; }
  if (thirdPartyCount < 15) { return { key: 'medium', color: '#f59e0b' }; }
  return { key: 'high', color: '#ef4444' };
}

function sendMsg(msg) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(msg, (r) => {
      void chrome.runtime.lastError;
      resolve(r ?? null);
    });
  });
}

async function getActiveTabId() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab?.id ?? null;
}

// --- Score calculation ---

function calcCookieScore(r) {
  const issues = [];
  let pts = 100;

  const consentAccepted = r.consentAccepted ?? false;

  // Cookies cargadas y no hay banner detectado — pero si hay consent aceptado, OK
  if (r.cookies.count > 0 && r.banners.length === 0) {
    if (consentAccepted) {
      issues.push({ s: 'pass', t: t('compi.cookies_consent_done') });
    } else {
      issues.push({ s: 'fail', t: t('compi.cookies_no_banner') });
      pts -= 30;
    }
  }

  if (r.banners.length > 0) {
    const b = r.banners[0];
    if (b.hasAcceptBtn && !b.hasRejectBtn) {
      issues.push({ s: 'fail', t: t('compi.banner_no_reject') });
      pts -= 25;
    }
    if (b.hasRejectBtn && b.hasAcceptBtn) {
      issues.push({ s: 'pass', t: t('compi.banner_both_btn') });
    }
    if (!b.hasConfigBtn) {
      issues.push({ s: 'warn', t: t('compi.banner_no_config') });
      pts -= 10;
    }
  } else if (r.cookies.count === 0) {
    issues.push({ s: 'pass', t: t('compi.no_cookies') });
  }

  if (r.cookies.count > 20) {
    issues.push({ s: 'warn', t: t('compi.many_cookies', { n: r.cookies.count }) });
    pts -= 5;
  }

  return { score: Math.max(0, pts), issues };
}

function calcGdprScore(r) {
  const issues = [];
  let pts = 100;

  if (r.policyLinks.length === 0) {
    issues.push({ s: 'fail', t: t('compi.no_policy_link') });
    pts -= 30;
  } else {
    issues.push({ s: 'pass', t: t('compi.policy_linked', { n: r.policyLinks.length }) });
  }

  // Third-party exposure scales with dependencyLevel (low/med/high). Previously
  // a flat -15 above 5 domains, which made 6 and 60 score the same.
  // Now: 0-4 → 0pts, 5-14 (medium) → -15pts, 15+ (high) → -30pts.
  const tpCount = r.thirdPartyScripts.length;
  if (tpCount > 0) {
    const lvl = dependencyLevel(tpCount);
    if (lvl.key === 'high') {
      issues.push({ s: 'fail', t: t('compi.many_third_party', { n: tpCount }) });
      pts -= 30;
    } else if (lvl.key === 'medium') {
      issues.push({ s: 'warn', t: t('compi.many_third_party', { n: tpCount }) });
      pts -= 15;
    }
  }

  for (const form of r.forms) {
    if (form.method === 'GET' && form.sensitive.some((s) => s.type === 'password')) {
      issues.push({ s: 'fail', t: t('compi.form_get_password') });
      pts -= 30;
    }
    const hasAutocomplete = form.sensitive.some((s) =>
      s.type === 'password' && (s.autocomplete === 'on (default)' || s.autocomplete === 'on')
    );
    if (hasAutocomplete) {
      issues.push({ s: 'warn', t: t('compi.form_autocomplete') });
      pts -= 5;
    }
  }

  return { score: Math.max(0, pts), issues };
}

function calcSecurityScore(r) {
  const issues = [];
  let pts = 100;

  if (!r.isHttps) {
    issues.push({ s: 'fail', t: t('compi.no_https') });
    pts -= 50;
  } else {
    issues.push({ s: 'pass', t: t('compi.https_active') });
  }

  const md = r.mixedDetail ?? { total: 0 };
  if (md.total > 0) {
    const parts = [];
    if (md.images) { parts.push(`${md.images} img`); }
    if (md.scripts) { parts.push(`${md.scripts} js`); }
    if (md.links) { parts.push(`${md.links} css`); }
    if (md.iframes) { parts.push(`${md.iframes} iframes`); }
    issues.push({ s: 'fail', t: t('compi.mixed_content', { n: md.total, parts: parts.join(', ') }) });
    pts -= Math.min(40, md.total * 5);
  }

  const h = r.headers ?? {};

  const headerChecks = [
    { key: 'hsts', name: 'HSTS', weight: 10, hintKey: 'compi.hint_hsts' },
    { key: 'csp', name: 'Content-Security-Policy', weight: 15, hintKey: 'compi.hint_csp' },
    { key: 'xfo', name: 'X-Frame-Options', weight: 5, hintKey: 'compi.hint_xfo' },
    { key: 'xcto', name: 'X-Content-Type-Options', weight: 3, hintKey: 'compi.hint_xcto' },
    { key: 'referrerPolicy', name: 'Referrer-Policy', weight: 5, hintKey: 'compi.hint_referrer' },
    { key: 'permissionsPolicy', name: 'Permissions-Policy', weight: 3, hintKey: 'compi.hint_permissions' },
  ];

  for (const c of headerChecks) {
    if (h[c.key]) {
      issues.push({ s: 'pass', t: t('compi.header_configured', { name: c.name }) });
    } else {
      issues.push({ s: 'warn', t: t('compi.header_missing', { name: c.name, hint: t(c.hintKey) }) });
      pts -= c.weight;
    }
  }

  if (h.poweredBy) {
    issues.push({ s: 'warn', t: t('compi.powered_by', { val: h.poweredBy }) });
    pts -= 3;
  }
  if (h.server && /\d/.test(h.server)) {
    issues.push({ s: 'warn', t: t('compi.server_version', { val: h.server }) });
    pts -= 3;
  }
  if (h.xxss) {
    issues.push({ s: 'warn', t: t('compi.xss_deprecated') });
  }
  if (h.cspReportOnly && !h.csp) {
    issues.push({ s: 'warn', t: t('compi.csp_report_only') });
    pts -= 5;
  }

  return { score: Math.max(0, pts), issues };
}

function calcPentestScore(r) {
  const issues = [];
  let pts = 100;

  const unsafeIframes = (r.iframes ?? []).filter((i) => i.crossOrigin && !i.sandbox);
  if (unsafeIframes.length > 0) {
    issues.push({ s: 'warn', t: t('compi.iframes_no_sandbox', { n: unsafeIframes.length }) });
    pts -= Math.min(20, unsafeIframes.length * 5);
  } else if (r.iframes?.length > 0) {
    issues.push({ s: 'pass', t: t('compi.iframes_safe') });
  }

  if (r.totalThirdPartyScripts > 0) {
    if (r.scriptsWithoutSRI === 0) {
      issues.push({ s: 'pass', t: t('compi.scripts_sri_ok', { n: r.totalThirdPartyScripts }) });
    } else {
      issues.push({ s: 'fail', t: t('compi.scripts_no_sri', { noSri: r.scriptsWithoutSRI, total: r.totalThirdPartyScripts }) });
      pts -= Math.min(30, r.scriptsWithoutSRI * 3);
    }
  }

  if (r.stylesheetsWithoutSRI > 0) {
    issues.push({ s: 'warn', t: t('compi.css_no_sri', { n: r.stylesheetsWithoutSRI }) });
    pts -= 5;
  }

  if (r.inlineHandlers > 5) {
    issues.push({ s: 'warn', t: t('compi.inline_handlers', { n: r.inlineHandlers }) });
    pts -= 5;
  }

  for (const form of r.forms ?? []) {
    if (!form.hasCsrfToken && form.method === 'POST' && form.sensitive.length > 0) {
      issues.push({ s: 'warn', t: t('compi.form_no_csrf') });
      pts -= 5;
    }
    if (form.actionCrossOrigin) {
      issues.push({ s: 'warn', t: t('compi.form_cross_origin', { action: form.action }) });
      pts -= 5;
    }
  }

  if (r.libs?.jquery) {
    const v = r.libs.jquery;
    const major = parseInt(v.split('.')[0], 10);
    if (major < 3) {
      issues.push({ s: 'fail', t: t('compi.jquery_old', { v }) });
      pts -= 15;
    } else {
      issues.push({ s: 'pass', t: t('compi.jquery_modern', { v }) });
    }
  }

  if (r.cookies.count > 0 && !r.isHttps) {
    issues.push({ s: 'fail', t: t('compi.cookies_http') });
    pts -= 20;
  }

  if (r.storage.lsSize > 100000) {
    issues.push({ s: 'warn', t: t('compi.localstorage_big', { kb: (r.storage.lsSize / 1024).toFixed(1) }) });
  }

  if (r.serviceWorker) {
    const url = r.serviceWorker.scriptURL ?? r.serviceWorker.scope;
    issues.push({ s: 'pass', t: t('compi.service_worker', { url }) });
  }

  if (issues.length === 0) {
    issues.push({ s: 'pass', t: t('compi.no_issues') });
  }

  return { score: Math.max(0, pts), issues };
}

// --- Rendering ---

function renderIssue(i) {
  const icons = { pass: '✓', warn: '⚠', fail: '✗' };
  return `
    <li class="comp-issue comp-${i.s}">
      <span class="comp-issue-icon">${icons[i.s] ?? '?'}</span>
      <span>${esc(i.t)}</span>
    </li>`;
}

function renderSection(name, scoreData) {
  const scoreColor = scoreData.score >= 80 ? '#22c55e' : scoreData.score >= 60 ? '#f59e0b' : '#ef4444';
  return `
    <section class="comp-section">
      <div class="comp-section-header">
        <h3 class="comp-section-title">${esc(name)}</h3>
        <span class="comp-section-score" style="color:${scoreColor}">${scoreData.score}</span>
      </div>
      <ul class="comp-issues">
        ${scoreData.issues.map(renderIssue).join('')}
      </ul>
    </section>`;
}

// Compact "Advanced analysis" section that groups the four Phase A insights
// (purpose chips, CMP, sync, dependency) into one collapsible block. Keeps
// the popup short — each subline is one row, the whole section folds via
// <details>.
function renderAdvancedSection(r, classify, cmps, syncs) {
  const labels = cookiePurposes.purposeLabels;
  const order = ['analytics', 'ads', 'tracking', 'session', 'auth', 'security', 'consent', 'ux', 'unknown'];

  // Classify line
  let classifyLine = '';
  if (r.cookies.count === 0) {
    classifyLine = `<div class="adv-line"><span class="adv-key">${esc(t('comp.sub_classify'))}</span><span class="settings-hint">${esc(t('comp.classify_empty'))}</span></div>`;
  } else {
    const chips = order
      .filter((p) => classify.groups[p])
      .map((p) => {
        const items = classify.groups[p];
        const label = localized(labels[p]);
        const vendors = [...new Set(items.map((i) => i.vendor).filter(Boolean))];
        const vendorTip = vendors.length ? ` · ${vendors.join(', ')}` : '';
        return `<span class="purpose-chip purpose-${p}" title="${esc(label)}${esc(vendorTip)}">${esc(label)} <strong>${items.length}</strong></span>`;
      }).join('');
    classifyLine = `
      <div class="adv-line adv-line-stack">
        <span class="adv-key">${esc(t('comp.sub_classify'))}</span>
        <div class="purpose-chips">${chips}</div>
      </div>`;
  }

  // CMP line
  const cmpValue = cmps.length === 0
    ? `<span class="settings-hint">${esc(t('comp.cmp_none'))}</span>`
    : cmps.map((c) => `<span class="cmp-chip">${esc(c.name)}</span>`).join(' ');
  const cmpLine = `<div class="adv-line"><span class="adv-key">${esc(t('comp.sub_cmp'))}</span><div class="adv-val">${cmpValue}</div></div>`;

  // Sync line
  let syncLine;
  if (syncs.length === 0) {
    syncLine = `<div class="adv-line"><span class="adv-key">${esc(t('comp.sub_sync'))}</span><span class="settings-hint">${esc(t('comp.sync_none'))}</span></div>`;
  } else {
    const list = syncs.map((s) =>
      `<span class="sync-chip" title="${esc(s.domain)}">${esc(s.name)}<small> · ${esc(s.type)}</small></span>`
    ).join('');
    syncLine = `
      <div class="adv-line adv-line-stack">
        <span class="adv-key">${esc(t('comp.sub_sync'))} <small>(${syncs.length})</small></span>
        <div class="sync-chips">${list}</div>
      </div>`;
  }

  // Dependency line
  const tpCount = (r.thirdPartyScripts ?? []).length;
  const lvl = dependencyLevel(tpCount);
  const lvlLabel = t(`comp.dep_${lvl.key}`);
  const depLine = `
    <div class="adv-line">
      <span class="adv-key">${esc(t('comp.sub_dependency'))}</span>
      <div class="adv-val">
        <span class="dep-pill" style="background:${lvl.color}20;color:${lvl.color};border:1px solid ${lvl.color}80">${esc(lvlLabel)}</span>
        <span class="settings-hint">${tpCount} dom.</span>
      </div>
    </div>`;

  // TCF v2 line — only shown if the page exposes window.__tcfapi
  let tcfLine = '';
  if (r.tcf) {
    const purposesText = t('comp.tcf_purposes', {
      n: r.tcf.purposesAccepted, total: r.tcf.purposesTotal,
    });
    const vendorsText = r.tcf.vendorsTotal > 0
      ? ` · ${t('comp.tcf_vendors', { n: r.tcf.vendorsAccepted, total: r.tcf.vendorsTotal })}`
      : '';
    const liText = r.tcf.legitimateInterestsTotal > 0
      ? ` · ${t('comp.tcf_li', { n: r.tcf.legitimateInterestsTotal })}`
      : '';
    // Render the accepted purpose list as a collapsible details block
    const acceptedDetail = r.tcf.purposeIdsAccepted.length > 0
      ? `<details class="tcf-purposes-detail">
          <summary class="settings-hint">${esc(t('comp.tcf_purposes_detail'))}</summary>
          <ul class="tcf-purpose-list">
            ${r.tcf.purposeIdsAccepted.map((id) => `
              <li><code>P${id}</code> ${esc(localized(tcfPurposes.purposes[id]) || '?')}</li>
            `).join('')}
          </ul>
        </details>`
      : '';
    tcfLine = `
      <div class="adv-line adv-line-stack">
        <span class="adv-key">${esc(t('comp.sub_tcf'))} <small>(CMP ${esc(String(r.tcf.cmpId ?? '?'))})</small></span>
        <div class="adv-val tcf-summary">
          <span class="tcf-pill">${esc(purposesText)}</span>
          ${vendorsText ? `<span class="settings-hint">${esc(vendorsText.replace(/^\s·\s/, ''))}</span>` : ''}
          ${liText ? `<span class="settings-hint">${esc(liText.replace(/^\s·\s/, ''))}</span>` : ''}
        </div>
        ${acceptedDetail}
      </div>`;
  }

  // Vendor list links — page advertised a "View partners" / "Lista de socios"
  let vendorLinksLine = '';
  if (r.vendorListLinks?.length > 0) {
    const links = r.vendorListLinks.map((l) =>
      `<a class="vendor-link" data-href="${esc(l.href)}" title="${esc(l.href)}">${esc(l.text)}</a>`
    ).join(' · ');
    vendorLinksLine = `
      <div class="adv-line adv-line-stack">
        <span class="adv-key">${esc(t('comp.sub_vendor_links'))}</span>
        <div class="adv-val">${links}</div>
      </div>`;
  }

  // Cookie wall is rendered separately in renderReport() — outside this function.

  // Consent banner reset — visible only if the probe detected an accepted
  // consent (cookie or storage marker). One-click clears CMP markers and
  // reloads so the banner reappears.
  const consentBanner = r.consentAccepted ? `
    <div class="adv-consent-banner">
      <div class="adv-consent-text">${esc(t('comp.consent_status'))}</div>
      <button id="btn-reset-consent" class="btn-reset-consent" title="${esc(t('comp.reset_consent_tip'))}">${esc(t('comp.reset_consent'))}</button>
    </div>` : '';

  return `
    <details class="comp-section comp-advanced">
      <summary class="comp-section-title">${esc(t('comp.section_advanced'))}</summary>
      <div class="adv-grid">
        ${consentBanner}
        ${classifyLine}
        ${cmpLine}
        ${tcfLine}
        ${syncLine}
        ${depLine}
        ${vendorLinksLine}
      </div>
    </details>`;
}

// Compact bilingual glossary covering every term used in the GDPR view.
// Surfaced as a collapsible details so it does not push the report down.
function getLegendItems() {
  const isEs = t('btn.save') === 'Guardar';
  if (isEs) {
    return [
      { section: 'Marcos y CMPs', items: [
        ['TCF (IAB Europe)', 'Marco de Transparencia y Consentimiento de IAB Europe — estándar de UE'],
        ['CMP', 'Consent Management Platform — software del banner (OneTrust, Didomi, Cookiebot, Sourcepoint…)'],
        ['CMP ID', 'Identificador numérico de la CMP en el registro de IAB'],
        ['TCString', 'Cadena codificada que recoge tus elecciones TCF (compactada en una cookie)'],
        ['GDPR Applies', 'Indica si la página considera que el RGPD aplica a tu sesión (geolocalización IP)'],
      ]},
      { section: 'Propósitos y vendors', items: [
        ['Propósito', 'Una de las 15 finalidades estándar TCF (P1–P15) que la web declara'],
        ['Vendor', 'Cada uno de los partners publicitarios/análisis de la Global Vendor List'],
        ['Interés legítimo', 'Base legal alternativa al consentimiento — no requiere aceptación expresa'],
      ]},
      { section: 'Cookies', items: [
        ['1st party / propias', 'Cookies del mismo dominio que la web que visitas'],
        ['3rd party / terceros', 'Cookies de otros dominios — típicas de tracking entre sitios'],
        ['Cookie sensible', 'Nombre típico de sesión/auth/CSRF (sid, jwt, token, …) — debería tener HttpOnly'],
        ['Cookie syncing', 'Emparejar IDs entre redes publicitarias para identificarte sin cookies propias'],
        ['Cookie wall', 'Esquema "acepta o paga" — consentimiento dudoso bajo EDPB Guidelines 03/2022'],
      ]},
      { section: 'Cabeceras y seguridad', items: [
        ['HSTS', 'Strict-Transport-Security — fuerza HTTPS, evita downgrade'],
        ['CSP', 'Content-Security-Policy — bloquea scripts/recursos no autorizados'],
        ['XFO', 'X-Frame-Options — previene clickjacking'],
        ['SRI', 'Subresource Integrity — verifica que el código externo no fue manipulado'],
        ['CSRF token', 'Token oculto en formularios que evita peticiones forjadas'],
      ]},
      { section: 'Otros', items: [
        ['DMP', 'Data Management Platform (BlueKai, Adobe Audience Manager…) — agrega perfiles'],
        ['Mixed content', 'Recursos http:// servidos en una página https://'],
        ['Service Worker', 'Script persistente que actúa como proxy entre la página y la red'],
      ]},
    ];
  }
  return [
    { section: 'Frameworks & CMPs', items: [
      ['TCF (IAB Europe)', 'Transparency and Consent Framework — EU standard'],
      ['CMP', 'Consent Management Platform — the banner software (OneTrust, Didomi, Cookiebot, Sourcepoint…)'],
      ['CMP ID', 'Numeric ID of the CMP in the IAB registry'],
      ['TCString', 'Encoded string that captures your TCF choices (compacted into a cookie)'],
      ['GDPR Applies', 'Whether the page considers GDPR applies to your session (IP geolocation)'],
    ]},
    { section: 'Purposes & vendors', items: [
      ['Purpose', 'One of the 15 standard TCF purposes (P1–P15) declared by the site'],
      ['Vendor', 'Each advertising/analytics partner from the Global Vendor List'],
      ['Legitimate interest', 'Alternative legal basis to consent — no explicit acceptance required'],
    ]},
    { section: 'Cookies', items: [
      ['1st party', 'Cookies from the same domain as the page you visit'],
      ['3rd party', 'Cookies from other domains — typical of cross-site tracking'],
      ['Sensitive cookie', 'Typical session/auth/CSRF name (sid, jwt, token, …) — should have HttpOnly'],
      ['Cookie syncing', 'Pairing IDs across ad networks to identify you without first-party cookies'],
      ['Cookie wall', '"Accept or pay" scheme — questionable consent under EDPB Guidelines 03/2022'],
    ]},
    { section: 'Headers & security', items: [
      ['HSTS', 'Strict-Transport-Security — forces HTTPS, prevents downgrade'],
      ['CSP', 'Content-Security-Policy — blocks unauthorized scripts/resources'],
      ['XFO', 'X-Frame-Options — prevents clickjacking'],
      ['SRI', 'Subresource Integrity — verifies external code was not tampered with'],
      ['CSRF token', 'Hidden form token that prevents forged requests'],
    ]},
    { section: 'Other', items: [
      ['DMP', 'Data Management Platform (BlueKai, Adobe Audience Manager…) — aggregates profiles'],
      ['Mixed content', 'http:// resources served on an https:// page'],
      ['Service Worker', 'Persistent script that acts as a proxy between the page and the network'],
    ]},
  ];
}

function renderLegend() {
  const sections = getLegendItems().map(({ section, items }) => {
    const rows = items.map(([term, def]) =>
      `<tr><td class="leg-term">${esc(term)}</td><td class="leg-def">${esc(def)}</td></tr>`
    ).join('');
    return `<tr class="leg-section-row"><td colspan="2" class="leg-section">${esc(section)}</td></tr>${rows}`;
  }).join('');
  return `
    <details class="comp-legend">
      <summary class="legend-toggle">${esc(t('comp.legend'))}</summary>
      <table class="legend-table">${sections}</table>
    </details>`;
}

// Stand-alone alert for cookie wall pages, rendered above the Advanced
// section so it is the first thing the user sees after the overview.
function renderCookieWallAlert(banners) {
  if (!banners?.length) { return ''; }
  const maxSignals = Math.max(...banners.map((b) => b.cookieWallSignals ?? 0));
  if (maxSignals === 0) { return ''; }
  const isWall = banners.some((b) => b.cookieWall);
  const cls = isWall ? 'comp-wall comp-wall-strong' : 'comp-wall';
  const msg = isWall ? t('comp.cookie_wall_warn') : t('comp.cookie_wall_possible');
  return `<div class="${cls}">${msg}</div>`;
}

function renderSensitiveSection(sensitive) {
  if (sensitive.length === 0) { return ''; }
  const list = sensitive.map((s) =>
    `<li><code>${esc(s.name)}</code> <span class="settings-hint">— ${esc(localized(cookiePurposes.purposeLabels[s.purpose]))}</span></li>`
  ).join('');
  return `
    <section class="comp-section comp-section-warn">
      <h3 class="comp-section-title">${esc(t('comp.section_sensitive'))}</h3>
      <p class="settings-hint">${t('comp.sensitive_warn')}</p>
      <ul class="sensitive-list">${list}</ul>
    </section>`;
}

function buildExportPayload(r, classify, cmps, syncs) {
  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    tool: 'Lucent — Browser Audit',
    page: { url: r.url, host: r.host, isHttps: r.isHttps },
    cookies: {
      count: r.cookies.count,
      consentAccepted: r.consentAccepted,
      classification: classify.groups,
      sensitive: classify.sensitive,
    },
    cmp: cmps,
    tcf: r.tcf ?? null,
    vendorListLinks: r.vendorListLinks ?? [],
    cookieWall: r.banners?.some((b) => b.cookieWall) ?? false,
    cookieWallSignals: Math.max(0, ...(r.banners ?? []).map((b) => b.cookieWallSignals ?? 0)),
    syncing: syncs,
    thirdParty: {
      scripts: r.thirdPartyScripts,
      scriptsWithoutSRI: r.scriptsWithoutSRI,
      totalThirdPartyScripts: r.totalThirdPartyScripts,
      iframes: r.iframes ?? [],
    },
    headers: r.headers,
    forms: r.forms,
    storage: r.storage,
    libs: r.libs,
    serviceWorker: r.serviceWorker,
    inlineHandlers: r.inlineHandlers,
  };
}

function downloadJSON(filename, payload) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function renderReport(r) {
  const cookieScore = calcCookieScore(r);
  const gdprScore = calcGdprScore(r);
  const secScore = calcSecurityScore(r);
  const pentestScore = calcPentestScore(r);

  // Phase A enrichments (no extra permissions): purpose classification,
  // CMP detection, sync vendor detection, dependency level, sensitive flag.
  const classify = classifyAllCookies(r.cookies?.details ?? []);
  const cmps = detectCMPs(r.thirdPartyScripts ?? [], r.iframes ?? []);
  const syncs = detectSyncVendors(r.thirdPartyScripts ?? []);

  const total = Math.round((cookieScore.score + gdprScore.score + secScore.score + pentestScore.score) / 4);
  const totalColor = total >= 80 ? '#22c55e' : total >= 60 ? '#f59e0b' : '#ef4444';

  const headers = r.headers ?? {};
  const headerSummary = Object.entries(headers)
    .filter(([k]) => k !== 'error')
    .map(([k, v]) =>
      `<div class="comp-hdr-row">
        <span class="comp-hdr-name">${esc(k)}</span>
        <span class="comp-hdr-val ${v ? 'present' : 'missing'}">${v ? '✓' : '✗ no presente'}</span>
      </div>`
    ).join('');

  return `
    <div class="comp-overview">
      <div class="comp-host">${esc(r.host)}</div>
      <div class="comp-total" style="color:${totalColor}">${total}<span class="comp-total-suffix">/100</span></div>
      <div class="comp-total-label">${esc(t('comp.score_overall'))}</div>
      <div class="comp-summary">
        🍪 ${r.cookies.count} cookies · 🛡 ${r.banners.length > 0 ? 'Banner OK' : 'Sin banner'} ·
        📄 ${r.policyLinks.length} legal ·
        🌐 ${r.thirdPartyScripts.length} 3rd party ·
        🖼 ${(r.iframes ?? []).length} iframes
      </div>
    </div>

    ${renderCookieWallAlert(r.banners)}
    ${renderAdvancedSection(r, classify, cmps, syncs)}
    ${renderSensitiveSection(classify.sensitive)}

    ${renderSection(t('comp.section_cookies'), cookieScore)}
    ${renderSection(t('comp.section_gdpr'), gdprScore)}
    ${renderSection(t('comp.section_headers'), secScore)}
    ${renderSection(t('comp.section_pentest'), pentestScore)}

    <details class="comp-details">
      <summary>Ver headers HTTP detectados</summary>
      <div class="comp-hdr-list">
        ${headerSummary || '<p class="loading">No se pudieron leer los headers</p>'}
      </div>
    </details>

    ${r.thirdPartyScripts.length > 0 ? `
      <details class="comp-details">
        <summary>Dominios de terceros cargados (${r.thirdPartyScripts.length})</summary>
        <div class="comp-3rd">${r.thirdPartyScripts.map(esc).join(' · ')}</div>
      </details>
    ` : ''}

    ${r.forms.length > 0 ? `
      <details class="comp-details">
        <summary>Formularios con campos sensibles (${r.forms.length})</summary>
        <div class="comp-forms">
          ${r.forms.map((f) => `
            <div class="comp-form">
              <strong>${esc(f.method)} ${esc(f.action)}</strong>
              <div>${f.sensitive.map((s) => esc(`${s.type}:${s.name}`)).join(' · ')}</div>
              <div class="settings-hint">
                ${f.hasCsrfToken ? '✓ Token CSRF detectado' : '⚠ Sin token CSRF aparente'}
                ${f.actionCrossOrigin ? ' · ⚠ Action cross-origin' : ''}
              </div>
            </div>
          `).join('')}
        </div>
      </details>
    ` : ''}

    ${r.iframes?.length > 0 ? `
      <details class="comp-details">
        <summary>Iframes (${r.iframes.length})</summary>
        <div class="comp-3rd">
          ${r.iframes.map((i) => `
            <div class="comp-form">
              <strong>${esc(i.host || 'inline')}</strong> ${i.crossOrigin ? '<span style="color:#f59e0b">cross-origin</span>' : '<span style="color:#22c55e">same-origin</span>'}
              <div class="settings-hint">
                ${i.sandbox ? `sandbox="${esc(i.sandbox)}"` : '<span style="color:#ef4444">sin sandbox</span>'}
                ${i.allow ? ` · allow="${esc(i.allow.slice(0, 60))}"` : ''}
              </div>
            </div>
          `).join('')}
        </div>
      </details>
    ` : ''}

    ${Object.keys(r.libs ?? {}).length > 0 ? `
      <details class="comp-details">
        <summary>Librerías JavaScript detectadas</summary>
        <div class="comp-3rd">
          ${Object.entries(r.libs).map(([k, v]) => `<div><strong>${esc(k)}</strong>: ${esc(v)}</div>`).join('')}
        </div>
      </details>
    ` : ''}

    ${r.serviceWorker ? `
      <details class="comp-details">
        <summary>Service Worker activo</summary>
        <div class="comp-3rd">
          <div>Scope: ${esc(r.serviceWorker.scope)}</div>
          ${r.serviceWorker.scriptURL ? `<div>Script: ${esc(r.serviceWorker.scriptURL)}</div>` : ''}
        </div>
      </details>
    ` : ''}

    ${r.storage.lsCount + r.storage.ssCount > 0 ? `
      <details class="comp-details">
        <summary>Almacenamiento local (${r.storage.lsCount + r.storage.ssCount} entradas)</summary>
        <div class="comp-3rd">
          <div>localStorage: ${r.storage.lsCount} entradas · ${(r.storage.lsSize / 1024).toFixed(1)} KB</div>
          <div>sessionStorage: ${r.storage.ssCount} entradas · ${(r.storage.ssSize / 1024).toFixed(1)} KB</div>
        </div>
      </details>
    ` : ''}

    ${renderLegend()}
  `;
}

// --- Entry point ---

export async function renderCompliance(container) {
  const tabId = await getActiveTabId();
  const aiReady = await isAIConfigured();

  container.innerHTML = `
    <div class="comp-wrap">
      <div class="comp-toolbar">
        <span class="spy-label">${esc(t('comp.title'))}</span>
        <button id="btn-comp-run" class="btn-primary">${esc(t('comp.analyze'))}</button>
        <button id="btn-comp-ai" class="btn-secondary btn-ai" title="${aiReady ? esc(t('comp.ai_summarize')) : esc(t('comp.ai_no_config'))}">
          ${esc(t('comp.ai_summarize'))}
        </button>
        <button id="btn-comp-export" class="btn-secondary" disabled>${esc(t('comp.export_btn'))}</button>
      </div>
      <div id="comp-result">
        <p class="loading">${t('comp.intro')}</p>
      </div>
    </div>`;

  container.querySelector('#btn-comp-ai').addEventListener('click', async () => {
    if (!tabId) { return; }
    if (!(await isAIConfigured())) {
      alert(t('comp.ai_no_config'));
      return;
    }
    const result = container.querySelector('#comp-result');
    const btn = container.querySelector('#btn-comp-ai');
    btn.disabled = true;
    btn.textContent = t('comp.ai_extracting');

    try {
      const extracted = await sendMsg({ type: 'extract_page_text', tabId });
      if (!extracted?.ok || !extracted.result?.text) {
        result.innerHTML = `<p class="error">${esc(t('comp.ai_no_text'))}</p>`;
        btn.disabled = false; btn.textContent = t('comp.ai_summarize');
        return;
      }
      const { text, host, length, title } = extracted.result;

      btn.textContent = t('comp.ai_summarizing', { n: length.toLocaleString() });

      result.innerHTML = `
        <div class="ai-summary">
          <div class="ai-summary-header">
            <strong>${esc(t('comp.ai_summary'))}</strong>
            <span class="ai-summary-host">${esc(host)} · ${esc(title.slice(0, 60))}</span>
          </div>
          <p class="loading">${esc(t('comp.ai_summarizing_policy'))}</p>
        </div>`;

      const summary = await summarizePrivacyPolicy(text, host);

      const formatted = summary
        .split('\n')
        .map((line) => esc(line))
        .join('<br>');

      result.innerHTML = `
        <div class="ai-summary">
          <div class="ai-summary-header">
            <strong>${esc(t('comp.ai_summary'))}</strong>
            <span class="ai-summary-host">${esc(host)}</span>
          </div>
          <div class="ai-summary-body">${formatted}</div>
          <div class="ai-summary-foot">
            <span>${esc(t('comp.ai_pass_through'))}</span>
            <button id="btn-ai-back" class="btn-secondary">${esc(t('btn.back'))}</button>
          </div>
        </div>`;

      result.querySelector('#btn-ai-back').addEventListener('click', () => {
        result.innerHTML = `<p class="loading">${t('comp.intro')}</p>`;
      });

      btn.disabled = false;
      btn.textContent = t('comp.ai_summarize');
    } catch (err) {
      result.innerHTML = `<p class="error">${esc(t('common.error'))}: ${esc(err.message)}</p>`;
      btn.disabled = false;
      btn.textContent = t('comp.ai_summarize');
    }
  });

  let lastReport = null;

  container.querySelector('#btn-comp-run').addEventListener('click', async () => {
    if (!tabId) { return; }
    const btn = container.querySelector('#btn-comp-run');
    const result = container.querySelector('#comp-result');
    btn.disabled = true;
    btn.textContent = t('comp.analyzing');
    result.innerHTML = `<p class="loading">${esc(t('comp.analyzing_detail'))}</p>`;

    const res = await sendMsg({ type: 'run_compliance_probe', tabId });
    btn.disabled = false;
    btn.textContent = t('comp.analyze_again');

    if (!res?.ok) {
      const p = document.createElement('p');
      p.className = 'error';
      p.textContent = res?.reason ?? t('common.error');
      result.replaceChildren(p);
      return;
    }

    if (!res.result) {
      result.innerHTML = `<p class="error">${esc(t('comp.ai_no_data'))}</p>`;
      return;
    }

    lastReport = res.result;
    container.querySelector('#btn-comp-export').disabled = false;
    result.innerHTML = renderReport(res.result);
  });

  container.querySelector('#btn-comp-export').addEventListener('click', () => {
    if (!lastReport) { return; }
    const classify = classifyAllCookies(lastReport.cookies?.details ?? []);
    const cmps = detectCMPs(lastReport.thirdPartyScripts ?? [], lastReport.iframes ?? []);
    const syncs = detectSyncVendors(lastReport.thirdPartyScripts ?? []);
    const payload = buildExportPayload(lastReport, classify, cmps, syncs);
    const date = new Date().toISOString().slice(0, 10);
    const slug = (lastReport.host || 'page').replace(/[^a-z0-9.-]/gi, '_');
    downloadJSON(`${t('comp.export_filename')}-${slug}-${date}.json`, payload);
  });

  // Vendor list links (delegated — anchors live inside renderReport output)
  container.addEventListener('click', (ev) => {
    const a = ev.target.closest('.vendor-link');
    if (!a) { return; }
    ev.preventDefault();
    const href = a.dataset.href;
    if (href) { chrome.tabs.create({ url: href }); }
  });

  // Reset consent — wired via delegation because the button is rendered
  // inside renderReport() output (re-mounted after each scan).
  container.addEventListener('click', async (ev) => {
    const btn = ev.target.closest('#btn-reset-consent');
    if (!btn || !tabId) { return; }
    btn.disabled = true;
    const original = btn.textContent;
    btn.textContent = t('comp.reset_consent_doing');
    const res = await sendMsg({ type: 'reset_consent', tabId });
    if (res?.ok) {
      const s = res.stats ?? {};
      btn.textContent = t('comp.reset_consent_done', {
        ck: s.ckRemoved ?? 0, ls: s.lsRemoved ?? 0, ss: s.ssRemoved ?? 0,
      });
      // The tab was reloaded — the next scan needs a fresh probe. Disable
      // re-click and let the user re-run the analysis.
      setTimeout(() => { btn.textContent = original; btn.disabled = false; }, 4000);
    } else {
      btn.disabled = false;
      btn.textContent = t('comp.reset_consent_fail', { reason: res?.reason ?? '?' });
      setTimeout(() => { btn.textContent = original; }, 4000);
    }
  });
}
