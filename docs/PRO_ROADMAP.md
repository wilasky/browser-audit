# Lucent Pro — Roadmap de funcionalidades

> Documento maestro de ideas para la versión de pago. Recopila todo lo discutido
> a lo largo del desarrollo + ideas nuevas. Las features están **clasificadas por
> tier** y por **dificultad técnica**.

---

## 🎯 Estrategia general

**Modelo Open Core:**
- Cliente (extensión) → MIT, gratis siempre
- Backend de Pro → propietario, suscripción
- El valor diferencial NO está en el código, está en:
  - Datos curados (threat intel, YARA rules, blacklists)
  - Servidor de IA preempaquetado
  - Histórico permanente
  - Reportes profesionales

**Por qué la gente pagará:**
- Por **automatización** (no tener que poner mi API key, no tener que verificar manualmente)
- Por **datos en tiempo real** (TI, malware, vulnerabilidades)
- Por **horas ahorradas** (consultores, pentesters, auditores RGPD)
- Por **tranquilidad** (mi navegador está protegido continuamente)

---

## 🆕 Features añadidas tras feedback

### Bloqueo de configuración (lock individual)
**Tier:** Pro Personal
- Junto al botón ⚡ Aplicar, un icono **🔒 Bloquear**
- Una vez bloqueado: el setting NO solo se re-aplica cada 30 min (como hacemos
  ahora con `appliedFixes`), sino que:
  - Se re-aplica **inmediatamente** si cambia (listener `setting.onChange`)
  - Notificación al user: "⚠ Otro programa intentó cambiar X. Restaurado."
  - Badge visual "🔒 Bloqueado por Lucent" en el check
- Útil contra: malware, otras extensiones agresivas, "fixes" de soporte técnico
  que cambian settings sin permiso
- Implementación: nuevo storage `lockedFixes`, listener por API en background

### Deshacer ajuste individual (undo por check)
**Tier:** Pro Personal
- Junto al botón ✓ Aplicado, un botón **↶ Deshacer**
- Diferencia con "Restablecer todo":
  - Restablecer = vuelve TODO a defaults de Chrome
  - Deshacer = vuelve SOLO este check a su valor PREVIO al apply
- Por cada apply, guardar `previousValue` en storage:
  ```js
  appliedFixes: [{ api, value, previousValue }]
  ```
- Al deshacer: `setting.set({ value: previousValue })`
- Útil para experimentar: aplicas, no te gusta el efecto, deshaces solo eso

### Análisis multi-lenguaje extendido
**Tier:** Pro Pentester (más complejo, gran valor técnico)

**Investigación realizada — formatos peligrosos en navegador:**

| Formato | Riesgo | Por qué analizar |
|---------|--------|------------------|
| **WebAssembly (.wasm)** | ALTO | Código binario opaco. Cryptominers modernos lo usan (CoinHive successors) |
| **Service Workers** | ALTO | JS persistente fuera de pestaña. Interceptan requests, exfiltran |
| **HTML inline event handlers** | MEDIO | onload, onerror, onclick — bypass de CSP |
| **data: URIs con código** | ALTO | `data:text/html,<script>` ejecuta JS sin descarga |
| **JSONP** | MEDIO | Carga JS de cualquier dominio sin SRI |
| **SVG con scripts** | ALTO | SVG puede contener `<script>` y handlers — XSS via image |
| **CSS @import remoto** | BAJO | Vector de tracking via referrer |
| **WebGL Shaders (GLSL)** | BAJO | Exploits de driver raros pero existentes |
| **CSS Houdini / Worklets** | BAJO | Emergente, poco documentado |
| **PHP/Python serialized en respuestas** | ALTO (server-side) | Si el server devuelve serialized data, RCE en deserialización del cliente |
| **eval() con base64** | ALTO | Patrón clásico de obfuscación. Ya lo detectamos parcialmente |

**Lo que añadiríamos en Pro Pentester:**

1. **WASM analyzer**
   - Disassembly básico a WAT (WebAssembly Text format) legible
   - Detección de funciones sospechosas: `crypto`, `mining`, syscalls
   - Hash SHA256 para lookup en bases de malware
   - Clasificación: ¿es CoinHive? ¿xmrig? ¿unknown?

2. **Service Worker auditor**
   - Listar todos los SW registrados en el dominio
   - Analizar el código del SW (ya tenemos análisis JS)
   - Detectar fetch interceptors agresivos
   - Detectar push subscription suspicious

3. **HTML inline handler detector**
   - Contar y mostrar todos los onXXX="..." en el DOM
   - Marcar como vulnerabilidad XSS si hay user-content
   - Sugerir CSP estricta

4. **data: URI scanner**
   - Buscar todas las data URIs en el DOM
   - Decodificar y analizar el contenido
   - Flag si hay JS embebido

