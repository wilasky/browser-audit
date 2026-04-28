# Chrome Web Store — Listing Content

## Extension details

**Name (45 chars max):**
```
Browser Audit — Security & Privacy Check
```
(41 chars)

**Short description (132 chars max):**
```
Audit your browser's security settings and inspect JavaScript behavior on any website. Free health check + ScriptSpy inspector.
```
(127 chars)

---

## Long description (English — primary)

```
Browser Audit gives you two powerful tools in one extension:

🔒 BROWSER HEALTH CHECK
Get an instant security score (0–100) for your Chrome configuration. Browser Audit runs more than 50 security and privacy checks against public baselines (CIS Benchmark, NIST SP 800-53, CCN-STIC-885 / Spanish ENS), grouped by category:

• Is Chrome up to date?
• Are third-party cookies blocked?
• Is DNS over HTTPS active?
• Is Safe Browsing in Enhanced mode?
• Are there malicious extensions installed?
• Do your extensions have excessive permissions?
• How unique is your browser fingerprint?
• Is WebRTC leaking your real IP?

Each failed check shows exactly what to fix and links directly to the right Chrome settings page.

🕵️ SCRIPTSPY
Inspect what JavaScript is actually doing on any website — in real time. See which scripts make network requests, read cookies, track your mouse, or use fingerprinting techniques to identify you without cookies.

For each script, ScriptSpy shows:
• Risk score (0–100) with explanation
• Whether it's first-party or third-party
• Network destinations contacted
• Fingerprinting techniques used (canvas, WebGL, audio, navigator, fonts)
• Input and mouse event listeners

Click "View script ↗" to open the source in Chrome's built-in viewer.

🔐 PRIVACY BY DESIGN
• All analysis runs locally in your browser
• No browsing history, URLs, or personal data ever leaves your device
• ScriptSpy only activates when you open the popup — no background monitoring
• Optional permissions (management, privacy API) requested only when you use those features

📤 EXPORT & SHARE
• Export audits as JSON or PDF
• Pre-filled GitHub issue for bug reports
• Local audit history

🤖 OPTIONAL AI INTEGRATION
• Bring your own Claude / OpenAI / Ollama API key
• Summarize privacy policies in 3 bullets
• 100% opt-in — extension works fully without it

100% free, open source, no account required.
```

---

## Long description (Spanish)

```
Browser Audit te ofrece dos herramientas potentes en una sola extensión:

🔒 BROWSER HEALTH CHECK
Obtén un score de seguridad (0-100) para tu configuración de Chrome. Browser Audit ejecuta más de 50 chequeos de seguridad y privacidad contra baselines públicas (CIS Benchmark, NIST SP 800-53, CCN-STIC-885 / ENS), agrupados por categoría:

• ¿Chrome está actualizado?
• ¿Están bloqueadas las cookies de terceros?
• ¿Está activo el DNS sobre HTTPS?
• ¿Safe Browsing en modo Mejorado?
• ¿Hay extensiones maliciosas instaladas?
• ¿Tienen tus extensiones permisos excesivos?
• ¿Qué tan única es la huella digital de tu navegador?
• ¿Está filtrando tu IP real por WebRTC?

Cada fallo muestra exactamente qué hacer para arreglarlo, con acceso directo a la página correcta de ajustes de Chrome.

🕵️ SCRIPTSPY
Inspecciona en tiempo real qué hace el JavaScript de cualquier web. Descubre qué scripts envían datos, leen cookies, rastrean tu ratón o usan técnicas de fingerprinting para identificarte sin cookies.

Por cada script, ScriptSpy muestra:
• Score de riesgo (0-100) con explicación en texto
• Si es de primer o tercer partido
• Destinos de red contactados
• Técnicas de fingerprinting usadas (canvas, WebGL, audio, navigator, fuentes)
• Listeners de input y ratón

Pulsa "Ver script ↗" para abrir el código fuente en Chrome.

🔐 PRIVACIDAD POR DISEÑO
• Todo el análisis se ejecuta localmente en tu navegador
• Ningún historial, URL ni dato personal sale de tu dispositivo
• ScriptSpy solo se activa cuando abres el popup — sin monitorización en segundo plano
• Los permisos opcionales (gestión, API de privacidad) se solicitan solo al usar esas funciones

📤 EXPORT
• Descarga auditorías como JSON o PDF
• Histórico local de auditorías
• Botón directo para reportar bugs en GitHub

🤖 INTEGRACIÓN IA OPCIONAL
• Usa tu propia API key de Claude / OpenAI / Ollama
• Resumen automático de políticas de privacidad en 3 bullets
• 100% opt-in — la extensión funciona completa sin esto

100% gratis, código abierto, sin cuenta.
```

---

## Store metadata

| Field | Value |
|-------|-------|
| Category | Privacy & Security |
| Language | English (primary), Spanish |
| Website | https://github.com/wilasky/browser-audit |
| Privacy Policy URL | https://wilasky.github.io/browser-audit/PRIVACY_POLICY |
| Support URL | https://github.com/wilasky/browser-audit/issues |
| Visibility | Public |
| Regions | Worldwide |

---

## Screenshots required (1280×800 px)

1. **Health Check Overview** — Score circle + list of checks with pass/warn/fail indicators
2. **ScriptSpy in action** — List of scripts from a real site (e.g. a news site) with risk scores and event chips
3. **Fix instructions panel** — A check with the inline instructions panel open
4. **ScriptSpy legend** — Legend panel expanded showing what each term means
5. **Pro upgrade screen** — Free vs Pro comparison

**Promotional tile (440×280 px):** Score circle + "Browser Audit" text on dark background

---

## Justification for permissions (required by CWS)

**storage:** Cache audit results, settings, and ScriptSpy data locally. No data transmitted.

**activeTab:** Run ScriptSpy only on the tab the user is currently viewing, when they explicitly activate it. Does not grant persistent access.

**scripting:** Inject the analysis content scripts on demand. All scripts are bundled inside the extension package (instrumentation.js, bridge.js, compliance-probe.js, page-text-probe.js); no remotely hosted code is loaded or executed.

**webNavigation:** Detect when the user navigates to a new page so ScriptSpy data can be reset for the new page context. Not used to monitor or record browsing activity.

**alarms:** Schedule two local periodic tasks inside the service worker, with no network calls: (1) re-apply the user's privacy hardening every 30 minutes so the chrome.privacy / contentSettings choices the user explicitly enabled cannot be silently reverted; (2) re-run the local browser health audit once a day to keep the score in the popup up to date.

**management (optional):** Read the list of installed extensions to check against the security blacklist. Only requested when the user opens that section.

**privacy (optional):** Read and modify Chrome privacy settings (Safe Browsing, DoH, third-party cookies, etc.) to perform and apply fixes from the security audit. Only requested when the user clicks "Apply" on a related check.

**contentSettings (optional):** Read and modify content settings (cookies, JavaScript, etc.) as part of the security audit. Only requested when the user clicks "Apply" on a related check.

**\<all_urls\> (optional host):** Inject the analysis content script on any site the user explicitly chooses to audit. Granted only on user action; the extension does not crawl or fetch URLs in the background.
