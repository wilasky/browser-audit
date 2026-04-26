// English translations for baseline.v1.json check descriptions.
// Mapped by check.id. Keys: title, rationale, fix.instructions

import { localized } from './i18n.js';

const EN = {
  'chrome-version': {
    title: 'Chrome up to date',
    rationale: 'Older Chrome versions contain publicly known vulnerabilities that can be exploited by malicious sites.',
    instructions: 'Go to "About Chrome" and allow the update if available.',
  },
  'third-party-cookies': {
    title: 'Third-party cookies blocked',
    rationale: 'Third-party cookies allow ad networks to track you across sites without your knowledge.',
    instructions: 'Select "Block third-party cookies".',
  },
  'do-not-track': {
    title: 'Do Not Track signal active',
    rationale: 'Although DNT is not legally binding, some sites respect it voluntarily.',
    instructions: 'Chrome 120+: Settings > Privacy and security > Ad controls > scroll to "Send a Do Not Track request". If not present, this option has been removed in your Chrome version.',
  },
  'doh-enabled': {
    title: 'DNS over HTTPS active',
    rationale: 'Without DNS over HTTPS, your ISP sees every domain you visit in cleartext.',
    instructions: 'In "Use secure DNS" enable the option and pick Cloudflare (1.1.1.1) or Google (8.8.8.8).',
  },
  'https-only-mode': {
    title: 'HTTPS-First mode active',
    rationale: 'Forces the browser to attempt HTTPS before HTTP, preventing downgrade attacks. Chrome does not expose this to extensions — must be verified manually.',
    instructions: 'Look for "Always use secure connections" and enable it.',
  },
  'safe-browsing-enhanced': {
    title: 'Enhanced Safe Browsing',
    rationale: 'Enhanced mode detects new phishing and malware before they appear in known lists.',
    instructions: 'In "Safe Browsing" select "Enhanced protection" (the first option, with shield icon).',
  },
  'autofill-credit-cards': {
    title: 'Credit card autofill disabled',
    rationale: 'Saved cards can be exfiltrated by malicious scripts on compromised payment pages.',
    instructions: 'Disable "Save and fill payment methods".',
  },
  'extensions-blacklist': {
    title: 'No malicious extensions',
    rationale: 'There are extensions identified as malicious that steal credentials or exfiltrate personal data.',
    instructions: 'Immediately uninstall flagged extensions and change passwords on important services.',
  },
  'extensions-permissions': {
    title: 'No extensions with excessive permissions',
    rationale: 'Extensions with many sensitive permissions can do major damage if compromised or sold.',
    instructions: 'Review whether the flagged extensions actually need those permissions. If unsure, uninstall.',
  },
  'extensions-from-cws': {
    title: 'Extensions from Chrome Web Store',
    rationale: 'Sideloaded extensions do not pass Google review and are a frequent malware vector.',
    instructions: 'Uninstall extensions not from the Chrome Web Store unless they are yours for development.',
  },
  'extensions-mv2-deprecated': {
    title: 'No obsolete MV2 extensions',
    rationale: 'Manifest V2 extensions are being phased out by Google and may stop working or create security risks.',
    instructions: 'Find MV3 alternatives for the flagged extensions or contact the developer.',
  },
  'fingerprint-entropy': {
    title: 'Browser fingerprint',
    rationale: 'The more unique your browser, the easier you are to track without cookies.',
    instructions: 'Visit EFF Cover Your Tracks for a more complete evaluation.',
  },
  'webrtc-leak': {
    title: 'No WebRTC IP leaks',
    rationale: 'WebRTC can reveal your real IP even through a VPN.',
    instructions: 'Chrome does not expose this in the UI. To mitigate install the "WebRTC Leak Prevent" extension from Chrome Web Store, or check your VPN client for built-in WebRTC protection.',
  },
  'popups-blocked': {
    title: 'Popups blocked by default',
    rationale: 'Popups are used for phishing, scareware and aggressive ads.',
    instructions: 'Make sure popups are blocked by default.',
  },
  'safe-browsing-enabled': {
    title: 'Safe Browsing active',
    rationale: 'Safe Browsing is the first line of defense against known phishing and malware.',
    instructions: 'In "Safe Browsing" select at least "Standard protection". Do not disable this option.',
  },
  'password-leak-detection': {
    title: 'Leaked password detection',
    rationale: 'Chrome can warn when you use a password that has appeared in known data breaches.',
    instructions: 'Look for "Warn if passwords are exposed in a data breach" or "Password protection" and enable it.',
  },
  'hyperlink-auditing': {
    title: 'Hyperlink auditing disabled',
    rationale: "The 'ping' attribute on links lets sites track which links you click by sending silent requests to a third-party server.",
    instructions: 'Disable hyperlink auditing pings.',
  },
  'network-prediction': {
    title: 'Network prediction disabled',
    rationale: "Network prediction (prefetch/preconnect) connects to destinations you haven't visited, revealing browsing intent to third parties.",
    instructions: "Disable Chrome's prefetch and preconnect.",
  },
  'referrer-headers': {
    title: 'Referer headers controlled',
    rationale: 'Referer headers reveal which page you came from, enabling cross-domain tracking.',
    instructions: 'Disable Referer headers.',
  },
  'autofill-addresses': {
    title: 'Address autofill disabled',
    rationale: 'Saved addresses can be exfiltrated by malicious scripts in compromised forms.',
    instructions: 'Disable address autofill.',
  },
  'translation-service': {
    title: 'Translation service non-invasive',
    rationale: "Chrome's translation service sends the full page content to Google servers to translate it.",
    instructions: 'Disable automatic translation service.',
  },
  'spelling-service': {
    title: 'Cloud spell-checker disabled',
    rationale: 'The cloud spell-checker sends what you type in any text field to Google servers to correct it.',
    instructions: 'Disable the cloud spell-checker. Local spell-checker still works.',
  },
  'search-suggestions': {
    title: 'Search suggestions disabled',
    rationale: 'Search suggestions send every keystroke in the address bar to the search engine before you finish typing.',
    instructions: 'Disable real-time text sending to the search engine.',
  },
  'url-keyed-suggestions': {
    title: 'URL-keyed suggestions disabled',
    rationale: 'Chrome sends error page URLs to Google to provide suggestions. This leaks browsing information.',
    instructions: 'Disable enhanced error pages.',
  },
  'safe-browsing-extended-reporting': {
    title: 'Safe Browsing extended reporting disabled',
    rationale: 'Extended reporting sends Google data about suspicious pages you visit, including URLs.',
    instructions: 'Disable extra data sending to Google for Safe Browsing.',
  },
  'metrics-reporting': {
    title: 'Usage metrics and reporting',
    rationale: 'Chrome continuously sends usage statistics, crashes and performance data to Google. The API to audit this is not exposed to extensions.',
    instructions: "In Sync and Google services, disable 'Help improve Chrome features and performance'.",
  },
  'extensions-count': {
    title: 'Reasonable extension count',
    rationale: 'Each extension is third-party code with browser access. More than 10 active extensions significantly increases attack surface.',
    instructions: 'Review your extensions and uninstall unused ones. Fewer extensions = less risk.',
  },
  'extensions-dev-mode': {
    title: 'Developer mode disabled',
    rationale: 'Developer mode lets you load extensions without Google review. Common malware vector for non-technical users.',
    instructions: "Disable 'Developer mode' if you are not actively developing extensions.",
  },
  'fingerprint-canvas-protection': {
    title: 'Canvas fingerprint protected',
    rationale: 'Canvas fingerprint is the most precise tracker identifier available. Brave and Firefox Strict block it by default. Chrome offers no native protection.',
    instructions: "Consider Brave (native blocking) or extensions like 'Canvas Fingerprint Defender'. Pure Chrome has no native way to block it.",
  },
  'webrtc-protection': {
    title: 'Strict WebRTC protection',
    rationale: "Only 'disable_non_proxied_udp' guarantees no IP leaks with VPN. 'default_public_interface_only' is still vulnerable in some configs.",
    instructions: 'Enable the most restrictive WebRTC policy.',
  },
  'site-isolation': {
    title: 'Site isolation active',
    rationale: 'Site isolation protects against Spectre-like attacks that can extract data between tabs. Chrome enables it by default but some configs disable it.',
    instructions: 'Verify that site isolation is not disabled in chrome://flags.',
  },
  'idle-detection-blocked': {
    title: 'Idle detection API blocked',
    rationale: "The idle detection API lets sites know when you're not using the computer. A behavior tracking signal.",
    instructions: "Review 'Idle detection' permissions and revoke from sites that don't need it.",
  },
  'background-mode': {
    title: 'No background execution',
    rationale: 'Keeping Chrome running after closing windows increases attack surface.',
    instructions: "Disable 'Continue running background apps when Google Chrome is closed'.",
  },
  'ad-blocking-default': {
    title: 'Intrusive ad blocking active',
    rationale: 'The Ad Measurement API sends your advertising activity data to ad networks. Part of Google Privacy Sandbox.',
    instructions: 'Disable Ad Measurement (Privacy Sandbox).',
  },
  'topics-api-disabled': {
    title: 'Topics API disabled',
    rationale: "Topics API lets sites infer your interests for advertising without third-party cookies. Google's replacement for FLoC.",
    instructions: 'Disable Topics API. Your interests will not be inferred by Chrome.',
  },
  'fledge-api-disabled': {
    title: 'Protected Audience (FLEDGE) disabled',
    rationale: 'Protected Audience enables remarketing and ad auctions in the browser without third-party cookies.',
    instructions: 'Disable the Protected Audience API (FLEDGE).',
  },
  'private-network-access': {
    title: 'Private Network Access protected',
    rationale: 'Private Network Access blocks public sites from accessing your local network (router, NAS, IoT) without explicit permission. Protects against DNS rebinding attacks.',
    instructions: "Enable 'Block insecure private network requests' in chrome://flags.",
  },
  'chrome-management-policy': {
    title: 'No unexpected management policies',
    rationale: 'Enterprise management policies can add extensions, certificates or servers without your knowledge. In personal environments, indicates possible compromise.',
    instructions: "Review all listed policies. If you or your company didn't configure them, it could be malware.",
  },
  'downloads-prompt': {
    title: 'Confirm before downloading',
    rationale: 'Asking Chrome for the location before each download prevents drive-by malware downloads.',
    instructions: "Enable 'Ask where to save each file before downloading'.",
  },
  'geolocation-blocked': {
    title: 'Geolocation blocked by default',
    rationale: 'Making geolocation opt-in per site prevents websites from accessing your location without notice.',
    instructions: "Select 'Don't allow sites to see your location' or 'Ask first'.",
  },
  'password-saving': {
    title: 'No password saving in Chrome',
    rationale: "Chrome's password manager is accessible if your session is compromised. Better to use a dedicated manager (Bitwarden, 1Password, KeePass).",
    instructions: 'Disable password saving in Chrome. Consider Bitwarden or KeePass.',
  },
  'drm-disabled': {
    title: 'Protected content (DRM) disabled',
    rationale: 'DRM (Widevine in Chrome) can be used for device fingerprinting. Only needed for Netflix/Spotify Web.',
    instructions: "Disable protected content if you don't need it.",
  },
  'camera-default-blocked': {
    title: 'Camera blocked by default',
    rationale: 'Allowing camera by default to any site is a serious privacy and security risk.',
    instructions: "Make sure the option is 'Don't allow' or 'Ask first'.",
  },
  'microphone-default-blocked': {
    title: 'Microphone blocked by default',
    rationale: 'Allowing microphone by default to any site is a serious privacy and security risk.',
    instructions: "Make sure the option is 'Don't allow' or 'Ask first'.",
  },
  'notifications-default-blocked': {
    title: 'Notifications blocked by default',
    rationale: 'Notifications are a vector for phishing and ad abuse. Better opt-in case by case.',
    instructions: "Select 'Don't allow' or 'Ask first'.",
  },
  'global-privacy-control': {
    title: 'Global Privacy Control (GPC) active',
    rationale: 'GPC is the modern, legally binding successor to Do Not Track. California (CCPA) and other jurisdictions are required to respect it.',
    instructions: 'Enable GPC to send a universal no-tracking signal to all sites.',
  },
  'privacy-sandbox-master': {
    title: 'Privacy Sandbox disabled',
    rationale: "Master switch that disables all of Google's Privacy Sandbox APIs at once (Topics, FLEDGE, Ad Measurement, Attribution Reporting).",
    instructions: 'Disable Privacy Sandbox entirely. Equivalent to disabling Topics, FLEDGE and Ad Measurement together.',
  },
  'related-website-sets': {
    title: 'Related Website Sets disabled',
    rationale: "Allows companies to declare multiple domains as 'same site' to share cookies between them. A covert cross-domain tracking vector.",
    instructions: 'Disable Related Website Sets to prevent cross-domain tracking by same-owner companies.',
  },
};

