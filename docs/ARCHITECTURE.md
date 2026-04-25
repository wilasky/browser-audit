# ScriptSpy + Browser Health Check — Documento maestro para Claude Code

> **Cómo usar este documento:** está pensado para que lo cargues en Claude Code como contexto inicial del proyecto. Cada fase es autosuficiente. Empieza siempre por la fase actual indicada en `STATUS.md` (que crearás en la fase 0).

---

## 0. Resumen ejecutivo

**Qué construimos:** una extensión de Chrome (Manifest V3) con dos módulos integrados:

1. **Browser Health Check** — auditoría de configuración y privacidad del navegador del usuario contra una baseline mantenida. Es el módulo "de adopción": instala, ves un score, te quedas.
2. **ScriptSpy** — inspector activo de comportamiento JavaScript en cualquier web visitada. Es el módulo "de profundidad": para usuarios técnicos, justifica el plan Pro.

**Stack principal:** Vanilla JS + Manifest V3 (cliente), Node.js + Fastify + SQLite (backend opcional para Pro), ExtensionPay (monetización).

**Filosofía de diseño:**
- Privacidad por construcción: el cliente nunca envía URLs, solo hashes anónimos al backend
- Local-first: todo lo que se pueda calcular en cliente, se calcula en cliente
- Baseline como producto: la lista de chequeos de seguridad es lo que diferencia a la herramienta
- UX consciente del público: no patronizar al usuario, dar info técnica precisa

**Estado actual:** existe un POC funcional de ScriptSpy. Browser Health Check está sin construir. La fase 0 unifica los dos en una arquitectura limpia.

---

## 1. Visión y diferenciación

### Posicionamiento del producto

> "El primer chequeo de salud para tu navegador. Audita tu configuración, tus extensiones y lo que cada web está haciendo en tiempo real."

### Frente a la competencia

| Producto | Auditoría config | Inspector activo | Threat intel | Para quién |
|----------|------------------|------------------|--------------|------------|
| uBlock Origin | ✗ | parcial | ✓ | Bloquear |
| Privacy Badger | ✗ | parcial | ✗ | Bloquear |
| Wappalyzer | ✗ | identificación stack | ✗ | Devs |
| Privacy Cleaner | parcial | ✗ | ✗ | Limpieza |
| **Este producto** | ✓ | ✓ | ✓ | **Auditar y entender** |

### Doble público objetivo

**Usuario casual consciente de privacidad** → entra por "Browser Health Check". Quiere ver un score y mejorar su configuración. No le interesan los detalles técnicos.

**Usuario técnico (pentester, dev, auditor)** → entra por "ScriptSpy". Quiere ver qué hace cada script, qué APIs llama, qué exfiltra. Le da igual el score general.

El producto los sirve a los dos sin patronizar a ninguno.

---

## 2. Arquitectura general

### Diagrama de bloques

```
┌──────────────────────────────────────────────────────────────────┐
│                        CHROME EXTENSION (cliente)                │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐     │
│  │                       POPUP / UI                        │     │
│  │  ┌──────────────────┐   ┌─────────────────────────────┐ │     │
│  │  │ Browser Health   │   │      ScriptSpy              │ │     │
│  │  │ ─ Score 0-100    │   │  ─ Live event ticker        │ │     │
│  │  │ ─ Lista de checks│   │  ─ Scripts por riesgo       │ │     │
│  │  │ ─ Ext. instaladas│   │  ─ Fingerprint techniques   │ │     │
│  │  │ ─ Recomendaciones│   │  ─ Destinos de red          │ │     │
│  │  └──────────────────┘   └─────────────────────────────┘ │     │
│  └─────────────────────────────────────────────────────────┘     │
│           ▲                              ▲                       │
│           │                              │                       │
│  ┌────────┴───────────┐         ┌────────┴────────────────┐      │
│  │ background.js      │         │ content.js (MAIN world) │      │
│  │ (service worker)   │         │ + bridge.js (isolated)  │      │
│  │                    │         │                         │      │
│  │ ─ Audit engine     │         │ ─ Instrumenta APIs JS   │      │
│  │ ─ Plan management  │         │ ─ Atribuye por stack    │      │
│  │ ─ Threat intel     │◀────────│ ─ Reporta eventos       │      │
│  │   client (Pro)     │         │                         │      │
│  └────────┬───────────┘         └─────────────────────────┘      │
│           │                                                      │
│  ┌────────▼─────────────────────────────────────────────────┐    │
│  │ chrome.storage.local                                     │    │
│  │ ─ baseline_version, last_audit, plan_tier, settings      │    │
│  │ ─ ti_cache (24h TTL)                                     │    │
│  └──────────────────────────────────────────────────────────┘    │
└────────────────────────┬─────────────────────────────────────────┘
                         │  (sólo plan Pro, queries anonimizadas)
                         │  POST /lookup { hashes: [...] }
                         ▼
┌──────────────────────────────────────────────────────────────────┐
│                    BACKEND (Pro tier)                            │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐    │
│  │ API Fastify  │  │ SQLite WAL   │  │ Workers de sync      │    │
│  │ /lookup      │◀─│ ─ domains    │◀─│ ─ urlhaus.cron       │    │
│  │ /yara/rules  │  │ ─ scripts    │  │ ─ malwarebazaar.cron │    │
│  │ /audit/pdf   │  │ ─ extensions │  │ ─ phishtank.cron     │    │
│  │ /baseline    │  │ ─ yara_rules │  │ ─ disconnectme.cron  │    │
│  └──────────────┘  └──────────────┘  │ ─ ext_blacklist.cron │    │
│                                      └──────────────────────┘    │
└──────────────────────────────────────────────────────────────────┘
```

