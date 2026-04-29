# Tareas pendientes — Lucent (Browser Audit)

## 🔴 Bloqueante: Restaurar workflow CI en GitHub

**Por qué falta:** El push original falló porque el Personal Access Token no tenía scope `workflow`. Decidimos eliminar `.github/workflows/ci.yml` para hacer push, y restaurarlo manualmente después por la web.

**Cómo restaurarlo:**

1. Ir a: https://github.com/wilasky/browser-audit
2. Click en **Add file** → **Create new file**
3. En el campo de path escribir: `.github/workflows/ci.yml`
4. Pegar este contenido (o copiarlo del local antes de eliminarlo):

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  lint-and-test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Lint
        run: npm run lint

      - name: Build
        run: npm run build

      - name: Test
        run: npm run test
        continue-on-error: true
```

5. Commit message: `ci: restore CI workflow`
6. Pulsar **Commit new file**

Después, en local hacer `git pull` para sincronizar.

**Alternativa:** Si en el futuro quieres añadirlo desde local, **regenera el token** con scope `workflow` también marcado, y el push funcionará.

---

## 📋 Estado de la publicación

### ✅ Hecho
- Código completo, 28 tests pasando, lint limpio
- ZIP de producción listo: `browser-audit-2026-04-25.zip` (317 KB)
- Privacy Policy escrita: `docs/PRIVACY_POLICY.md`
- Terms escritos: `docs/TERMS.md`
- Listing CWS preparado: `docs/CWS_LISTING.md`
- Landing page: `landing/index.html`
- Iconos circulares con transparencia
- LICENSE MIT
- Nombre: **Lucent**
- Screenshots tomadas: `docs/screenshoots/`

### 🔴 Pendiente para publicar
1. **Push a GitHub** — falta restaurar workflow (paso de arriba)
2. **Crear cuenta Chrome Web Store Developer** ($5 una vez)
   - https://chrome.google.com/webstore/devconsole
3. **Hostear Privacy Policy públicamente**
   - Activar GitHub Pages en el repo:
     Settings → Pages → Source: `main` branch, `/docs` folder → Save
   - URL será: `https://wilasky.github.io/browser-audit/PRIVACY_POLICY`
4. **Subir el ZIP a CWS** y rellenar listing:
   - Texto en `docs/CWS_LISTING.md` (EN + ES)
   - URL Privacy Policy del paso anterior
   - 5 screenshots de `docs/screenshoots/`
   - Categoría: Privacy & Security
   - Justificación de permisos: en `docs/CWS_LISTING.md` sección final

### 🟡 Tras publicar (no bloqueante)
- Crear Twitter/Mastodon
- Anunciar en r/privacy, r/netsec, r/chrome
- Actualizar nombre "Browser Audit" → "Lucent" en código (manifest, README, landing)
- Cambiar "Browser Audit" en `extension/manifest.json` → `"Lucent — Browser Audit"`
- Update v0.2 con: Wappalyzer-style detection, más security headers, leyenda RGPD, top scripts maliciosos

---

## 🚀 v0.2 — Features y mejoras

**Highlights pedidas por el usuario:**

1. **i18n COMPLETO** (resultados GDPR, Health checks, deep analysis ScriptSpy)
   — descripción detallada en bug #2 abajo
2. **Mejorar Chrome version check** — actualmente da igual mensaje en Brave que en Chrome.
   Solución: detectar si es Brave/Edge/Opera (chromium-based) via UA y ajustar mensaje.
   Para Brave: comparar contra última versión de Brave, no de Chrome upstream.
   Detectar via: `navigator.brave?.isBrave()`, `navigator.userAgentData.brands`.
3. **Cookie banner: detectar consentimiento ya aceptado**
   - Buscar cookies de consentimiento típicas (cookieConsent, OptanonAlertBoxClosed,
     CookieConsent, GDPR_consent, etc.) — si existen, el usuario ya aceptó
   - Buscar marcadores en localStorage (cookie_consent_user_consent_token, etc.)
   - Si el banner ya no está visible pero hay cookies de consent → reportar como "✓ Banner aceptado"
