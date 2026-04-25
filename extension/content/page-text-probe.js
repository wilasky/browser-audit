// Extract page text content for AI analysis. Runs on demand in MAIN world.
(function () {
  // Try to find the main content container first; fallback to body
  const candidates = [
    document.querySelector('main'),
    document.querySelector('article'),
    document.querySelector('[role="main"]'),
    document.querySelector('.content, #content, .main, #main'),
  ].filter(Boolean);

  const root = candidates[0] || document.body;

  // Strip noise: scripts, styles, navs, ads
  const clone = root.cloneNode(true);
  clone.querySelectorAll('script, style, noscript, nav, header > nav, .ad, .advertisement, [aria-hidden="true"]')
    .forEach((el) => el.remove());

  const text = (clone.textContent || '')
    .replace(/\s+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return {
    title: document.title,
    host: location.hostname,
    url: location.href,
    text: text.slice(0, 15000),
    length: text.length,
  };
})();
