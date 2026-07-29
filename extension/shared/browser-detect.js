// Detect the underlying Chromium-based browser the extension is running in.
//
// Returns a single source of truth used by audit-engine (to label userAgent
// audits) and fingerprint-detail (to pick browser-specific privacy tips).
//
// Async because navigator.brave.isBrave() returns a Promise.

export async function detectBrowser() {
  const ua = navigator.userAgent;
  const m = ua.match(/Chrome\/(\d+)\./);
  const chromiumVersion = m ? parseInt(m[1], 10) : null;

  let id = 'chrome';
  let name = 'Chrome';
  let isDerivative = false;
  // Native fingerprint protections — true means the browser already mitigates
  // canvas / webgl / audio FP by default, so "install canvas blocker" tips
  // are unnecessary or wrong.
  let hasNativeCanvasBlock = false;
  let hasNativeFingerprintBlock = false;

  // Brave hides itself in the UA but exposes navigator.brave.isBrave().
  if (typeof navigator.brave?.isBrave === 'function') {
    try {
      if (await navigator.brave.isBrave()) {
        id = 'brave'; name = 'Brave'; isDerivative = true;
        hasNativeCanvasBlock = true;
        hasNativeFingerprintBlock = true;
      }
    } catch { /* fallthrough to UA sniffing */ }
  }

  if (id === 'chrome') {
    if (/Edg\//.test(ua))         { id = 'edge';     name = 'Edge';     isDerivative = true; }
    else if (/OPR\//.test(ua))    { id = 'opera';    name = 'Opera';    isDerivative = true; }
    else if (/Vivaldi\//.test(ua)){ id = 'vivaldi';  name = 'Vivaldi';  isDerivative = true; }
    else {
      // Arc does not change the UA. Best-effort detection via UA-CH brands.
      // Falls back to Chrome silently if the brand does not advertise itself.
      const brands = navigator.userAgentData?.brands ?? [];
      if (brands.some((b) => /\bArc\b/i.test(b.brand))) {
        id = 'arc'; name = 'Arc'; isDerivative = true;
      }
    }
  }

  return { id, name, chromiumVersion, isDerivative, hasNativeCanvasBlock, hasNativeFingerprintBlock };
}