### Decisiones arquitectónicas no negociables

1. **El cliente nunca envía URLs ni datos del usuario al backend.** Solo hashes SHA256 de dominios y scripts. Esto hay que documentarlo en la política de privacidad y respetarlo siempre.
2. **La baseline se distribuye con la extensión y se actualiza vía endpoint público.** Sin login, cualquier usuario (incluso free) recibe la baseline más reciente.
3. **Las funciones premium se gatean en cliente con verificación periódica de licencia.** Si el backend cae, la extensión sigue funcionando con caché.
4. **Sin telemetría por defecto.** Solo opt-in para reportes anónimos de errores.
5. **Manifest V3 estricto.** Nada de hacks que puedan romper en próximas versiones de Chrome.

---

## 3. Estructura del proyecto

```
scriptspy-extension/
├── extension/                          # Código de la extensión
│   ├── manifest.json
│   ├── background/
│   │   ├── index.js                    # Service worker entry point
│   │   ├── audit-engine.js             # Motor del Browser Health Check
│   │   ├── event-aggregator.js         # Agrega eventos de ScriptSpy
│   │   ├── plan-manager.js             # ExtensionPay integration
│   │   ├── threat-intel-client.js      # Cliente del backend (Pro)
│   │   └── storage.js                  # Wrapper de chrome.storage
│   ├── content/
│   │   ├── instrumentation.js          # MAIN world: monkey-patches
│   │   ├── bridge.js                   # Isolated world: relay
│   │   └── api-hooks/                  # Hooks separados por tipo
│   │       ├── network.js              # fetch, XHR, beacon, WS
│   │       ├── storage.js              # cookies, localStorage
│   │       ├── input-tracking.js       # eventListeners, value getters
│   │       ├── fingerprinting.js       # canvas, audio, webgl, navigator
│   │       └── injection.js            # createElement script tracking
│   ├── popup/
│   │   ├── popup.html
│   │   ├── popup.css
│   │   ├── popup.js                    # Router entre views
│   │   ├── views/
│   │   │   ├── health-overview.js      # Score + checks
│   │   │   ├── health-detail.js        # Detalle de cada check
│   │   │   ├── extensions.js           # Lista de extensiones instaladas
│   │   │   ├── scriptspy-live.js       # Inspector en vivo
│   │   │   ├── scriptspy-fingerprint.js
│   │   │   ├── scriptspy-targets.js
│   │   │   └── settings.js
│   │   └── components/
│   │       ├── score-circle.js
│   │       ├── risk-pill.js
│   │       └── event-ticker.js
│   ├── shared/
│   │   ├── constants.js
│   │   ├── classifier.js               # Lógica de scoring común
│   │   ├── hash.js                     # SHA256 con WebCrypto
│   │   └── i18n/
│   │       ├── es.json
│   │       └── en.json
│   ├── data/
│   │   ├── baseline.v1.json            # Baseline embebida
│   │   ├── trackers-builtin.json       # Lista local de trackers conocidos
│   │   └── extensions-blacklist.json   # IDs de extensiones maliciosas conocidas
│   └── icons/
│       ├── icon16.png
│       ├── icon48.png
│       └── icon128.png
├── backend/                            # API de threat intel (solo Pro)
│   ├── src/
│   │   ├── server.js                   # Fastify entry
│   │   ├── routes/
│   │   │   ├── lookup.js               # POST /lookup
│   │   │   ├── baseline.js             # GET /baseline (público)
│   │   │   ├── yara.js                 # GET /yara/rules
│   │   │   └── audit.js                # POST /audit/pdf (Pro)
│   │   ├── workers/
│   │   │   ├── sync-urlhaus.js
│   │   │   ├── sync-malwarebazaar.js
│   │   │   ├── sync-phishtank.js
│   │   │   ├── sync-disconnectme.js
│   │   │   └── sync-extensions-blacklist.js
│   │   ├── db/
│   │   │   ├── schema.sql
│   │   │   └── migrations/
│   │   └── lib/
│   │       ├── auth.js                 # Validación de licencias
│   │       └── rate-limit.js
│   ├── docker-compose.yml
│   └── package.json
├── landing/                            # Landing page estática
│   ├── index.html
│   └── assets/
├── docs/
│   ├── ARCHITECTURE.md                 # Este documento
│   ├── BASELINE_SPEC.md                # Especificación de la baseline
│   ├── PRIVACY_POLICY.md
│   ├── TERMS.md
│   └── CONTRIBUTING.md
├── tests/
│   ├── unit/
│   │   ├── classifier.test.js
│   │   ├── audit-engine.test.js
│   │   └── hash.test.js
│   ├── e2e/
│   │   └── extension-load.test.js      # Con Puppeteer
│   └── fixtures/
├── scripts/
│   ├── build.js                        # Bundling con esbuild
│   ├── dev.js                          # Watch mode
│   └── package.js                      # ZIP para Chrome Web Store
├── .github/workflows/
│   ├── ci.yml
│   └── release.yml
├── STATUS.md                           # Estado actual del proyecto
├── README.md
├── package.json
└── .gitignore
```

---

## 4. Especificación detallada del módulo Browser Health Check

### 4.1 La baseline