4. **Bug: detectar botón "Configurar/Ajustes" del banner aunque no lleve ese texto exacto**
   - Algunos banners usan: "Más opciones", "Personalizar", "Gestionar cookies", "Settings"
   - Ampliar regex en compliance-probe.js
5. **Análisis multi-lenguaje** (feature grande, post-v0.2 quizá v0.3)
   - Detectar y analizar scripts NO solo JavaScript: WASM, PHP server responses,
     respuestas de APIs sospechosas con código en otros lenguajes
   - Análisis de payloads en respuestas: ¿el servidor devuelve PHP? ¿Python pickle?
     ¿código serializado en respuestas JSON?
   - Pattern matching para signatures de exploits conocidos en respuestas

## 🐛 Bugs conocidos para v0.2

1. **Cookie banner detection mejorada** — cuando el usuario acepta cookies, la extensión
   sigue marcando "cookies cargadas sin banner detectado" porque el banner desaparece.
   Mejora: detectar si hubo banner aceptado mediante storage/cookies de consentimiento típicas
   (cookieConsent, OptanonAlertBoxClosed, etc.) o detectar marca de tiempo del consent.

2. **i18n parcial: detalles de checks siguen en español** — el chrome (botones, headers,
   tabs, secciones) está traducido pero las DESCRIPCIONES y RAZONES siguen en español:

   **Health Check** — strings hardcoded en español:
   - `extension/data/baseline.v1.json` — ~40 checks con `rationale`, `fix.instructions`,
     y `detail` que devuelven los handlers (~120 strings)
   - `extension/background/audit-engine.js` — mensajes de detail tipo "X extensión(es) en
     lista negra", "Sin extensiones MV2", etc. (~30 strings)

   **GDPR / Compliance** — strings hardcoded en `extension/popup/views/compliance.js`:
   - calcCookieScore: "Cookies cargadas sin banner...", "Banner con 'Aceptar' pero sin
     'Rechazar' — no cumple RGPD", etc.
   - calcGdprScore: "No se encontró link a política de privacidad", "Formulario con
     contraseña usando GET", etc.
   - calcSecurityScore: "La página NO usa HTTPS", header explanations, etc.
   - calcPentestScore: "iframe(s) cross-origin sin sandbox", "scripts externos SIN
     Subresource Integrity", "jQuery X obsoleto", etc.
   - Total: ~50 strings hardcoded en compliance.js

   **Script analyzer** — strings hardcoded en `extension/shared/script-analyzer.js`:
   - 17 SUSPICIOUS_APIS con `desc` en español
   - 3 OBFUSCATION_PATTERNS con `desc` en español
   - 4 verdict text en español
   - Total: ~25 strings

   **Plan de implementación v0.2:**
   - Para baseline: añadir `rationale_en` y `instructions_en` a cada check, función
     `getCheckText(check, field)` en helper que selecciona según idioma actual
   - Para compliance.js: cada `issues.push({ s, t })` pasa por `t('comp.issue.X')` con
     ~50 nuevas keys en i18n.js
   - Para script-analyzer.js: descs de patterns van por `t('analyzer.X')`
   - audit-engine: detail strings van por `t('audit.X', { n })`

   **Esfuerzo estimado:** ~3-4h. Total ~200 strings adicionales.

## 📝 Mejoras planificadas para v0.2 (post-lanzamiento)

Pediste en su día y no entraron en v0.1:

