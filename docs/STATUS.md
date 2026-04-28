# STATUS.md

> **Propósito de este archivo:** memoria persistente del proyecto. Claude Code lo lee al iniciar cada sesión para saber dónde estamos. Actualizar al final de cada tarea completada.

---

## Estado actual

**Fase actual:** v0.2.0 con fix de Blue Argon — listo para resubir a CWS
**Última actualización:** 2026-04-28
**Próxima tarea:** Subir `browser-audit-2026-04-28.zip` al Chrome Web Store

### Incidente CWS (2026-04-28)

v0.1.0 fue **rechazada** por Google con motivo `Blue Argon` (Remotely Hosted Code en MV3).
Causa real: el bundle de `jspdf` incluye una rama `output('pdfobjectnewwindow')` que carga
PDFObject desde cdnjs vía `<script src=...>`. La extensión nunca llama a esa rama (solo usa
`doc.save()`), pero el reviewer estático de CWS detecta la URL en el bundle y rechaza.

**Fix aplicado en v0.2.0:**
- `scripts/strip-remote-code.js` — neutraliza la URL y la integrity del bundle tras esbuild.
- Integrado en `scripts/build.js` y `scripts/dev.js` (mismo binario en dev y prod).
- Aborta el build si quedan patrones `cdnjs/jsdelivr/unpkg` residuales.
- Verificación: `grep` sobre `extension/dist/popup/popup.js` no encuentra ninguna URL
  remota cargada vía `script.src`.

---

## Documentos de referencia

Antes de empezar cualquier tarea, leer:

1. `docs/ARCHITECTURE.md` — documento maestro del proyecto (visión, fases, decisiones)
2. `docs/BASELINE_SPEC.md` — especificación detallada de los chequeos del Browser Health Check
3. Este `STATUS.md`

---

## Decisiones arquitectónicas tomadas

- **Manifest V3 estricto** — sin hacks, sin uso de APIs deprecated
- **JavaScript vanilla** — no TypeScript en el MVP (revisar para v2)
- **Bundler:** esbuild
- **Tests:** Vitest para unitarios, Puppeteer para e2e
- **Backend:** Node.js + Fastify + SQLite (solo si se llega a la fase 4)
- **Pagos:** ExtensionPay
- **Privacidad:** el cliente nunca envía URLs ni datos personales al backend; solo hashes SHA256
- **Permisos mínimos:** la extensión debe usar `activeTab` y `optional_permissions` siempre que sea posible; cualquier permiso sensible requiere justificación antes de implementarse.
---

## Decisiones pendientes de discutir

- [ ] Nombre comercial unificado (sugerencias en Architecture sección 11)
- [ ] Open source vs closed source (probable: cliente OSS, backend privado)
- [ ] Idiomas iniciales (probable: ES + EN)

---

## Progreso por fase

### FASE 0 — Fundamentos del proyecto

- [x] Inicializar repo git con la estructura de carpetas de Architecture sección 3
- [x] Crear `STATUS.md` (este archivo) y actualizar
- [x] Setup `package.json` con scripts: `dev`, `build`, `test`, `lint`, `package`
- [x] Configurar esbuild (scripts/build.js, scripts/dev.js, scripts/package.js)
- [x] Configurar ESLint con reglas estrictas para extensiones MV3 (eslint.config.js flat config)
- [x] Configurar Prettier (.prettierrc)
- [x] Configurar Vitest (vitest.config.js, umbral de cobertura 40%)
- [x] Crear `manifest.json` mínimo con permisos justos (storage, activeTab, scripting core; management+privacy opcionales)
- [x] Crear stubs de código: background/index.js, content/bridge.js, content/instrumentation.js, popup/popup.html+js+css
- [x] Build pasa sin errores (`npm run build` → extension/dist/)
- [x] Verificar que la extensión carga en chrome://extensions sin errores ✓
- [x] Setup de CI básico en GitHub Actions (.github/workflows/ci.yml — lint + build + test)

### FASE 1 — Browser Health Check

- [x] Crear `extension/data/baseline.v1.json` — 16 chequeos en 6 categorías
- [x] Implementar `audit-engine.js` — 8 handlers, score ponderado, gestión permisos opcionales
- [x] Handlers: userAgent, chromePrivacy, extensionsCheck, extensionsPermissionsAudit, extensionsSourceCheck, extensionsMV2Check, fingerprintCalculation, webrtcLeakTest
- [x] Vista "Health Overview" — score circular SVG + checks agrupados por categoría + botones Fix
- [ ] Vista "Health Detail" — detalle por check individual (pendiente Fase 1.5)
- [ ] Vista "Extensions" — lista de extensiones instaladas (pendiente Fase 1.5)
- [x] Botón Fix → abre URL o muestra instrucciones
- [x] Persistencia en chrome.storage.local
- [x] Re-auditoría automática cada 24h (via onStartup)
- [x] Tests unitarios — 13 tests, calculateScore y scoreLabel
- [x] Verificación manual en Chrome ✓ — score, categorías, botones Fix, todo funciona

### FASE 2 — ScriptSpy reactivado

- [x] 5 capas de instrumentación: network, storage, input-tracking, fingerprinting, injection
- [x] instrumentation.js (MAIN world) con getCallerScript() para atribución de eventos
- [x] bridge.js (ISOLATED world) relay de eventos al background
- [x] event-aggregator.js: agrupa eventos por script, computeScriptRisk (fórmula §5.4)
- [x] Inyección bajo demanda via chrome.scripting.executeScript (activeTab + scripting)
- [x] Reset por navegación (webNavigation.onCommitted)
- [x] Vista ScriptSpy Live: scripts ordenados por riesgo, event chips, risk pills
- [x] Pestañas Health / ScriptSpy en el popup
- [x] 15 tests unitarios de event-aggregator y computeScriptRisk
- [ ] Verificación manual en Chrome (PENDIENTE)