5. **SVG script auditor**
   - Buscar `<script>` y `on*=` en SVGs
   - Cross-origin SVG = surface XSS

6. **Server response analyzer (avanzado)**
   - Capturar respuestas via webRequest API (requiere permission)
   - Detectar headers Content-Type sospechosos
   - Buscar firmas de PHP serialized (`O:8:"stdClass"...`), Python pickle (`\x80\x04`),
     .NET BinaryFormatter
   - Alertar: "El servidor devolvió código serializado — riesgo de deserialization attack"

**Por qué no es feature Free:**
- WASM analyzer requiere librería pesada (~2MB)
- Server response analysis necesita `webRequest` permission (problemático en CWS)
- Mantenimiento de signatures actualizadas (parecido a YARA)

---

## 🥉 Pro Personal (€2/mes · €20/año)

Para usuarios técnicos individuales que quieren más automatización y datos en tiempo real.

### 1. Threat Intelligence en tiempo real ⭐
**Diferenciador clave.** El backend (Fase 4 del proyecto, ya construido) ya está listo.
- Feeds de URLhaus, MalwareBazaar, OpenPhish, PhishTank
- DisconnectMe trackers list enriquecida
- Hashes SHA256 anonimizados → backend → match/no-match
- Badge "⚠ THREAT CONFIRMADO · URLhaus" en ScriptSpy
- Updates cada hora
- **Implementación:** ya hecha (threat-intel-client.js + backend Fastify), solo falta deploy y conectar API key real

### 2. IA preempaquetada (sin API key del usuario) ⭐
**Otro killer feature.**
- Backend tiene proxy a Claude/OpenAI con presupuesto compartido
- El usuario NO necesita su propia API key
- Resúmenes ilimitados de privacy policies
- Análisis de scripts con IA (¿es legítimo? ¿qué hace?)
- Coste asumido por la suscripción (~€0.10/usuario/mes en Anthropic)

### 3. Histórico extendido (90 días)
- Auditorías guardadas en backend (encriptadas) con la API key Pro
- Comparativa entre snapshots: "Tu score bajó 12 puntos en 30 días"
- Gráficas en la pestaña Settings
- Export como dataset para análisis propio

### 4. Alertas (notificaciones)
- Push notification si:
  - Una extensión nueva instalada tiene permisos peligrosos
  - El score baja drásticamente (umbral configurable)
  - Una web visitada está en threat intel feed
  - Cookies maliciosas conocidas detectadas
- Configurable: cuáles activar, frecuencia, etc.

### 5. Whitelist de dominios confianza
- "Mis bancos, mis sites de trabajo" — no alertar
- Marca verde inmediata
- Sincronizable entre equipos del mismo usuario

---

## 🥈 Pro Pentester (€10/mes · €100/año)

Para auditores, pentesters, devs de seguridad.

### 6. Reglas YARA en cliente ⭐
**El más técnico y vendible.**
- yara-x compilado a WASM (~500KB) en background SW
- Reglas curadas para:
  - Cryptominers (CoinHive, WebMiner variants)
  - Magecart skimmers (todas las versiones conocidas)
  - InfoStealer signatures
  - Phishing kit JS patterns
- Reglas se sincronizan desde backend cada día
- Match → badge en ScriptSpy con la regla específica
- **Implementación:** documentado en LAUNCH_GUIDE.md sección 7

### 7. Wappalyzer-style technology detection
- Identifica 50+ tecnologías web en cualquier página
- WordPress, Drupal, Magento, Shopify, Stripe, Mailchimp, etc.
- Versiones específicas + alertas si vulnerable
- Útil para reconocimiento técnico

### 8. Análisis multi-lenguaje
- WASM disassembly (legible para usuarios técnicos)
- Análisis de respuestas: ¿el server devuelve PHP serializado? ¿Python pickle?
- Patrones de exploits conocidos en respuestas
- Detección de SSRF/SSTI en errores expuestos

### 9. Top scripts maliciosos / Mini-DB
- Base de datos curada de scripts conocidos por riesgo
- Hash SHA256 → fichas con descripción humana
  - "Este es el SDK de Marfeel. Tracker comercial, no malicioso pero invasivo"
  - "Este script ha sido reportado en r/netsec por [link]"
- Crowdsourced (los Pro reportan, todos se benefician)

### 10. Headers de seguridad ampliados
- 30+ headers checkeados (CORP, NEL, Reporting-Endpoints, Origin-Agent-Cluster, etc.)
- DNS records (CAA, MTA-STS, DMARC, SPF) vía backend
- TLS info (versión, cipher, certificado, OCSP)
- HSTS preload status