1. **Wappalyzer-style technology detection** — más allá de jQuery/React/Vue (50+ tecnologías)
2. **Más security headers** — extender la lista de checks (CORP, NEL, Reporting-Endpoints, etc.)
3. **Leyenda en pestaña RGPD** — explicación de términos como tienes en ScriptSpy
4. **Top scripts maliciosos / mini-base de datos** — biblioteca curada de scripts conocidos por riesgo
5. **Histórico de análisis profundos** — guardar resultados anteriores de análisis estático
6. **Reglas YARA** — para Pro futuro (post-backend)
7. **Botón Reportar bug/feedback** — pequeño botón en Settings o footer:
   - Opción A: `mailto:` con email pre-rellenado, info de versión y debug
   - Opción B: Link a GitHub Issues (más visible y público)
   - Opción C: Modal con textarea + envío a backend (cuando tengamos)
   - **Recomendación**: Opción B inicialmente (cero infra). Más adelante un widget propio
8. **i18n completo de toda la UI** — actualmente solo strings clave (tabs, botones principales).
   Faltan textos de Health Check, Compliance, ScriptSpy detalles
9. **Más idiomas** — actualmente ES + EN. Añadir FR, DE, PT-BR según mercado

---

## 💰 Modelo de negocio futuro

- Cliente: gratis siempre (MIT)
- Pro: threat intelligence backend, IA preempaquetada, YARA, export profesional, histórico 90 días
- Precio: €2/mes o €20/año (precio de lanzamiento)
- Backend en Hetzner CX21 (~€5/mes) cuando haya demanda

---

*Última actualización: 2026-04-25*

---

## 🛣️ Roadmap v0.3 (rama `feat/free-v03`) — extensiones futuras

### GDPR — Fase B (requiere permiso `cookies` opcional)

Fase A entregada en la rama (Phase A = purpose guessing, CMP detector, syncing detector,
session/auth warning por nombre, third-party dependency score, export JSON). Estas
features adicionales requieren el permiso `cookies` + `<all_urls>` host permission, lo
que tras Blue Argon CWS va a mirar con lupa — pedirlas solo cuando estén justificadas
en privacy-policy y UI:

- **Auditoría completa de atributos por cookie:** Secure, HttpOnly, SameSite,
  Expires/Max-Age, Domain, Path, Partitioned/CHIPS — vía `chrome.cookies.getAll({url})`.
- **Detección de cookies peligrosas con criterios completos:** sin Secure, sin HttpOnly,
  SameSite=None sin Secure, persistentes con expiración larga, cookies 3rd-party
  publicitarias, cookies accesibles desde JS, nombres sospechosos sin atributos seguros.
- **Tabla de duración / persistencia:** sesión / <30d / <6m / >6m / >1y con counts y riesgo.
- **Session/auth warning real con `httpOnly` flag** — el aviso por nombre que entrega
  Fase A pasa a aviso por atributo real ("cookie de sesión sin HttpOnly = potencial XSS").

Implementación: pedir `cookies` como `optional_permissions` (no required) y disparar
el prompt solo cuando el usuario activa "Análisis avanzado de cookies" en Settings.
Justificación tipo: "Solo para inspeccionar atributos de seguridad de cookies de la
pestaña activa. No sale del navegador."

### GDPR — Fase C (UX refinada)

- **Comparador "Scan before/after consent"** — dos botones: snapshot antes de aceptar
  banner, snapshot después. Diff: cookies nuevas, dominios nuevos. Esto es valor GDPR
  real ("¿el sitio carga cookies no necesarias antes del consentimiento?").
- **Export CSV** además de JSON.
- **Tabla rica con filtros y orden** por riesgo / dominio / propósito.

### Deep Analysis (ScriptSpy → análisis estático) — mejoras

Hoy `script-analyzer.js` ya cubre `eval`, `new Function()`, `setTimeout(string)`,
`setInterval(string)`, `document.write`, `innerHTML =`, `atob`, `unescape`, `wasm`,
`fromCharCode`, `crypto.subtle`, `RTCPeerConnection`, `clipboard`, `geolocation`,
`serviceWorker.register`, cryptominer signatures, `sendBeacon`. Y el motor runtime
(content scripts) ya monitoriza eventos en vivo. Pendientes que GPT identifica
como gap real:

