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
Get an instant security score (0–100) for your Chrome configuration. Browser Audit checks 16 security and privacy settings against a maintained baseline:

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

📊 PRO PLAN (coming soon)
• Real-time threat intelligence (URLhaus, MalwareBazaar, PhishTank)
• SHA256 hash-based lookups — your data stays anonymous
• PDF/JSON export of audit reports
• 90-day audit history

FREE PLAN includes the full Browser Health Check and ScriptSpy with local analysis. No account required.
```

---

## Long description (Spanish)

```
Browser Audit te ofrece dos herramientas potentes en una sola extensión:

🔒 BROWSER HEALTH CHECK
Obtén un score de seguridad (0-100) para tu configuración de Chrome. Browser Audit comprueba 16 ajustes de seguridad y privacidad contra una baseline mantenida:

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

El plan gratuito incluye el Browser Health Check completo y ScriptSpy con análisis local. Sin cuenta necesaria.
```

---

## Store metadata

| Field | Value |
|-------|-------|
| Category | Privacy & Security |
| Language | English (primary), Spanish |
| Website | https://github.com/wilasky/browser-audit |
| Privacy Policy URL | (host PRIVACY_POLICY.md publicly) |
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

**scripting:** Inject the ScriptSpy instrumentation script on demand when the user activates it in the popup. Required by Manifest V3 for dynamic script injection.

**webNavigation:** Detect when the user navigates to a new page so ScriptSpy data can be reset for the new page context. Not used to monitor or record browsing activity.

**management (optional):** Read the list of installed extensions to check against the security blacklist. Only requested when the user enables this feature.

**privacy (optional):** Read Chrome privacy settings (Safe Browsing, DoH, third-party cookies, etc.) to perform the security audit. Only requested when the user enables this feature.
