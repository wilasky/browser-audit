# Especificación de la Baseline — Browser Health Check

> Este documento describe en detalle cómo está estructurada la baseline de chequeos de seguridad y privacidad del navegador. La baseline es el activo principal del producto: un mal chequeo genera falsos positivos y mata la confianza del usuario.

---

## 1. Filosofía de la baseline

Una baseline buena cumple cuatro principios:

1. **Verificable**: cada chequeo se puede comprobar de forma determinista, no es subjetivo
2. **Accionable**: si el chequeo falla, el usuario sabe exactamente qué hacer para arreglarlo
3. **Justificado**: cada chequeo tiene una razón clara y específica de por qué importa
4. **Mantenible**: se puede actualizar fácilmente cuando Chrome cambia o aparecen nuevas amenazas

Si un chequeo no cumple los cuatro principios, no entra en la baseline.

---

## 2. Schema completo de un check

```typescript
interface BaselineCheck {
  id: string;                      // único, kebab-case, estable entre versiones
  category: CategoryId;            // referencia a una categoría definida
  title: string;                   // título corto para la UI
  severity: 'critical' | 'high' | 'medium' | 'low';
  weight: number;                  // 1-15, impacto en el score total
  method: CheckMethod;             // cómo ejecutar el chequeo
  rationale: string;               // por qué importa (1-2 frases)
  fix?: FixAction;                 // qué hacer si falla
  proOnly?: boolean;               // si es exclusivo del plan Pro
  introducedIn: string;            // versión de baseline donde se añadió
  affectedChromeVersions?: string; // rango de versiones donde aplica
}

interface CheckMethod {
  type: 'userAgent' | 'chromePrivacy' | 'extensionsCheck'
        | 'extensionsPermissionsAudit' | 'fingerprintCalculation'
        | 'webrtcLeakTest' | 'storageInspection' | 'custom';
  // campos específicos según type
  [key: string]: any;
}

interface FixAction {
  type: 'navigate' | 'externalLink' | 'showInstructions';
  url?: string;
  instructions?: string;
}
```

---

## 3. Categorías

```json
{
  "categories": [
    {
      "id": "updates",
      "label": "Actualizaciones",
      "icon": "↑",
      "description": "Mantener Chrome y sus componentes actualizados es la primera línea de defensa contra vulnerabilidades conocidas."
    },
    {
      "id": "privacy",
      "label": "Privacidad",
      "icon": "◑",
      "description": "Configuraciones que reducen la cantidad de datos que recogen sitios y servicios."
    },
    {
      "id": "security",
      "label": "Seguridad",
      "icon": "◆",
      "description": "Protecciones contra phishing, malware y ataques web comunes."
    },
    {
      "id": "extensions",
      "label": "Extensiones",
      "icon": "⊟",
      "description": "Auditoría de las extensiones instaladas: permisos, origen y reputación."
    },
    {
      "id": "fingerprint",
      "label": "Huella digital",
      "icon": "⌘",
      "description": "Cuán único es tu navegador para tracking pasivo sin cookies."
    },
    {
      "id": "leaks",
      "label": "Fugas de información",
      "icon": "⚠",
      "description": "Información que tu navegador puede estar revelando sin que lo sepas."
    }
  ]
}
```

---

## 4. Catálogo completo de checks v1.0

### Categoría: updates

#### chrome-version

```json
{
  "id": "chrome-version",
  "category": "updates",
  "title": "Chrome actualizado",
  "severity": "high",
  "weight": 8,
  "method": {
    "type": "userAgent",
    "extractVersion": true,
    "compareWith": "latest_minus_2",
    "manifestVersionsList": "https://chromiumdash.appspot.com/fetch_releases?channel=Stable"
  },
  "rationale": "Las versiones antiguas de Chrome contienen vulnerabilidades públicamente conocidas que pueden ser explotadas por sitios maliciosos sin interacción del usuario.",
  "fix": {
    "type": "navigate",
    "url": "chrome://settings/help",
    "instructions": "Ve a 'Acerca de Chrome' y permite la actualización si está disponible."
  },
  "introducedIn": "1.0.0"
}
```

**Implementación:**
```javascript
async function checkChromeVersion(check) {
  const ua = navigator.userAgent;
  const match = ua.match(/Chrome\/(\d+)\.(\d+)\.(\d+)\.(\d+)/);
  if (!match) return { status: 'unknown' };

  const current = match.slice(1).map(Number);
  const latest = await fetchLatestStableVersion();

  const majorDiff = latest[0] - current[0];

  if (majorDiff <= 1) return { status: 'pass', detail: `v${current.join('.')}` };
  if (majorDiff <= 3) return { status: 'warn', detail: `${majorDiff} versiones por detrás` };
  return { status: 'fail', detail: `${majorDiff} versiones por detrás (vulnerable)` };
}
```