1. **Sinks peligrosos en estático:** ya cubierto en su mayoría (eval/Function/innerHTML/
   document.write/setTimeout-string/setInterval-string). Validar que las regex pillan
   los casos edge (`window['eval']('...')`, `setTimeout.call(null, "...")`).
2. **Network behavior estático:** detectar `fetch(`, `new XMLHttpRequest`, `new WebSocket`,
   y sobre todo extraer los **endpoints** hardcoded en strings adyacentes a esas llamadas.
   Pasa de "este script hace fetch" a "este script llama a `https://tracker.example/log`".
3. **DOM manipulation sospechosa:** `document.createElement('iframe')`,
   `document.createElement('script')`, `appendChild` sobre `<head>` o `<body>`,
   modificación dinámica de `<form action>`. Patrón típico de loaders y malvertising.
4. **Data exfiltration hints:** `document.cookie`, `localStorage.getItem(`,
   `sessionStorage.getItem(`, combinado con un `fetch`/`sendBeacon` cercano. Marca
   "lee cookie + envía a externo" como crítico.
5. **Supply chain risk:**
   - **Histórico de hashes** — chrome.storage.local guarda hash anterior por URL.
     Cuando el script cambia: alerta "el código de este script cambió desde la última
     vista". Util para detectar compromise tras release.
   - **DB curada de hashes conocidos** — JSON con hashes de versiones de Google Tag
     Manager, GA, Stripe.js, jQuery por versión, etc. Match → "este es GTM 4.2 oficial,
     comportamiento conocido". Mismatch → analizar manualmente.
   - **Diff visual entre visitas** del mismo URL — si una librería normalmente estable
     cambia tras una visita, flag.

Esto no requiere permisos nuevos (solo lectura de strings + storage). La DB curada
puede crecer crowdsourced en un futuro repo aparte (o en `extension/data/known-hashes.json`).

*Actualización 2026-04-29: GDPR Fase A entregada en rama feat/free-v03.*

### GDPR Fase A.5 — TCF v2 consumer + cookie wall + vendor links (entregada)

Implementado sin nuevos permisos:
- Compliance probe llama `window.__tcfapi('getTCData', 2, cb)` con poll de 2.5s
  para CMPs que registran el API asíncronamente. Devuelve cmpId, propósitos
  aceptados, vendors aceptados, interés legítimo, tcString.
- Cookie wall detector: 4 patrones regex multi-señal en el texto del banner
  (precio/período en EUR/USD/GBP, "ad-free" multilenguaje, "pay or accept",
  "subscribe + currency"). Requiere ≥2 señales para clasificar como
  cookieWall, con 1 señal marca "posible". Heurístico, no garantía legal.
- Vendor list link extractor: anchors con texto "partners/vendors/socios/
  proveedores/colabor". Dedupe por href, limit 5.
- Tabla de 15 propósitos TCF estándar bilingüe en `extension/data/tcf-purposes.json`.

### Caso Marca.com (banner no reaparece tras reset)

Reportado: en `marca.com` el reset de consentimiento no hace reaparecer el
banner aunque sí elimina las cookies visibles. Causas probables:
- CMP backend con cookies HttpOnly que `document.cookie = "X=; expires=..."`
  no puede tocar (necesita `chrome.cookies.remove()` con permiso `cookies`).
- Consent guardado en IndexedDB (algunas CMPs custom lo usan).
- Cookies cross-domain con `Domain=.cmp-provider.com` distinto del dominio
  de la página.

Cubierto en GDPR Fase B (`chrome.cookies` opt-in). Mientras tanto, el reset
hace lo que puede y deja entries HttpOnly intactas — el usuario ve "✓ Reset
· 0 cookies, 2 ls, 0 ss" (solo storage limpiado) en estos casos.