### 11. Detección de tracking avanzado
- Browser fingerprinting score detallado tipo CreepJS
- Comparativa contra población real (backend acumula muestras anónimas)
- Recomendaciones específicas según tu hardware/OS

---

## 🥇 Pro Enterprise (€50/mes · €500/año)

Para empresas, consultores RGPD, MSPs.

### 12. Reportes profesionales con branding
- PDF executive summary (no solo técnico) con logo de empresa
- Reportes por framework: "Cumplimiento PCI-DSS", "ISO 27001", "ENS Alta"
- Plantilla customizable
- Multi-idioma de salida (ES, EN, FR, DE, PT)

### 13. Modo consultor / multi-cliente
- Audit de OTRO navegador (cliente envía export, consultor importa)
- Genera reporte para entregar al cliente
- Histórico por cliente, no mezclado
- Comparativa: "Tu cliente ABC mejoró 20 puntos en el último mes"

### 14. API para integraciones
- REST API privada con la suscripción
- POST /audit → devuelve resultados
- Webhooks para alertas a Slack/Teams
- Integración con SIEMs (Splunk, ELK, Sentinel)

### 15. Dashboard web companion
- web.lucent.app con histórico de todos tus dispositivos
- Gráficas de evolución
- Compartir audit con un link público (read-only)
- Multi-usuario: equipo de 5 / 10 / 25

### 16. SOC integration mode
- Modo "monitorización continua"
- Auto-scan de cada web visitada (con consentimiento granular)
- Streaming de eventos a backend
- Alertas correlacionadas: "Detectado el mismo skimmer en 3 webs distintas hoy"

---

## 🆓 Mejoras planificadas para versión gratis (no son Pro)

Estas se mantienen en el plan FREE como mejora del producto base:

### v0.2 (siguiente release tras v0.1)
- ✅ i18n GDPR + Health Check completo
- ✅ Multi-browser detection (Brave/Edge/Opera)
- ✅ Cookie consent ya aceptado (17 markers)
- ✅ Banner config button regex ampliada
- ✅ Hardenizado persistente (re-aplica cada 30min)
- ✅ Import JSON aplica settings (no solo visualiza)
- ✅ Page: con hostname + lock icon + click

### v0.3 (lo que mencionaste post-v0.2)
- i18n del módulo deep analysis (script-detail)
- i18n de detail strings restantes en audit-engine
- Más feedback visual cuando se aplican settings
- Soporte para más navegadores (Vivaldi, Arc)

---

## 💰 Análisis de viabilidad

**Coste mensual del backend:**
- Hetzner CX21: €5
- Dominio: €1
- Costes de IA (Claude API): variable, ~€0.05/usuario activo/mes
- Total fijo: ~€6/mes

**Punto de equilibrio:**
- Pro Personal a €2/mes → necesitas 3 suscriptores para cubrir infra
- Pro Pentester a €10/mes → 1 suscriptor cubre todo
- Pro Enterprise a €50/mes → es directo profit

**Realista para los primeros 3 meses:**
- 50 instalaciones FREE
- 5 conversiones a Pro Personal (€10/mes)
- 1 Pro Pentester (€10)
- Total ingresos: €20/mes
- Total gastos: ~€8/mes
- **Profit: €12/mes** — covers coffee but not retirement 😄

**Realista 12 meses (con buena difusión):**
- 1000 instalaciones
- 50 Pro Personal: €100/mes
- 10 Pro Pentester: €100/mes
- 2 Pro Enterprise: €100/mes
- **Total: €300/mes** — sustainable side project

---

## 🚀 Orden de implementación recomendado

**Fase 1 — primer mes tras lanzamiento v0.1:**
1. Deploy del backend que ya tienes (Fase 4 del proyecto original)
2. Conectar threat-intel-client a tu backend con API keys reales
3. UI: pestaña Pro / botón upgrade en Settings cuando esté listo
4. Integración con ExtensionPay para pagos

**Fase 2 — mes 2:**
5. Histórico extendido en backend
6. Alertas push (chrome.notifications API)
7. IA preempaquetada via tu backend proxy

**Fase 3 — mes 3-4:**
8. YARA WASM
9. Wappalyzer detection
10. Reportes PDF profesionales

**Fase 4 — mes 5+:**
11. Modo consultor
12. API + Dashboard web
13. SOC integration

---

## 📝 Notas finales

- **Nunca prometas en CWS lo que no haces.** Las features Pro deben aparecer SOLO cuando estén implementadas.
- **Trial de 14 días** sería buena estrategia de conversión.
- **Discount anual** (20% off) para fidelizar.
- **Códigos de descuento** para early adopters (primeros 100 que prueben Pro).
- **Reseñas en CWS** son críticas para conversión orgánica — pedir review al instalar.

---

*Última actualización: 2026-04-26*
