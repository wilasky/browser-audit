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

1. **Importar config en Health** — el JSON importado no persiste como audit en storage,
   solo se renderiza una vez. Tras refresh se pierde. Solución: guardar el audit
   importado en chrome.storage.local con clave separada.
2. **Cookie banner detection mejorada** — cuando el usuario acepta cookies, la extensión
   sigue marcando "cookies cargadas sin banner detectado" porque el banner desaparece.
   Mejora: detectar si hubo banner aceptado mediante storage/cookies de consentimiento típicas
   (cookieConsent, OptanonAlertBoxClosed, etc.) o detectar marca de tiempo del consent.

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