La baseline es un archivo JSON que define qué chequeos hacer y cuál es la configuración recomendada. Está versionada y se distribuye embebida en la extensión, pero también puede actualizarse al vuelo desde el endpoint público `/baseline`.

#### Formato de la baseline

```json
{
  "version": "1.0.0",
  "publishedAt": "2026-04-25T00:00:00Z",
  "categories": [
    {
      "id": "updates",
      "label": "Actualizaciones",
      "description": "Mantener Chrome actualizado evita CVEs conocidas"
    },
    {
      "id": "privacy",
      "label": "Privacidad",
      "description": "Configuraciones que reducen el tracking"
    },
    {
      "id": "security",
      "label": "Seguridad",
      "description": "Protecciones contra phishing y malware"
    },
    {
      "id": "extensions",
      "label": "Extensiones",
      "description": "Auditoría de extensiones instaladas"
    },
    {
      "id": "fingerprint",
      "label": "Huella digital",
      "description": "Cuán único es tu navegador para tracking pasivo"
    }
  ],
  "checks": [
    {
      "id": "chrome-version",
      "category": "updates",
      "title": "Chrome actualizado",
      "severity": "high",
      "weight": 8,
      "method": {
        "type": "userAgent",
        "compareWith": "latest_minus_1"
      },
      "rationale": "Las versiones antiguas tienen vulnerabilidades públicamente conocidas que pueden ser explotadas por sitios maliciosos.",
      "fix": {
        "type": "navigate",
        "url": "chrome://settings/help",
        "instructions": "Ve a Configuración > Acerca de Chrome y permite actualizar."
      }
    },
    {
      "id": "third-party-cookies",
      "category": "privacy",
      "title": "Bloqueo de cookies de terceros",
      "severity": "high",
      "weight": 10,
      "method": {
        "type": "chromePrivacy",
        "api": "chrome.privacy.websites.thirdPartyCookiesAllowed",
        "expected": false
      },
      "rationale": "Las cookies de terceros permiten a redes publicitarias rastrearte entre sitios distintos.",
      "fix": {
        "type": "navigate",
        "url": "chrome://settings/cookies"
      }
    },
    {
      "id": "safe-browsing-enhanced",
      "category": "security",
      "title": "Safe Browsing en modo Mejorado",
      "severity": "medium",
      "weight": 7,
      "method": {
        "type": "chromePrivacy",
        "api": "chrome.privacy.services.safeBrowsingEnhancedEnabled",
        "expected": true
      }
    },
    {
      "id": "doh-enabled",
      "category": "privacy",
      "title": "DNS sobre HTTPS habilitado",
      "severity": "medium",
      "weight": 5,
      "method": {
        "type": "chromePrivacy",
        "api": "chrome.privacy.network.dnsOverHttps"
      }
    },
    {
      "id": "do-not-track",
      "category": "privacy",
      "title": "Señal Do Not Track activa",
      "severity": "low",
      "weight": 2,
      "method": {
        "type": "chromePrivacy",
        "api": "chrome.privacy.websites.doNotTrackEnabled",
        "expected": true
      },
      "rationale": "Aunque DNT no es vinculante, algunos sitios lo respetan."
    },
    {
      "id": "extensions-blacklist",
      "category": "extensions",
      "title": "Extensiones maliciosas conocidas",
      "severity": "critical",
      "weight": 15,
      "method": {
        "type": "extensionsCheck",
        "againstList": "extensions-blacklist.json"
      }
    },
    {
      "id": "extensions-permissions",
      "category": "extensions",
      "title": "Extensiones con permisos excesivos",
      "severity": "medium",
      "weight": 6,
      "method": {
        "type": "extensionsPermissionsAudit",
        "flagPermissions": ["tabs", "history", "<all_urls>", "cookies", "webRequest"],
        "tolerance": 2
      }
    },
    {
      "id": "fingerprint-entropy",
      "category": "fingerprint",
      "title": "Entropía del fingerprint del navegador",
      "severity": "medium",
      "weight": 5,
      "method": {
        "type": "fingerprintCalculation"
      },
      "rationale": "Cuanto más único sea tu navegador, más fácil eres de rastrear sin cookies."
    }
  ]
}
```

#### Severidad → impacto en score

```
critical: -15 puntos por fallo
high:     -10 puntos por fallo
medium:    -6 puntos por fallo
low:       -2 puntos por fallo
```

El score arranca en 100. Las categorías se pueden ponderar adicionalmente.

#### Mantenimiento de la baseline

La baseline es **el activo más importante** del producto. Cada vez que sale una versión nueva de Chrome o se descubre una nueva amenaza, hay que actualizarla. Plan de mantenimiento:

- Versión semver: cambio en checks = minor; cambio en estructura = major
- Endpoint público `/baseline/latest.json` y `/baseline/v1.json` para versiones específicas
- La extensión sincroniza una vez al día y guarda en `chrome.storage.local`
- Cuando hay nueva versión disponible, notifica al usuario

### 4.2 Auditoría de extensiones instaladas

Esta es una de las funciones más valiosas y diferenciadas. Usa `chrome.management.getAll()` para listar todas las extensiones instaladas y para cada una:

1. Verifica si su ID está en `extensions-blacklist.json` (lista de extensiones removidas o reportadas como maliciosas)
2. Analiza sus permisos contra una lista de permisos sensibles
3. Verifica si está actualizada
4. Verifica si proviene de Chrome Web Store oficial
5. Pro: cruza el ID contra el backend para info enriquecida