---

### Categoría: privacy

#### third-party-cookies

```json
{
  "id": "third-party-cookies",
  "category": "privacy",
  "title": "Bloqueo de cookies de terceros",
  "severity": "high",
  "weight": 10,
  "method": {
    "type": "chromePrivacy",
    "api": "websites.thirdPartyCookiesAllowed",
    "expected": false
  },
  "rationale": "Las cookies de terceros permiten a redes publicitarias rastrearte entre sitios web distintos sin tu conocimiento. Bloquearlas es el cambio más impactante para tu privacidad.",
  "fix": {
    "type": "navigate",
    "url": "chrome://settings/cookies",
    "instructions": "Selecciona 'Bloquear cookies de terceros'."
  },
  "introducedIn": "1.0.0"
}
```

**Implementación:**
```javascript
async function checkThirdPartyCookies() {
  return new Promise((resolve) => {
    chrome.privacy.websites.thirdPartyCookiesAllowed.get({}, (details) => {
      const blocked = details.value === false;
      resolve({
        status: blocked ? 'pass' : 'fail',
        detail: blocked ? 'Bloqueadas' : 'Permitidas (riesgo de tracking cross-site)'
      });
    });
  });
}
```

#### do-not-track

```json
{
  "id": "do-not-track",
  "category": "privacy",
  "title": "Señal Do Not Track activa",
  "severity": "low",
  "weight": 2,
  "method": {
    "type": "chromePrivacy",
    "api": "websites.doNotTrackEnabled",
    "expected": true
  },
  "rationale": "Aunque DNT no es vinculante legalmente, algunos sitios y empresas lo respetan voluntariamente. Es un esfuerzo mínimo para una pequeña mejora.",
  "introducedIn": "1.0.0"
}
```

#### doh-enabled

```json
{
  "id": "doh-enabled",
  "category": "privacy",
  "title": "DNS sobre HTTPS habilitado",
  "severity": "medium",
  "weight": 5,
  "method": {
    "type": "chromePrivacy",
    "api": "network.dnsOverHttpsMode"
  },
  "rationale": "Sin DNS sobre HTTPS, tu proveedor de Internet ve cada dominio que visitas en texto claro. DoH cifra esas consultas para que solo tú y el resolver las veáis.",
  "fix": {
    "type": "navigate",
    "url": "chrome://settings/security",
    "instructions": "Activa 'Usar DNS seguro' y elige un proveedor (Cloudflare 1.1.1.1 o Quad9 son buenas opciones)."
  },
  "introducedIn": "1.0.0"
}
```

#### https-only-mode

```json
{
  "id": "https-only-mode",
  "category": "security",
  "title": "Modo HTTPS-First activo",
  "severity": "medium",
  "weight": 6,
  "method": {
    "type": "chromePrivacy",
    "api": "websites.httpsOnlyModeEnabled"
  },
  "rationale": "Fuerza al navegador a intentar HTTPS antes que HTTP en cada conexión, evitando ataques de downgrade que pueden interceptar tus comunicaciones.",
  "fix": {
    "type": "navigate",
    "url": "chrome://settings/security"
  },
  "introducedIn": "1.0.0"
}
```

---

### Categoría: security

#### safe-browsing-enhanced

```json
{
  "id": "safe-browsing-enhanced",
  "category": "security",
  "title": "Safe Browsing en modo Mejorado",
  "severity": "medium",
  "weight": 7,
  "method": {
    "type": "chromePrivacy",
    "api": "services.safeBrowsingEnhancedEnabled"
  },
  "rationale": "El modo Mejorado de Safe Browsing ofrece protección proactiva contra phishing y malware nuevos, no solo contra los ya conocidos.",
  "fix": {
    "type": "navigate",
    "url": "chrome://settings/security"
  },
  "introducedIn": "1.0.0"
}
```

#### autofill-credit-cards

```json
{
  "id": "autofill-credit-cards",
  "category": "security",
  "title": "Autofill de tarjetas con confirmación",
  "severity": "medium",
  "weight": 5,
  "method": {
    "type": "chromePrivacy",
    "api": "services.autofillCreditCardEnabled"
  },
  "rationale": "Si tienes tarjetas guardadas, asegúrate de que requieren confirmación antes de auto-rellenarse para evitar inyección por scripts maliciosos.",
  "introducedIn": "1.0.0"
}
```

