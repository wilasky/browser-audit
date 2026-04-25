// Compliance probe — runs in MAIN world on demand to analyze the active page.
// Returns a structured report with cookie, GDPR, privacy and security signals.

(async function () {
  const cookies = document.cookie.split(';').map((c) => c.trim()).filter(Boolean);

  // Detect cookie banner heuristics
  const bannerKeywords = [
    'cookie', 'consent', 'rgpd', 'gdpr', 'aceptar', 'accept', 'privacy',
    'consentimiento', 'configurar cookies',
  ];
  const banners = [];
  document.querySelectorAll('div, section, aside, dialog, footer').forEach((el) => {
    const text = (el.textContent || '').toLowerCase().slice(0, 500);
    const hasButton = el.querySelector('button, a[role="button"]');
    const matches = bannerKeywords.filter((k) => text.includes(k));
    if (matches.length >= 2 && hasButton && el.offsetHeight > 50) {
      banners.push({
        tag: el.tagName,
        keywords: matches,
        hasAcceptBtn: !!Array.from(el.querySelectorAll('button, a')).find((b) =>
          /aceptar|accept|allow|ok|agree|estoy de acuerdo/i.test(b.textContent || '')
        ),
        hasRejectBtn: !!Array.from(el.querySelectorAll('button, a')).find((b) =>
          /rechazar|reject|deny|denegar|no acepto/i.test(b.textContent || '')
        ),
        hasConfigBtn: !!Array.from(el.querySelectorAll('button, a')).find((b) =>
          /configurar|preferencias|settings|customize|gestionar/i.test(b.textContent || '')
        ),
      });
    }
  });

  // Detect privacy policy / cookie policy links
  const policyLinks = [];
  document.querySelectorAll('a[href]').forEach((a) => {
    const text = (a.textContent || '').trim().toLowerCase();
    const href = a.getAttribute('href') || '';
    if (/privacid|privacy|cookies|legal|aviso legal|datos|gdpr|rgpd/i.test(text)) {
      policyLinks.push({ text: text.slice(0, 50), href: href.slice(0, 100) });
    }
  });

  // Sensitive form fields
  const forms = [];
  document.querySelectorAll('form').forEach((form) => {
    const inputs = form.querySelectorAll('input');
    const sensitive = [];
    inputs.forEach((inp) => {
      const type = (inp.getAttribute('type') || 'text').toLowerCase();
      const name = (inp.getAttribute('name') || inp.id || '').toLowerCase();
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
      forms.push({
        action: (form.getAttribute('action') || location.pathname).slice(0, 80),
        method: (form.getAttribute('method') || 'GET').toUpperCase(),
        sensitive,
      });
    }
  });

  // Try to read security headers via fetch HEAD (same-origin, no CORS)
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
      xfo: res.headers.get('x-frame-options'),
      xcto: res.headers.get('x-content-type-options'),
      referrerPolicy: res.headers.get('referrer-policy'),
      permissionsPolicy: res.headers.get('permissions-policy'),
      coop: res.headers.get('cross-origin-opener-policy'),
      coep: res.headers.get('cross-origin-embedder-policy'),
    };
  } catch (e) {
    headers = { error: e.message };
  }

  // Mixed content detection
  const isHttps = location.protocol === 'https:';
  let mixedContent = 0;
  if (isHttps) {
    document.querySelectorAll('img, script, link, iframe').forEach((el) => {
      const src = el.src || el.href || '';
      if (src.startsWith('http://')) { mixedContent++; }
    });
  }

  // Third-party scripts loaded
  const scripts = document.querySelectorAll('script[src]');
  const thirdPartyScripts = [];
  const pageHost = location.hostname;
  scripts.forEach((s) => {
    try {
      const u = new URL(s.src);
      if (u.hostname !== pageHost && !u.hostname.endsWith('.' + pageHost)) {
        thirdPartyScripts.push(u.hostname);
      }
    } catch { /* ignore */ }
  });

  return {
    url: location.href,
    host: location.hostname,
    isHttps,
    cookies: {
      count: cookies.length,
      names: cookies.map((c) => c.split('=')[0]).slice(0, 20),
    },
    banners,
    policyLinks: policyLinks.slice(0, 5),
    forms,
    headers,
    mixedContent,
    thirdPartyScripts: [...new Set(thirdPartyScripts)],
  };
})();