#### Estructura de extensions-blacklist.json

```json
{
  "version": "2026-04-25",
  "source": ["crxcavator", "spinai", "cws-removed"],
  "entries": [
    {
      "id": "abcdefghijklmnopqrstuvwxyz123456",
      "name": "Adblock Plus Premium (fake)",
      "reason": "Removed by Google for malicious behavior",
      "removedAt": "2024-08-12",
      "severity": "critical"
    }
  ]
}
```

#### Permisos considerados sensibles

```javascript
const SENSITIVE_PERMISSIONS = {
  "<all_urls>":   { weight: 5, label: "Acceso a todas las webs" },
  "tabs":         { weight: 3, label: "Lee información de pestañas" },
  "history":      { weight: 4, label: "Acceso al historial" },
  "cookies":      { weight: 4, label: "Lee cookies" },
  "webRequest":   { weight: 5, label: "Intercepta peticiones de red" },
  "webRequestBlocking": { weight: 5, label: "Bloquea peticiones" },
  "downloads":    { weight: 3, label: "Gestiona descargas" },
  "management":   { weight: 4, label: "Gestiona otras extensiones" },
  "debugger":     { weight: 5, label: "Acceso a la API de debug" },
  "proxy":        { weight: 4, label: "Configura el proxy" },
  "privacy":      { weight: 3, label: "Modifica configuración de privacidad" }
};
```

### 4.3 Cálculo de fingerprint entropy

