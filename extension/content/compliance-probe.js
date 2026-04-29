// Compliance probe — comprehensive page analysis for GDPR/security audit.

(async function () {
  // --- Cookies ---
  const rawCookies = document.cookie.split(';').map((c) => c.trim()).filter(Boolean);
  const cookieDetails = rawCookies.map((c) => {
    const [name, value = ''] = c.split('=');
    return { name: name.trim(), valueLength: value.length };
  });

  // --- Storage usage ---
  let lsCount = 0, lsSize = 0;
  let ssCount = 0, ssSize = 0;
  try {
    lsCount = localStorage.length;
    for (let i = 0; i < lsCount; i++) {
      const k = localStorage.key(i);
      if (k) { lsSize += k.length + (localStorage.getItem(k) || '').length; }
    }
  } catch { /* sandboxed */ }
  try {
    ssCount = sessionStorage.length;
    for (let i = 0; i < ssCount; i++) {
      const k = sessionStorage.key(i);
      if (k) { ssSize += k.length + (sessionStorage.getItem(k) || '').length; }
    }
  } catch { /* sandboxed */ }

  // --- Detect already-accepted consent (cookie or storage markers) ---
  const CONSENT_MARKERS = [
    'cookieConsent', 'cookie_consent', 'CookieConsent', 'OptanonAlertBoxClosed',
    'OptanonConsent', 'cmplz_consent', 'didomi_token', 'euconsent', 'euconsent-v2',
    'cookielawinfo-checkbox', 'CookieControl', 'BCPermissionLevelCookie',
    '_iub_cs', 'cb-enabled', 'gdpr_consent', 'consent_user_consent_token',
    'usercentrics', 'tcf_consent',
  ];
  const consentInCookies = rawCookies.some((c) =>
    CONSENT_MARKERS.some((m) => c.toLowerCase().includes(m.toLowerCase()))
  );
  let consentInStorage = false;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = (localStorage.key(i) || '').toLowerCase();
      if (CONSENT_MARKERS.some((m) => k.includes(m.toLowerCase()))) {
        consentInStorage = true;
        break;
      }
    }
  } catch { /* sandboxed */ }
  const consentAccepted = consentInCookies || consentInStorage;

  // --- Cookie banner heuristic ---
  const bannerKeywords = [
    'cookie', 'consent', 'rgpd', 'gdpr', 'aceptar', 'accept', 'privacy',
    'consentimiento', 'configurar cookies',
  ];
  // Cookie wall — pay-or-accept patterns. No single regex catches everything;
  // require 2+ signals on the banner text. Heuristic, not legal advice.
  const COOKIE_WALL_SIGNALS = [
    /(€|\$|£)\s?[\d.,]+\s*\/\s*(mes|month|año|year|mo|yr|jahr|mois|anno)/i,
    /ad.?free|sin anuncios|sin publicidad|skip ads|ohne werbung|sans pub|senza pubblicit/i,
    /(pay|paga|paying|pagar|abonner|abbonati|zahlen).{0,40}(accept|reject|continue|consent|aceptar|rechazar|navegar|surf|browse)/i,
    /(subscribe|suscr[íi]bete|suscribir|abonnement|abonnieren).{0,60}(€|\$|£|\d+[.,]\d+)/i,
  ];

  const banners = [];
  document.querySelectorAll('div, section, aside, dialog, footer').forEach((el) => {
    const fullText = (el.textContent || '').slice(0, 2000);
    const text = fullText.toLowerCase();
    const hasButton = el.querySelector('button, a[role="button"]');
    const matches = bannerKeywords.filter((k) => text.includes(k));
    if (matches.length >= 2 && hasButton && el.offsetHeight > 50) {
      const signalsHit = COOKIE_WALL_SIGNALS.filter((rx) => rx.test(fullText));
      banners.push({
        tag: el.tagName,
        keywords: matches,
        hasAcceptBtn: !!Array.from(el.querySelectorAll('button, a')).find((b) =>
          /aceptar|accept|allow|ok|agree|estoy de acuerdo|i agree|got it/i.test(b.textContent || '')
        ),
        hasRejectBtn: !!Array.from(el.querySelectorAll('button, a')).find((b) =>
          /rechazar|reject|deny|denegar|no acepto|decline|disagree/i.test(b.textContent || '')
        ),
        // Wider regex — covers many real-world banner buttons
        hasConfigBtn: !!Array.from(el.querySelectorAll('button, a')).find((b) =>
          /configurar|preferencias|settings|customize|gestionar|m[aá]s opciones|personalizar|ajustes|opciones|manage|customise|options|choices|more info|m[aá]s info/i.test(b.textContent || '')
        ),
        // Cookie wall classification — requires 2+ independent signals.
        // 1 → "possible", 2+ → "cookieWall: true". Heuristic, not legal proof.
        cookieWallSignals: signalsHit.length,
        cookieWall: signalsHit.length >= 2,
      });
    }
  });

  // --- Vendor list link extractor ---
  // Some banners hide the partner/vendor list behind a separate link. Capture
  // anchors with text that hints at a "view our partners" / "lista de socios"
  // page so the user can audit the count manually.
  const vendorListLinks = [];
  const VENDOR_LINK_RX = /\b(partners|vendors|socios|providers|terceros|proveedores|colabor|fournisseurs)\b/i;
  document.querySelectorAll('a[href]').forEach((a) => {
    const text = (a.textContent || '').trim();
    if (text.length === 0 || text.length > 80) { return; }
    if (!VENDOR_LINK_RX.test(text)) { return; }
    const href = a.getAttribute('href') || '';
    if (!href || href === '#') { return; }
    vendorListLinks.push({ text: text.slice(0, 60), href: href.slice(0, 200) });
  });
  // Dedupe by href and limit
  const seenHrefs = new Set();
  const dedupedVendorLinks = vendorListLinks
    .filter((l) => { if (seenHrefs.has(l.href)) { return false; } seenHrefs.add(l.href); return true; })
    .slice(0, 5);

  // --- TCF v2.x consumer ---
  // IAB Europe Transparency & Consent Framework. Most serious EU CMPs expose
  // window.__tcfapi but the CMP frequently registers it asynchronously, after
  // the DOM is ready. Poll for up to 2.5s before giving up — without this
  // sites with lazy-loaded CMPs would always report "TCF not detected".
  let tcfData = null;
  try {
    const tcfDeadline = Date.now() + 2500;
    while (Date.now() < tcfDeadline) {
      if (typeof window.__tcfapi === 'function') { break; }
      await new Promise((r) => setTimeout(r, 200));
    }
    if (typeof window.__tcfapi === 'function') {
      tcfData = await new Promise((resolve) => {
        let resolved = false;
        const timer = setTimeout(() => {
          if (!resolved) { resolved = true; resolve(null); }
        }, 1500);
        try {
          window.__tcfapi('getTCData', 2, (data, success) => {
            if (resolved) { return; }
            resolved = true;
            clearTimeout(timer);
            if (success && data) {
              const purposes = data.purpose?.consents ?? {};
              const legitimate = data.purpose?.legitimateInterests ?? {};
              const vendorConsents = data.vendor?.consents ?? {};
              const vendorLI = data.vendor?.legitimateInterests ?? {};
              const purposeIdsAccepted = Object.entries(purposes)
                .filter(([, v]) => v).map(([k]) => Number(k)).sort((a, b) => a - b);
              resolve({
                cmpId: data.cmpId ?? null,
                cmpVersion: data.cmpVersion ?? null,
                gdprApplies: data.gdprApplies ?? null,
                tcfPolicyVersion: data.tcfPolicyVersion ?? null,
                tcString: typeof data.tcString === 'string' ? data.tcString.slice(0, 200) : null,
                purposeIdsAccepted,
                purposesAccepted: purposeIdsAccepted.length,
                purposesTotal: Object.keys(purposes).length,
                legitimateInterestsTotal: Object.values(legitimate).filter(Boolean).length,
                vendorsAccepted: Object.values(vendorConsents).filter(Boolean).length,
                vendorsTotal: Object.keys(vendorConsents).length,
                vendorsLegitimate: Object.values(vendorLI).filter(Boolean).length,
              });
            } else {
              resolve(null);
            }
          });
        } catch {
          if (!resolved) { resolved = true; clearTimeout(timer); resolve(null); }
        }
      });
    }
  } catch { /* tcf api missing or threw */ }

  // --- Privacy/legal links ---
  const policyLinks = [];
  document.querySelectorAll('a[href]').forEach((a) => {
    const text = (a.textContent || '').trim().toLowerCase();
    const href = a.getAttribute('href') || '';
    if (/privacid|privacy|cookies|legal|aviso legal|datos|gdpr|rgpd/i.test(text)) {
      policyLinks.push({ text: text.slice(0, 50), href: href.slice(0, 200) });
    }
  });

  // --- Sensitive forms ---
  const forms = [];
  document.querySelectorAll('form').forEach((form) => {
    const inputs = form.querySelectorAll('input');
    const sensitive = [];
    let hasCsrfToken = false;
    inputs.forEach((inp) => {
      const type = (inp.getAttribute('type') || 'text').toLowerCase();
      const name = (inp.getAttribute('name') || inp.id || '').toLowerCase();
      // Detect CSRF tokens (common naming patterns)
      if (type === 'hidden' && /csrf|token|_token|authenticity/i.test(name)) {
        hasCsrfToken = true;
      }
      if (['password', 'email', 'tel'].includes(type) ||
          /password|email|phone|telefono|dni|nif|tarjeta|card|cvv/.test(name)) {
        sensitive.push({
          type,
          name: name.slice(0, 40),
          autocomplete: inp.getAttribute('autocomplete') || 'on (default)',
        });
      }
    });
    if (sensitive.length > 0) {
      const action = form.getAttribute('action') || location.pathname;
      let actionHost = location.hostname;
      try { actionHost = new URL(action, location.href).hostname; } catch { /* relative */ }
      forms.push({
        action: action.slice(0, 80),
        actionCrossOrigin: actionHost !== location.hostname,
        method: (form.getAttribute('method') || 'GET').toUpperCase(),
        sensitive,
        hasCsrfToken,
      });
    }
  });

  // --- HTTP headers via fetch HEAD ---
  let headers = null;
  try {
    const res = await fetch(location.href, {
      method: 'HEAD',
      credentials: 'omit',
      cache: 'no-store',
    });
    headers = {
      hsts: res.headers.get('strict-transport-security'),
      csp: res.headers.get('content-security-policy'),
      cspReportOnly: res.headers.get('content-security-policy-report-only'),
      xfo: res.headers.get('x-frame-options'),
      xcto: res.headers.get('x-content-type-options'),
      xxss: res.headers.get('x-xss-protection'),
      referrerPolicy: res.headers.get('referrer-policy'),
      permissionsPolicy: res.headers.get('permissions-policy'),
      coop: res.headers.get('cross-origin-opener-policy'),
      coep: res.headers.get('cross-origin-embedder-policy'),
      corp: res.headers.get('cross-origin-resource-policy'),
      server: res.headers.get('server'),
      poweredBy: res.headers.get('x-powered-by'),
      cacheControl: res.headers.get('cache-control'),
    };
  } catch (e) {
    headers = { error: e.message };
  }

  // --- Mixed content (detailed) ---
  const isHttps = location.protocol === 'https:';
  const mixedDetail = { images: 0, scripts: 0, links: 0, iframes: 0, total: 0 };
  if (isHttps) {
    document.querySelectorAll('img').forEach((el) => { if ((el.src || '').startsWith('http://')) { mixedDetail.images++; mixedDetail.total++; } });
    document.querySelectorAll('script').forEach((el) => { if ((el.src || '').startsWith('http://')) { mixedDetail.scripts++; mixedDetail.total++; } });
    document.querySelectorAll('link').forEach((el) => { if ((el.href || '').startsWith('http://')) { mixedDetail.links++; mixedDetail.total++; } });
    document.querySelectorAll('iframe').forEach((el) => { if ((el.src || '').startsWith('http://')) { mixedDetail.iframes++; mixedDetail.total++; } });
  }

  // --- Iframes analysis ---
  const iframes = [];
  document.querySelectorAll('iframe').forEach((el) => {
    const src = el.src || '';
    if (!src) { return; }
    let host = '';
    try { host = new URL(src, location.href).hostname; } catch { /* skip */ }
    iframes.push({
      src: src.slice(0, 100),
      host,
      crossOrigin: host !== location.hostname,
      sandbox: el.getAttribute('sandbox'),
      allow: el.getAttribute('allow'),
    });
  });

  // --- Third-party scripts (with SRI check) ---
  const scripts = [];
  document.querySelectorAll('script[src]').forEach((s) => {
    const src = s.src || '';
    let host = location.hostname;
    try { host = new URL(src).hostname; } catch { return; }
    scripts.push({
      host,
      crossOrigin: host !== location.hostname && !host.endsWith('.' + location.hostname),
      hasSRI: !!s.getAttribute('integrity'),
      crossorigin: s.getAttribute('crossorigin'),
    });
  });
  const thirdPartyScripts = scripts.filter((s) => s.crossOrigin);
  const scriptsWithoutSRI = thirdPartyScripts.filter((s) => !s.hasSRI);

  // --- External stylesheets (SRI) ---
  const stylesheets = [];
  document.querySelectorAll('link[rel="stylesheet"]').forEach((l) => {
    const href = l.href || '';
    let host = location.hostname;
    try { host = new URL(href).hostname; } catch { return; }
    if (host !== location.hostname) {
      stylesheets.push({ host, hasSRI: !!l.getAttribute('integrity') });
    }
  });

  // --- Service Workers ---
  let serviceWorker = null;
  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg) {
        serviceWorker = {
          scope: reg.scope,
          active: !!reg.active,
          scriptURL: reg.active?.scriptURL?.slice(0, 100) ?? null,
        };
      }
    }
  } catch { /* not allowed */ }

  // --- Library detection (jQuery, common libs) ---
  const libs = {};
  try {
    if (window.jQuery) {
      libs.jquery = window.jQuery.fn?.jquery ?? 'unknown';
    }
    if (window.angular) { libs.angular = window.angular.version?.full ?? 'unknown'; }
    if (window.React) { libs.react = window.React.version ?? 'unknown'; }
    if (window.Vue) { libs.vue = window.Vue.version ?? 'unknown'; }
    if (window.bootstrap) { libs.bootstrap = window.bootstrap.Tooltip?.VERSION ?? 'detected'; }
  } catch { /* ignore */ }

  // --- Inline event handlers (XSS surface) ---
  let inlineHandlers = 0;
  document.querySelectorAll('*').forEach((el) => {
    for (const attr of el.attributes ?? []) {
      if (attr.name.startsWith('on')) { inlineHandlers++; break; }
    }
  });

  return {
    url: location.href,
    host: location.hostname,
    isHttps,
    consentAccepted,
    cookies: {
      count: rawCookies.length,
      details: cookieDetails.slice(0, 30),
    },
    storage: { lsCount, lsSize, ssCount, ssSize },
    banners,
    tcf: tcfData,
    vendorListLinks: dedupedVendorLinks,
    policyLinks: policyLinks.slice(0, 5),
    forms,
    headers,
    mixedDetail,
    iframes: iframes.slice(0, 20),
    thirdPartyScripts: [...new Set(thirdPartyScripts.map((s) => s.host))],
    scriptsWithoutSRI: scriptsWithoutSRI.length,
    totalThirdPartyScripts: thirdPartyScripts.length,
    stylesheetsWithoutSRI: stylesheets.filter((s) => !s.hasSRI).length,
    serviceWorker,
    libs,
    inlineHandlers,
  };
})();