---

### Categoría: extensions

#### extensions-blacklist

```json
{
  "id": "extensions-blacklist",
  "category": "extensions",
  "title": "Sin extensiones maliciosas conocidas",
  "severity": "critical",
  "weight": 15,
  "method": {
    "type": "extensionsCheck",
    "againstList": "extensions-blacklist.json",
    "matchBy": ["id", "name"]
  },
  "rationale": "Existen extensiones identificadas como maliciosas que roban credenciales, inyectan publicidad o exfiltran datos personales.",
  "fix": {
    "type": "showInstructions",
    "instructions": "Desinstala inmediatamente las extensiones marcadas y cambia las contraseñas de servicios sensibles que hayas usado."
  },
  "introducedIn": "1.0.0"
}
```

**Implementación:**
```javascript
async function checkExtensionsBlacklist() {
  const installed = await chrome.management.getAll();
  const blacklist = await loadBlacklist();

  const matches = installed.filter(ext => {
    const byId = blacklist.entries.some(b => b.id === ext.id);
    const byName = blacklist.entries.some(b =>
      b.name.toLowerCase() === ext.name.toLowerCase());
    return byId || byName;
  });

  if (matches.length === 0) {
    return { status: 'pass', detail: `${installed.length} extensiones revisadas` };
  }

  return {
    status: 'fail',
    detail: `${matches.length} extensión(es) en lista negra`,
    extensions: matches.map(e => ({ id: e.id, name: e.name }))
  };
}
```

#### extensions-permissions

```json
{
  "id": "extensions-permissions",
  "category": "extensions",
  "title": "Sin extensiones con permisos excesivos",
  "severity": "medium",
  "weight": 6,
  "method": {
    "type": "extensionsPermissionsAudit",
    "flagPermissions": [
      "<all_urls>", "tabs", "history", "cookies",
      "webRequest", "webRequestBlocking", "downloads",
      "management", "debugger", "proxy"
    ],
    "tolerance": 2,
    "exceptions": []
  },
  "rationale": "Las extensiones con muchos permisos pueden hacer mucho daño si son comprometidas o vendidas a un mal actor.",
  "fix": {
    "type": "showInstructions",
    "instructions": "Revisa si las extensiones marcadas realmente necesitan estos permisos. Si dudas, desinstálalas y busca alternativas más restrictivas."
  },
  "introducedIn": "1.0.0"
}
```

#### extensions-from-cws

```json
{
  "id": "extensions-from-cws",
  "category": "extensions",
  "title": "Extensiones desde Chrome Web Store oficial",
  "severity": "medium",
  "weight": 5,
  "method": {
    "type": "extensionsSourceCheck"
  },
  "rationale": "Las extensiones cargadas manualmente (sideloaded) no pasan el proceso de revisión de Google y son un vector común de malware.",
  "introducedIn": "1.0.0"
}
```

---

### Categoría: fingerprint

#### fingerprint-entropy

```json
{
  "id": "fingerprint-entropy",
  "category": "fingerprint",
  "title": "Entropía del fingerprint del navegador",
  "severity": "medium",
  "weight": 5,
  "method": {
    "type": "fingerprintCalculation",
    "thresholds": {
      "pass": 15,
      "warn": 22
    }
  },
  "rationale": "Cuanto más único sea tu navegador (combinación de fonts, plugins, resolución, etc.), más fácil es rastrearte sin cookies. Es difícil de mitigar pero importante saberlo.",
  "fix": {
    "type": "externalLink",
    "url": "https://coveryourtracks.eff.org/",
    "instructions": "Visita Cover Your Tracks de la EFF para una evaluación más completa."
  },
  "introducedIn": "1.0.0"
}
```

---

### Categoría: leaks

#### webrtc-leak

```json
{
  "id": "webrtc-leak",
  "category": "leaks",
  "title": "Sin fugas de IP por WebRTC",
  "severity": "medium",
  "weight": 5,
  "method": {
    "type": "webrtcLeakTest"
  },
  "rationale": "WebRTC puede revelar tu IP local y pública incluso a través de una VPN, comprometiendo tu privacidad.",
  "fix": {
    "type": "externalLink",
    "url": "https://chrome.google.com/webstore/detail/webrtc-leak-prevent",
    "instructions": "Considera usar una extensión que mitigue las fugas de WebRTC o desactivarlo si no lo usas."
  },
  "introducedIn": "1.0.0"
}
```