### FASE 3 — Sistema de planes

- [x] plan-manager.js: tier free/pro en storage, devTogglePro() para sandbox, preparado para ExtensionPay
- [x] background: mensajes get_plan, dev_toggle_pro, reset_plan
- [x] Onboarding: tour 2 pasos, solicita permisos, solo en primera instalacion
- [x] upgrade.js: comparativa free vs pro, toggle dev para simular Pro
- [x] popup.js + popup.html: pestana Pro en nav, boot con onboarding check
- [ ] ExtensionPay real — requiere CWS ID publicado (Fase 8)
- [ ] Verificacion manual en Chrome (PENDIENTE)

### FASE 4 — Backend de threat intel

- [ ] Setup proyecto backend
- [ ] Schema SQLite + migraciones
- [ ] Endpoint público GET /baseline/latest
- [ ] Endpoint Pro POST /lookup
- [ ] Worker URLhaus (1h)
- [ ] Worker MalwareBazaar (1h)
- [ ] Worker DisconnectMe (diario)
- [ ] Worker PhishTank (6h)
- [ ] Rate limiting
- [ ] Logs estructurados
- [ ] Health check
- [ ] Docker
- [ ] Deploy
- [ ] Monitoring

### FASE 5 — Integración cliente con threat intel

- [ ] `threat-intel-client.js` con caché 24h
- [ ] Integración en audit-engine
- [ ] Integración en event-aggregator
- [ ] UI badges "MALICIOSO CONFIRMADO"
- [ ] Filtro "Solo malicioso"
- [ ] Manejo graceful de errores
- [ ] Tests de integración

### FASE 6 — Reglas YARA

- [ ] Investigar yara-x WASM
- [ ] Integrar yara-x en background
- [ ] Sincronizar reglas
- [ ] Aplicar al código JS
- [ ] UI de matches
- [ ] Optimización

### FASE 7 — Export, histórico y API

- [ ] Export PDF
- [ ] Export JSON
- [ ] Histórico en IndexedDB
- [ ] Vista de histórico con gráfico
- [ ] API key management
- [ ] Endpoint /audit/:id

### FASE 8 — Lanzamiento

**Documentación (hecho):**
- [x] Privacy Policy — docs/PRIVACY_POLICY.md
- [x] Terms of Service — docs/TERMS.md
- [x] CWS listing text (EN + ES) — docs/CWS_LISTING.md
- [x] Landing page — landing/index.html

**Pendiente antes de subir a CWS:**
- [ ] Iconos reales (diseño profesional 16/48/128px — los actuales son placeholders)
- [ ] 5 screenshots a 1280×800px (ver docs/CWS_LISTING.md para descripción de cada uno)
- [ ] Promotional tile 440×280px
- [ ] Hosting de Privacy Policy (GitHub Pages o Cloudflare Pages)
- [ ] Cuenta CWS Developer ($5 pago único en pay.google.com/us/about/freetrial/)
- [ ] Subir ZIP de extension/dist/ al Developer Dashboard
- [ ] Rellenar listing con texto de CWS_LISTING.md
- [ ] Pegar URL de Privacy Policy publicada en el form de CWS
- [ ] Justificar permisos (texto en CWS_LISTING.md sección "Justification")
- [ ] Revisar que versión en manifest.json sea ≥ 0.1.0

**Post-lanzamiento:**
- [ ] Vídeo demo (Loom, 90 segundos)
- [ ] Posts en r/netsec, r/privacy, Hacker News Show HN
- [ ] Deploy backend en Hetzner CX21 (€5/mes) para plan Pro
- [ ] Integrar ExtensionPay con el CWS extension ID real
- [ ] Fase 6 — YARA en cliente

---

## Ideas a desarrollar

### Baseline dinámica con perfiles y fuentes

**Contexto:** la baseline actual es estática (embebida en `extension/data/baseline.v1.json`).
La arquitectura ya prevé sincronización desde `/baseline/latest.json` sin actualizar la extensión.

**Ideas concretas a implementar cuando estemos estables:**

1. **Silenciar checks individuales** — el usuario puede marcar "ignorar este check para siempre"
   (p.ej. DNT, que no es vinculante). Se guarda en `chrome.storage.local`, no requiere backend.
   UI: botón "Ignorar" junto a "Arreglar" en cada check fallido.

2. **Perfiles de usuario** — conjuntos de checks activados/pesos ajustados según contexto:
   - `casual` — solo critical + high, ignora fingerprint y DNT
   - `tecnico` — todos los checks, umbrales más estrictos
   - `trabajo` — ignora extensiones sideloaded (pueden ser herramientas internas)
   Implementable como campo `profiles: ['casual', 'tecnico']` en cada check de la baseline.

3. **Fuentes y referencias por check** — añadir campo `source` en la baseline con enlace
   a la referencia que justifica el check (Chrome docs, EFF, CRXcavator, etc.).
   Se muestra en la vista de detalle del check. Aumenta credibilidad y confianza del usuario.

4. **Baseline dinámica sin backend** — la extensión puede sincronizar la baseline desde
   una URL pública (GitHub raw, Cloudflare Pages) sin necesidad de servidor propio.
   Actualización silenciosa cada 24h, notificación si hay nueva versión mayor.

**Notas y aprendizajes**

---

## Cosas que se rompieron y cómo se arreglaron

[A rellenar para evitar repetir errores]

---

## Cambios al documento maestro

Si se decide cambiar algo del Architecture.md, anotarlo aquí con fecha y razón.

[A rellenar según ocurra]

---

*Último commit: pendiente de primer push*
