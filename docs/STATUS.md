# STATUS.md

> **Propósito de este archivo:** memoria persistente del proyecto. Claude Code lo lee al iniciar cada sesión para saber dónde estamos. Actualizar al final de cada tarea completada.

---

## Estado actual

**Fase actual:** FASE 1 — Browser Health Check (completada, pendiente verificación manual)
**Última actualización:** 2026-04-25
**Próxima tarea:** Verificar UI en Chrome → si OK, iniciar Fase 2 (ScriptSpy)

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
- [ ] Verificación manual en Chrome (PENDIENTE)

### FASE 2 — ScriptSpy reactivado

- [ ] Verificar que las 5 capas de instrumentación funcionan
- [ ] `event-aggregator.js`
- [ ] `classifier.js`
- [ ] `computeScriptRisk` con la fórmula de Architecture sección 5.4
- [ ] Vistas Live, Fingerprint, Targets
- [ ] Live event ticker
- [ ] Reset por navegación
- [ ] Tests del classifier

### FASE 3 — Sistema de planes

- [ ] Integración ExtensionPay sandbox
- [ ] `plan-manager.js` con isProUser cacheado
- [ ] Lógica de gating
- [ ] Onboarding inicial
- [ ] Tour rápido
- [ ] UI de upgrade
- [ ] Pantalla de gestión de licencia
- [ ] Verificación de licencia con fallback offline

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

- [ ] Cuenta CWS Developer
- [ ] Privacy Policy
- [ ] Términos
- [ ] Screenshots
- [ ] Vídeo demo
- [ ] Landing page
- [ ] Listing CWS
- [ ] Plan de marketing inicial

---

## Notas y aprendizajes

[A rellenar según vayan apareciendo]

---

## Cosas que se rompieron y cómo se arreglaron

[A rellenar para evitar repetir errores]

---

## Cambios al documento maestro

Si se decide cambiar algo del Architecture.md, anotarlo aquí con fecha y razón.

[A rellenar según ocurra]

---

*Último commit: pendiente de primer push*