Implementación basada en la metodología de [Panopticlick / Cover Your Tracks](https://coveryourtracks.eff.org/):

```javascript
function calculateFingerprintEntropy() {
  const signals = {
    userAgent: navigator.userAgent,
    language: navigator.language + (navigator.languages || []).join(','),
    platform: navigator.platform,
    screenResolution: `${screen.width}x${screen.height}`,
    colorDepth: screen.colorDepth,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    timezoneOffset: new Date().getTimezoneOffset(),
    cpuCores: navigator.hardwareConcurrency,
    deviceMemory: navigator.deviceMemory,
    plugins: Array.from(navigator.plugins).map(p => p.name).join(','),
    canvas: getCanvasFingerprint(),
    webgl: getWebGLFingerprint(),
    audio: getAudioFingerprint(),
    fonts: detectFonts(),
  };

  return calculateShannonEntropy(signals);
}
```

Cada señal aporta entropía. La suma total se compara contra una distribución de referencia. Resultado típico:

- Entropía total < 15 bits → tu navegador es común, difícil de rastrear individualmente
- Entropía 15-22 bits → moderadamente único
- Entropía > 22 bits → altamente único, rastreable sin cookies

---

## 5. Especificación detallada del módulo ScriptSpy

### 5.1 Capas de instrumentación

#### Capa 1: Network (network.js)
- `window.fetch` — todos los fetches con método, URL, body preview
- `XMLHttpRequest.open/send` — XHR clásico
- `navigator.sendBeacon` — beacons silenciosos (alta sospecha)
- `WebSocket` — conexiones WebSocket

#### Capa 2: Storage (storage.js)
- `document.cookie` getter/setter
- `localStorage.setItem/getItem`
- `sessionStorage.setItem/getItem`
- `IndexedDB.open` (opcional, costoso)

#### Capa 3: Input tracking (input-tracking.js)
- `EventTarget.prototype.addEventListener` con eventos de input
- `HTMLInputElement.prototype.value` getter
- `HTMLFormElement.prototype.elements` getter
- `FormData` constructor

#### Capa 4: Fingerprinting (fingerprinting.js)
- Canvas: `toDataURL`, `getImageData`
- AudioContext: constructor + nodos
- WebGL: `getParameter`, `getExtension`
- Navigator props: userAgent, plugins, languages, hardwareConcurrency, deviceMemory, etc.
- Screen props: width, height, colorDepth, etc.
- Fonts: `document.fonts.check`
- Battery API: `navigator.getBattery`

#### Capa 5: Injection (injection.js)
- `document.createElement('script')` con interceptor de `src`
- `MutationObserver` sobre `<head>` y `<body>` para scripts añadidos directamente

### 5.2 Modelo de datos del evento

```typescript
interface ScriptSpyEvent {
  type: 'fetch' | 'xhr' | 'beacon' | 'websocket' |
        'cookie-read' | 'cookie-write' |
        'storage-read' | 'storage-write' |
        'listen' | 'mouse-listen' | 'read-input' |
        'fp-canvas' | 'fp-audio' | 'fp-webgl' | 'fp-navigator' |
        'fp-screen' | 'fp-fonts' | 'fp-battery' |
        'script-inject' | 'page-start';

  data: any;          // payload específico del tipo
  timestamp: number;
  script: string;     // URL del script que disparó la llamada
  line: number;       // línea del stack trace (si disponible)
}
```

### 5.3 Atribución de eventos a scripts

Esta es la parte más delicada técnicamente. Cuando un evento se dispara, hay que saber qué script lo causó. La técnica:

```javascript
function getCallerScript() {
  const err = new Error();
  const stack = err.stack || '';
  const lines = stack.split('\n');

  for (let i = 2; i < lines.length; i++) {
    const match = lines[i].match(/(https?:\/\/[^\s)]+):(\d+):(\d+)/);
    if (match) {
      const url = match[1];
      if (!url.includes('__scriptspy_internal')) {
        return { url, line: parseInt(match[2]), column: parseInt(match[3]) };
      }
    }
  }
  return { url: 'inline', line: 0, column: 0 };
}
```

**Edge cases a manejar:**
- Source maps: el stack apunta al bundle, no al source. Para v2.0.
- `eval()` y `new Function()`: el stack apunta a `<anonymous>`. Marcar como sospechoso.
- Workers: contexto separado, requieren instrumentación específica.
- Inline scripts en HTML: marcar como `inline:<dominio-del-html>`.

### 5.4 Risk scoring por script

```javascript
function computeScriptRisk(script) {
  let score = 0;

  // Fingerprinting (peso alto)
  const fpCount = sumCategoryEvents(script, 'fingerprinting');
  score += Math.min(fpCount * 4, 35);

  // Lectura de inputs desde third-party (muy sospechoso)
  if (script.isThirdParty) {
    score += Math.min(script.eventCounts['read-input'] * 5, 25);
    score += Math.min(script.eventCounts['listen'] * 2, 15);
  }

  // Exfiltración silenciosa
  score += Math.min(script.eventCounts['beacon'] * 5, 20);

  // Mouse tracking
  if (script.eventCounts['mouse-listen'] > 0) score += 8;

  // Multi-target (envía datos a múltiples destinos)
  if (script.targetsContacted.size > 2) score += 5;

  // Penalty por ser third-party
  if (script.isThirdParty) score += 5;

  // Pro: penalty por threat intel match
  if (script.threatIntelMatch) score += 30;

  return Math.min(100, score);
}
```

---

## 6. Modelo de monetización (resumen)

### Plan FREE
- Browser Health Check completo con baseline pública
- ScriptSpy básico: detección local, lista de trackers builtin
- 5 análisis profundos al día
- Sin export, histórico de 7 días

### Plan PRO — €15/mes o €120/año
- Todo lo anterior, sin límites
- Threat intel en tiempo real (URLhaus, MalwareBazaar, PhishTank, etc.)
- Hash check de scripts (SHA256)
- Reglas YARA en navegador
- Auditoría de extensiones contra blacklist enriquecida (CRXcavator)
- Export PDF/JSON
- Histórico 90 días
- API para integraciones

### Implementación técnica
- ExtensionPay para gestión de pagos
- Gating en cliente con verificación periódica de licencia
- Modo offline: la extensión funciona aunque caiga el backend
- Rate limiting por API key en el backend

---

## 7. Roadmap por fases

> **Convención:** cada fase tiene un objetivo claro, deliverables medibles y un criterio de "done". No avanzar de fase sin completar la anterior. Actualizar `STATUS.md` al final de cada fase.

### FASE 0 — Fundamentos del proyecto (3-5 días)

**Objetivo:** dejar la base del proyecto lista para empezar a construir.

- [ ] Inicializar repo git con la estructura de carpetas de la sección 3
- [ ] Crear `STATUS.md` con la fase actual y deliverables completados
- [ ] Setup de `package.json` con scripts: `dev`, `build`, `test`, `lint`, `package`
- [ ] Configurar esbuild para bundling de la extensión
- [ ] Configurar ESLint con reglas estrictas para extensiones MV3
- [ ] Configurar Prettier
- [ ] Configurar Jest o Vitest para tests unitarios
- [ ] Crear `manifest.json` mínimo con permisos justos: `storage`, `activeTab`, `scripting`, `webRequest`, `management`, `privacy`
- [ ] Migrar el código del POC actual de ScriptSpy a `extension/content/` reorganizado por capas
- [ ] Verificar que la extensión carga sin errores en `chrome://extensions/`
- [ ] Setup de CI básico en GitHub Actions (lint + tests)

**Criterio de done:** la extensión se carga, no hace nada visible aún, pero el código está organizado y los tests pasan.

**Prompt sugerido para Claude Code:**

```
Voy a empezar la FASE 0 del proyecto. Ya tienes el documento maestro.
Mi POC actual está en /path/to/scriptspy-poc/.

Por favor:
1. Lee el documento maestro completo
2. Lee el código actual del POC
3. Crea la estructura de carpetas según la sección 3
4. Migra el código del POC a la nueva estructura sin cambiar funcionalidad
5. Configura las herramientas de build, lint y tests
6. Crea STATUS.md con el estado actual

No añadas features nuevas todavía. Solo refactor y setup.
```

### FASE 1 — Browser Health Check (1-2 semanas)

**Objetivo:** módulo de auditoría de configuración funcionando completamente con baseline embebida.

- [ ] Crear `extension/data/baseline.v1.json` con al menos 15 chequeos
- [ ] Implementar `audit-engine.js`: motor que ejecuta los chequeos
- [ ] Implementar handlers para cada `method.type`:
  - `userAgent` (chequeo de versión)
  - `chromePrivacy` (chequeo de configuración via API)
  - `extensionsCheck` (contra blacklist)
  - `extensionsPermissionsAudit` (análisis de permisos)
  - `fingerprintCalculation` (cálculo de entropía)
- [ ] UI: vista "Health Overview" con score circular y lista de checks
- [ ] UI: vista "Health Detail" para cada check con rationale y fix
- [ ] UI: vista "Extensions" con cada extensión instalada y su análisis
- [ ] Click en "Fix" abre la URL de configuración correspondiente
- [ ] Persistir último audit en `chrome.storage.local`
- [ ] Re-ejecutar auditoría automáticamente cada 24h
- [ ] Tests unitarios para `audit-engine` y los handlers

**Criterio de done:** abres el popup, ves un score real basado en tu configuración de Chrome, puedes navegar a los detalles, y los enlaces de fix funcionan.

### FASE 2 — ScriptSpy reactivado y unificado (1 semana)

**Objetivo:** el módulo de inspección activa funciona dentro de la nueva arquitectura.

- [ ] Verificar que las 5 capas de instrumentación funcionan
- [ ] Implementar `event-aggregator.js` que recibe eventos y agrupa por script
- [ ] Implementar `classifier.js` para categorizar eventos
- [ ] Implementar `computeScriptRisk` con la fórmula de la sección 5.4
- [ ] UI: vista "ScriptSpy Live" con lista de scripts ordenada por riesgo
- [ ] UI: vista "Fingerprint" con técnicas detectadas
- [ ] UI: vista "Targets" con destinos contactados
- [ ] Live event ticker en el popup
- [ ] Reset por navegación
- [ ] Tests unitarios del classifier

**Criterio de done:** abres el popup en cualquier web con scripts, ves los scripts listados, los detalles de cada uno, y todo se actualiza en vivo.

### FASE 3 — Sistema de planes y onboarding (1 semana)

**Objetivo:** distinguir free vs pro y tener un buen primer impacto.

- [ ] Integrar ExtensionPay (modo sandbox)
- [ ] Implementar `plan-manager.js` con `isProUser()` cacheado
- [ ] Lógica de gating: features Pro deshabilitadas en plan free
- [ ] Pantalla de bienvenida la primera vez que se instala
- [ ] Tour rápido de las dos vistas (Health Check y ScriptSpy)
- [ ] UI de "Upgrade to Pro" con bullets claros
- [ ] Pantalla de gestión de licencia
- [ ] Persistir tier del usuario en `chrome.storage.local`
- [ ] Verificar licencia al arrancar (con timeout y fallback offline)

**Criterio de done:** se puede simular un upgrade en ExtensionPay sandbox y las features Pro se desbloquean.

### FASE 4 — Backend de threat intel (2 semanas)

**Objetivo:** API privada con feeds sincronizados que enriquece el plan Pro.

- [ ] Setup del proyecto backend (`backend/`)
- [ ] Schema SQLite + migraciones
- [ ] Endpoint público `GET /baseline/latest` (sin auth, rate limited por IP)
- [ ] Endpoint Pro `POST /lookup` con auth via API key
- [ ] Worker de sync para URLhaus (cada hora)
- [ ] Worker de sync para MalwareBazaar (cada hora)
- [ ] Worker de sync para DisconnectMe (diario)
- [ ] Worker de sync para PhishTank (cada 6 horas)
- [ ] Rate limiting con redis o in-memory
- [ ] Logs estructurados
- [ ] Health check endpoint
- [ ] Dockerfile y docker-compose para deploy
- [ ] Deploy en Hetzner CX21 o Railway
- [ ] Monitoring básico (uptime check con UptimeRobot gratis)

**Criterio de done:** el backend está deployado, los workers sincronizan sin errores, y los endpoints responden correctamente.

### FASE 5 — Integración cliente con threat intel (1 semana)

**Objetivo:** la extensión Pro consulta el backend y enriquece la UI.

- [ ] Implementar `threat-intel-client.js` con caché local 24h
- [ ] Integración en `audit-engine`: chequeo de extensiones contra blacklist enriquecida
- [ ] Integración en `event-aggregator`: chequeo de scripts/dominios contra threat intel
- [ ] UI: badges "MALICIOSO CONFIRMADO" en scripts/dominios marcados
- [ ] UI: filtro "Solo malicioso" en ScriptSpy
- [ ] Manejo graceful de errores de red
- [ ] Tests de integración con el backend mockeado

**Criterio de done:** instalando una extensión maliciosa de prueba, sale alerta roja. Visitando una web con un script en URLhaus, sale alerta roja.

### FASE 6 — Reglas YARA en cliente (2 semanas)

**Objetivo:** detectar patrones conocidos en código JS de scripts visitados.

- [ ] Investigar yara-x WASM vs alternativas
- [ ] Integrar yara-x WASM en el background service worker
- [ ] Sincronizar reglas YARA desde el backend
- [ ] Aplicar reglas al código JS interceptado
- [ ] UI: mostrar qué regla matcheó y descripción
- [ ] Optimización: lazy evaluation, web worker dedicado

**Criterio de done:** una página con un cryptominer conocido (CoinHive y similares) dispara la regla YARA correspondiente.

### FASE 7 — Export, histórico y API (1 semana)

**Objetivo:** features Pro de valor profesional.

- [ ] Export PDF de auditorías (jsPDF en cliente)
- [ ] Export JSON estructurado
- [ ] Histórico de auditorías (90 días) en IndexedDB
- [ ] UI: vista de histórico con gráfico de evolución
- [ ] API key management para usuarios Pro
- [ ] Endpoint `GET /audit/:id` para recuperar auditorías

### FASE 8 — Lanzamiento (1 semana)

**Objetivo:** producto en Chrome Web Store y empezar a captar usuarios.

- [ ] Cuenta de Chrome Web Store Developer ($5 una vez)
- [ ] Privacy Policy publicada
- [ ] Términos de servicio
- [ ] Screenshots de calidad (1280x800)
- [ ] Vídeo demo (Loom, 90 segundos)
- [ ] Landing page (Cloudflare Pages, gratis)
- [ ] Listing en Chrome Web Store
- [ ] Plan de lanzamiento: post en r/netsec, r/privacy, Hacker News, Mastodon infosec
- [ ] Monitoring de errores in-app (opcional, opt-in)

**Criterio de done:** la extensión está publicada y aprobada, el primer usuario que no eres tú la ha instalado.

### FASE 9+ — Iteración continua

- Análisis de feedback de los primeros usuarios
- Ajuste de la baseline según problemas reales
- Reducción de falsos positivos
- Más feeds de threat intel según demanda
- Posibles features: detección de skimmers de pago (Magecart), análisis de cookies banner cumplimiento, modo "auditor de cliente" para consultores

---

## 8. Especificación de la baseline (más detallada)

### 8.1 Lista mínima de chequeos para v1.0

| ID | Categoría | Severidad | Peso | Descripción corta |
|---|---|---|---|---|
| chrome-version | updates | high | 8 | Chrome al día |
| chrome-mv2-deprecated | updates | medium | 4 | Sin extensiones MV2 obsoletas |
| third-party-cookies | privacy | high | 10 | Cookies de terceros bloqueadas |
| do-not-track | privacy | low | 2 | DNT enviado |
| safe-browsing-enhanced | security | medium | 7 | Safe Browsing modo Mejorado |
| doh-enabled | privacy | medium | 5 | DNS sobre HTTPS activo |
| https-only-mode | security | medium | 6 | Modo HTTPS-only activo |
| popups-blocked | security | low | 3 | Popups bloqueados por defecto |
| autofill-passwords | security | medium | 5 | Autofill de passwords con cuidado |
| sync-encryption-passphrase | security | low | 3 | Sync con passphrase si activado |
| extensions-blacklist | extensions | critical | 15 | Sin extensiones maliciosas |
| extensions-permissions | extensions | medium | 6 | Sin extensiones con permisos excesivos |
| extensions-from-cws | extensions | medium | 5 | Solo extensiones de CWS oficial |
| extensions-recently-updated | extensions | low | 2 | Extensiones actualizadas recientemente |
| fingerprint-entropy | fingerprint | medium | 5 | Entropía baja del fingerprint |
| webrtc-leak | privacy | medium | 5 | Sin fugas de IP por WebRTC |

Esta lista se irá expandiendo iterativamente.

### 8.2 Baseline updates

La baseline puede cambiar por dos razones:
1. Nueva versión de Chrome introduce settings nuevos
2. Nueva amenaza descubierta requiere chequeo adicional

Política de actualización:
- Cambios menores (añadir checks): la extensión los aplica automáticamente
- Cambios mayores (eliminar checks o cambiar metodología): requieren consentimiento del usuario

---

## 9. Privacidad y aspectos legales

### 9.1 Datos que recolecta la extensión

**De forma local (nunca enviado a ningún servidor):**
- Estado del navegador en el momento del audit
- Lista de extensiones instaladas
- Eventos de scripts en webs visitadas
- Configuración de la extensión
- Histórico de auditorías

**Enviado al backend (solo Pro, con licencia activa):**
- SHA256 de dominios para lookup (no la URL completa)
- SHA256 de scripts para lookup (no el código)
- ID de licencia para autenticación

**Lo que NUNCA se envía:**
- URLs completas de páginas visitadas
- Contenido de formularios
- Cookies del usuario
- Datos personales de ningún tipo

### 9.2 Política de privacidad obligatoria

Para Chrome Web Store es requisito. Plantilla básica:

```markdown
## Política de privacidad de [Nombre de extensión]

Esta extensión respeta tu privacidad. No recolectamos datos personales.

### Datos procesados localmente
- Configuración de tu navegador (para hacer la auditoría)
- Lista de extensiones instaladas (para detectar las maliciosas)
- Comportamiento de scripts en páginas visitadas (para mostrarlos en la UI)

Estos datos se procesan exclusivamente en tu navegador y no se envían a ningún servidor.

### Datos enviados a nuestros servidores (solo plan Pro)
Si activas el plan Pro, se envían al servidor:
- Hashes SHA256 de dominios para verificar contra bases de datos de amenazas
- Hashes SHA256 de scripts para identificar malware conocido
- Tu ID de licencia para autenticarte

Nunca enviamos URLs completas, contenido de páginas, ni datos personales.

### Cookies y tracking
La extensión no usa cookies ni tecnologías de tracking.

### Contacto
[email]
```

### 9.3 Disclaimer técnico

Importante incluir en la documentación: "Esta extensión es una herramienta de información y auditoría. No reemplaza una solución de seguridad profesional. Las detecciones se basan en bases de datos públicas y heurísticas; pueden producirse falsos positivos y falsos negativos."

---

## 10. Métricas de éxito por fase

| Fase | Métrica clave | Objetivo |
|---|---|---|
| 0 | Code coverage de tests | >40% |
| 1 | Tiempo de auditoría completa | <2s |
| 2 | Eventos perdidos en SPAs | <5% |
| 3 | Conversión free → pro en testers | >0 (validación) |
| 4 | Uptime del backend | >99.5% |
| 5 | False positives de threat intel | <2% |
| 6 | Reglas YARA aplicadas | >50 |
| 7 | Tiempo de export PDF | <5s |
| 8 | Instalaciones primer mes | >100 |
| 9+ | MRR mes 6 | €100-500 |

---

## 11. Decisiones pendientes (para discutir cuando lleguemos)

1. **Open source vs closed source.** Opción intermedia: cliente OSS bajo MIT, backend y reglas YARA premium privadas.
2. **Localización.** Empezar en español + inglés, expandir según demanda.
3. **Branding.** Nombre del producto unificado (ScriptSpy + Browser Health Check necesitan un nombre paraguas). Sugerencias para considerar más adelante: "Lookout", "Sentinel", "Truelens", "Auditiq".
4. **Modelo agency.** Plan empresa con marca blanca para consultores RGPD. Lo dejamos para v2.
5. **Móvil.** Chrome móvil no soporta extensiones. Posible PWA para auditar móvil. Lejos en el roadmap.

---

## 12. Stack técnico definitivo

### Cliente (extensión)
- **Lenguaje:** JavaScript vanilla (no TypeScript en MVP, evaluar para v2)
- **Bundler:** esbuild
- **Linter:** ESLint con eslint-plugin-chrome-extension
- **Tests:** Vitest (unitarios) + Puppeteer (e2e)
- **Manifest:** V3 estricto
- **APIs Chrome:** management, privacy, storage, activeTab, scripting, webRequest

### Backend
- **Runtime:** Node.js 20 LTS
- **Framework:** Fastify
- **DB:** SQLite con WAL mode
- **Cron:** node-cron
- **Auth:** API keys con HMAC validation
- **Hosting:** Hetzner CX21 (€5/mes) o Railway

### Infra
- **Dominio:** Namecheap, ~€10/año
- **CDN:** Cloudflare
- **Pagos:** ExtensionPay (5% comisión)
- **Errores:** Sentry self-hosted (opcional)
- **Uptime:** UptimeRobot (gratis)

### Desarrollo
- **Git:** GitHub privado al inicio
- **CI:** GitHub Actions
- **IDE:** VS Code o JetBrains, lo que prefieras

---

## 13. Cómo trabajar con Claude Code en este proyecto

### Sesión típica
1. Abre Claude Code en la carpeta del proyecto
2. Lee `STATUS.md` para saber dónde estamos
3. Selecciona la siguiente tarea de la fase actual
4. Pide a Claude que implemente esa tarea específica
5. Revisa el código generado, prueba en local
6. Commit cuando funcione
7. Actualiza `STATUS.md`

### Buenas prácticas
- **Una tarea por sesión.** No mezcles múltiples cambios.
- **Tests primero (cuando sea posible).** Pide a Claude que escriba el test antes que la implementación.
- **Commits pequeños.** Facilita revertir si algo se rompe.
- **STATUS.md actualizado.** Es la memoria persistente del proyecto.

### Prompts útiles

Para arrancar una sesión:
```
Lee STATUS.md y dime en qué fase estamos y qué tarea hacer ahora.
Antes de empezar a implementar, propón el plan paso a paso.
```

Para implementar una tarea específica:
```
Vamos a implementar [tarea]. Recuerda las decisiones arquitectónicas
del documento maestro: privacidad por construcción, local-first,
manifest V3 estricto. Empieza por los tests si aplica.
```

Para revisar antes de commit:
```
Revisa los cambios actuales. ¿Cumplen con el lint? ¿Pasan los tests?
¿Hay alguna oportunidad de simplificación? ¿Falta documentación
inline en funciones críticas?
```

### Modelo recomendado
- **Sonnet 4.6**: para la mayor parte del trabajo (más rápido, suficiente)
- **Opus 4.7**: para arquitectura inicial, debugging difícil, decisiones de diseño complejas

---

## 14. Anexo: recursos útiles

### Documentación oficial
- Chrome Extensions MV3: https://developer.chrome.com/docs/extensions/mv3/
- chrome.management: https://developer.chrome.com/docs/extensions/reference/management/
- chrome.privacy: https://developer.chrome.com/docs/extensions/reference/privacy/

### Threat intel sources
- abuse.ch (URLhaus, MalwareBazaar, Feodo): https://abuse.ch/
- PhishTank: https://www.phishtank.com/
- DisconnectMe: https://disconnect.me/trackerprotection
- EasyList/EasyPrivacy: https://easylist.to/

### Inspiración
- Cover Your Tracks (EFF): https://coveryourtracks.eff.org/
- CRXcavator: https://crxcavator.io/
- BrowserAudit (proyecto académico inactivo pero ideas útiles)

### Tools
- ExtensionPay: https://extensionpay.com/
- esbuild: https://esbuild.github.io/
- yara-x: https://github.com/VirusTotal/yara-x

---

## 15. Primer prompt para Claude Code

Cuando abras Claude Code en la carpeta del proyecto vacío, empieza con esto:

```
Soy Aitor. Trabajo en seguridad/sysadmin profesionalmente y voy a
construir una extensión de Chrome con dos módulos: Browser Health Check
y ScriptSpy.

Tengo un POC funcional de ScriptSpy en /path/to/scriptspy-poc/.
También tengo el documento maestro del proyecto en docs/ARCHITECTURE.md.

Lee primero el documento maestro completo. Luego dime:
1. ¿Has entendido la visión y la arquitectura?
2. ¿Hay decisiones que ves problemáticas o áreas grises?
3. ¿Cuál sería tu plan de ataque para la FASE 0?

No empieces a programar todavía. Primero alineémonos.
```

---

*Documento maestro v1.0 — generado el 25 de abril de 2026.*
*Mantén este archivo actualizado en `docs/ARCHITECTURE.md` y revísalo al inicio de cada fase.*