// Map { es, en } pairs lazily — used by the popup to pick the right text
export function checkText(checkId, fieldEs, field) {
  // field: 'rationale' | 'instructions' | 'title'
  const en = EN[checkId]?.[field];
  if (!en) { return localized(fieldEs); }
  // Wrap in {es, en} so localized() picks the right one
  return localized({ es: fieldEs, en });
}

// Category labels (from baseline.v1.json) — translated by id
const CATEGORY_LABELS = {
  updates:     { es: 'Actualizaciones', en: 'Updates' },
  privacy:     { es: 'Privacidad',      en: 'Privacy' },
  security:    { es: 'Seguridad',       en: 'Security' },
  extensions:  { es: 'Extensiones',     en: 'Extensions' },
  fingerprint: { es: 'Huella digital',  en: 'Fingerprint' },
  leaks:       { es: 'Fugas',           en: 'Leaks' },
};

export function categoryLabel(catId) {
  const entry = CATEGORY_LABELS[catId];
  return entry ? localized(entry) : catId;
}

// Translate detail strings that come from audit-engine.js (background returns ES)
export function translateDetail(detail) {
  if (!detail || typeof detail !== 'string') { return detail; }

  // Exact matches
  const EXACT = {
    'Configurado correctamente': 'Configured correctly',
    'API no disponible': 'API not available',
    'Sin extensiones Manifest V2': 'No Manifest V2 extensions',
    'Sin fugas de IP por WebRTC': 'No WebRTC IP leaks',
    'Aislamiento de sitios activo': 'Site isolation active',
    'SharedArrayBuffer no disponible — posible configuración inusual':
      'SharedArrayBuffer not available — possibly unusual configuration',
    'Sin permiso "privacy" no se puede aplicar.':
      'Cannot apply without "privacy" permission.',
    'Sin extensiones gestionadas por política':
      'No policy-managed extensions',
    'Permiso management no concedido':
      'management permission not granted',
    'Ninguna extensión con permisos excesivos':
      'No extensions with excessive permissions',
    'Todas las extensiones provienen de Chrome Web Store':
      'All extensions are from Chrome Web Store',
    'Pendiente de cálculo (abre una página web)':
      'Calculation pending (open a web page)',
    'Revisa manualmente en chrome://settings/content':
      'Review manually in chrome://settings/content',
  };
  if (EXACT[detail]) { return localized({ es: detail, en: EXACT[detail] }); }

  // Patterns with values
  const PATTERNS = [
    // "No aplicable en tu Chrome (la API privacy.X.Y no está expuesta a extensiones en esta versión o plataforma)"
    [/^No aplicable en tu Chrome \(la API privacy\.(.+) no está expuesta a extensiones en esta versión o plataforma\)$/,
     (m) => `Not applicable in your Chrome (privacy.${m[1]} API is not exposed to extensions in this version or platform)`],
    // "Verifica manualmente en X — Chrome no expone esta opción a extensiones"
    [/^Verifica manualmente en (.+) — Chrome no expone esta opción a extensiones$/,
     (m) => `Verify manually in ${m[1]} — Chrome does not expose this option to extensions`],
    // "Verifica manualmente en chrome://flags#..."
    [/^Verifica manualmente en (chrome:\/\/flags.+)$/,
     (m) => `Verify manually in ${m[1]}`],
    // "Verifica en chrome://settings/downloads que esté activado..."
    [/^Verifica en (chrome:\/\/settings\S+) que esté activado "Preguntar dónde guardar"$/,
     (m) => `Verify in ${m[1]} that "Ask where to save" is enabled`],
    // "Chrome v136"
    [/^Chrome v(\d+)$/, (m) => `Chrome v${m[1]}`],
    // "Brave v136 (motor Chromium 136)"
    [/^(\w+) v(\d+) \(motor Chromium (\d+)\)$/,
     (m) => `${m[1]} v${m[2]} (Chromium engine ${m[3]})`],
    // "Chrome v130 — considera actualizar (Chromium mínimo recomendado: v134)"
    [/^(\w+) v(\d+) — considera actualizar \(Chromium mínimo recomendado: v(\d+)\)$/,
     (m) => `${m[1]} v${m[2]} — consider updating (Chromium recommended minimum: v${m[3]})`],
    // "Chrome v120 — versión antigua con vulnerabilidades conocidas (Chromium mínimo: v134)"
    [/^(\w+) v(\d+) — versión antigua con vulnerabilidades conocidas \(Chromium mínimo: v(\d+)\)$/,
     (m) => `${m[1]} v${m[2]} — outdated version with known vulnerabilities (Chromium minimum: v${m[3]})`],
    // "5 extensión(es) revisada(s), ninguna en lista negra"
    [/^(\d+) extensión\(es\) revisada\(s\), ninguna en lista negra$/,
     (m) => `${m[1]} extension(s) reviewed, none on blacklist`],
    // "5 extensión(es) en lista negra"
    [/^(\d+) extensión\(es\) en lista negra$/,
     (m) => `${m[1]} extension(s) on blacklist`],
    // "5 extensiones activas (recomendado: máximo 10)"
    [/^(\d+) extensiones activas \(recomendado: máximo (\d+)\)$/,
     (m) => `${m[1]} active extensions (recommended max: ${m[2]})`],
    // "5 extensión(es) activa(s)"
    [/^(\d+) extensión\(es\) activa\(s\)$/,
     (m) => `${m[1]} active extension(s)`],
    // "Modo desarrollador activo (3 extensión(es) sin verificar)"
    [/^Modo desarrollador activo \((\d+) extensión\(es\) sin verificar\)$/,
     (m) => `Developer mode active (${m[1]} unverified extension(s))`],
    // "5 extensión(es) instalada(s) manualmente"
    [/^(\d+) extensión\(es\) instalada\(s\) manualmente$/,
     (m) => `${m[1]} manually installed extension(s)`],
    // "5 extensión(es) gestionada(s) por política — verifica que sean tuyas"
    [/^(\d+) extensión\(es\) gestionada\(s\) por política — verifica que sean tuyas$/,
     (m) => `${m[1]} policy-managed extension(s) — verify they are yours`],
    // "5 extensión(es) con 2+ permisos sensibles"
    [/^(\d+) extensión\(es\) con (\d+)\+ permisos sensibles$/,
     (m) => `${m[1]} extension(s) with ${m[2]}+ sensitive permissions`],
    // "5 extensión(es) en Manifest V2 (obsoleto)"
    [/^(\d+) extensión\(es\) en Manifest V2 \(obsoleto\)$/,
     (m) => `${m[1]} extension(s) on Manifest V2 (obsolete)`],
    // "Política WebRTC: default"
    [/^Política WebRTC: (.+)$/, (m) => `WebRTC policy: ${m[1]}`],
    // "WebRTC en modo más restrictivo"
    [/^WebRTC en modo más restrictivo$/, () => 'WebRTC in most restrictive mode'],
    // "WebRTC policy: X (necesita: disable_non_proxied_udp)"
    [/^WebRTC policy: (.+) \(necesita: (.+)\)$/,
     (m) => `WebRTC policy: ${m[1]} (needs: ${m[2]})`],
    // "Valor actual: X"
    [/^Valor actual: (.+)$/, (m) => `Current value: ${m[1]}`],
    // "12.5 bits — navegador común"
    [/^([\d.]+) bits — navegador común$/, (m) => `${m[1]} bits — common browser`],
    [/^([\d.]+) bits — moderadamente único$/, (m) => `${m[1]} bits — moderately unique`],
    [/^([\d.]+) bits — altamente identificable$/, (m) => `${m[1]} bits — highly identifiable`],
    // "Canvas fingerprint bloqueado por el navegador"
    [/^Canvas fingerprint bloqueado por el navegador$/, () => 'Canvas fingerprint blocked by browser'],
    // "Canvas fingerprint NO bloqueado — rastreable por cualquier web"
    [/^Canvas fingerprint NO bloqueado — rastreable por cualquier web$/,
     () => 'Canvas fingerprint NOT blocked — trackable by any website'],
    // "Default: ask"
    [/^Default: (.+)$/, (m) => `Default: ${m[1]}`],
    // "No se pudo leer la versión del navegador"
    [/^No se pudo leer la versión del navegador$/, () => 'Could not read browser version'],
    // "Controlado por política corporativa"
    [/^Controlado por política corporativa$/, () => 'Controlled by corporate policy'],
    // "Otra extensión controla este ajuste — desactívala o revoca su acceso"
    [/^Otra extensión controla este ajuste — desactívala o revoca su acceso$/,
     () => 'Another extension controls this setting — disable it or revoke its access'],
    // "Política corporativa o sistema bloquea este cambio"
    [/^Política corporativa o sistema bloquea este cambio$/,
     () => 'Corporate policy or system blocks this change'],
    // "Cambio aplicado pero el valor sigue siendo "X". El navegador puede no soportar este valor."
    [/^Cambio aplicado pero el valor sigue siendo "(.+)"\. El navegador puede no soportar este valor\.$/,
     (m) => `Change applied but value remains "${m[1]}". The browser may not support this value.`],
    // "Requiere permiso "X""
    [/^Requiere permiso "(.+)"$/, (m) => `Requires "${m[1]}" permission`],
    // "Handler "X" no implementado"
    [/^Handler "(.+)" no implementado$/, (m) => `Handler "${m[1]}" not implemented`],
    // "Error: X"
    [/^Error: (.+)$/, (m) => `Error: ${m[1]}`],
  ];

  for (const [pattern, fn] of PATTERNS) {
    const m = detail.match(pattern);
    if (m) {
      const en = fn(m);
      return localized({ es: detail, en });
    }
  }

  return detail; // No translation found, return original
}