**Implementación:**
```javascript
async function checkWebRTCLeak() {
  return new Promise((resolve) => {
    const pc = new RTCPeerConnection({iceServers: [{urls: 'stun:stun.l.google.com:19302'}]});
    pc.createDataChannel('');
    pc.createOffer().then(o => pc.setLocalDescription(o));

    const ips = new Set();
    let timer;

    pc.onicecandidate = (e) => {
      if (!e.candidate) return;
      const m = e.candidate.candidate.match(/(\d+\.\d+\.\d+\.\d+|[0-9a-f]+:[0-9a-f:]+)/i);
      if (m) ips.add(m[1]);

      clearTimeout(timer);
      timer = setTimeout(() => {
        pc.close();
        resolve({
          status: ips.size === 0 ? 'pass' : 'warn',
          detail: ips.size === 0 ? 'Sin fugas detectadas' : `${ips.size} IP(s) reveladas`
        });
      }, 1500);
    };
  });
}
```

---

## 5. Cálculo del score total

```javascript
function calculateScore(checkResults) {
  let totalWeight = 0;
  let lostPoints = 0;

  for (const result of checkResults) {
    totalWeight += result.weight;
    if (result.status === 'fail') lostPoints += result.weight;
    if (result.status === 'warn') lostPoints += result.weight * 0.5;
  }

  const score = Math.max(0, Math.round(100 - (lostPoints / totalWeight) * 100));
  return score;
}
```

### Mapeo de score a label

```
90-100: "Excelente"          color: green
75-89:  "Bueno"              color: green
60-74:  "Aceptable, mejorable" color: amber
40-59:  "Mejorable"          color: amber
20-39:  "Riesgo elevado"     color: red
 0-19:  "Riesgo crítico"     color: red
```

---

## 6. Versionado de la baseline

Semver estricto:

- **Major (2.0.0)**: cambia el schema, hay que migrar checks existentes
- **Minor (1.1.0)**: se añaden checks nuevos sin romper los existentes
- **Patch (1.0.1)**: se ajustan rationales, severidades o pesos

La extensión guarda la versión actual usada y avisa al usuario cuando hay nueva baseline disponible:

```javascript
{
  "currentBaselineVersion": "1.0.0",
  "latestAvailableVersion": "1.1.0",
  "lastChecked": "2026-04-25T12:00:00Z",
  "autoUpdate": true
}
```

---

## 7. Lista de checks futuros (para v1.1+)

- `cookies-clear-on-exit` — limpieza automática de cookies al cerrar Chrome
- `password-manager-strength` — análisis del password manager activo
- `passwords-leaked-check` — chequeo contra HIBP (con consentimiento)
- `homoglyph-domains-check` — extensiones que detectan dominios homoglyph
- `proxy-misconfiguration` — detección de proxy mal configurado
- `mixed-content-blocked` — chequeo de contenido mixto
- `referrer-policy-strict` — política de referrer estricta
- `sandboxed-iframe-default` — iframes sandbox por defecto

---

## 8. Anti-patrones a evitar

❌ **Chequeos subjetivos**: "tu navegador podría ser más privado"
✅ **Específico y verificable**: "third-party cookies están permitidas"

❌ **Recomendar herramientas concretas de terceros**: "instala uBlock"
✅ **Recomendar configuración o categorías**: "instala un bloqueador de contenido"

❌ **Asustar para vender**: "TU IDENTIDAD ESTÁ EN PELIGRO"
✅ **Informar con calma**: "tu fingerprint es más único que el promedio"

❌ **Falsos positivos por configuración legítima**: marcar `<all_urls>` en uBlock
✅ **Whitelist de extensiones legítimas con permisos justificados**

---

## 9. Whitelist de extensiones legítimas

Para evitar falsos positivos en `extensions-permissions`, mantener una whitelist:

```json
{
  "version": "2026-04-25",
  "whitelisted": [
    {
      "id": "cjpalhdlnbpafiamejdnhcphjbkeiagm",
      "name": "uBlock Origin",
      "justification": "Bloqueador de contenido necesita <all_urls> para filtrar"
    },
    {
      "id": "pkehgijcmpdhfbdbbnkijodmdjhbjlgp",
      "name": "Privacy Badger",
      "justification": "Bloqueador de tracking necesita webRequest"
    },
    {
      "id": "nngceckbapebfimnlniiiahkandclblb",
      "name": "Bitwarden",
      "justification": "Password manager necesita <all_urls>"
    }
  ]
}
```

Esta whitelist se sincroniza desde el backend y se actualiza cada semana.

---

*Spec v1.0 — generado el 25 de abril de 2026.*
