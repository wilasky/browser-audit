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
