# Plan Pro v1 — Realista, un solo tier

> Empezar pequeño, validar, escalar. Pro Pentester y Enterprise quedan como
> "ideas futuras" en `PRO_ROADMAP.md` solo si Personal valida tracción.

---

## Tier único: Pro Personal · €2/mes · €20/año

**2 features clave:**

1. **Threat Intelligence en tiempo real**
   - Backend ya construido (`backend/`)
   - Feeds de URLhaus, MalwareBazaar, OpenPhish
   - Badge "⚠ THREAT CONFIRMADO" en ScriptSpy
   - Hash check anonimizado (SHA256)

2. **IA preempaquetada (sin API key propia)**
   - Server proxy a Claude/OpenAI
   - Resúmenes ilimitados de privacy policies
   - Análisis con IA de scripts sospechosos
   - Coste asumido por la suscripción

**Por qué solo estas dos:**
- TI = el killer feature ("ningún competidor a este precio")
- IA = removes friction (90% no se va a configurar API key propia)
- Suficiente para validar la propuesta de valor

---

## Hoja de ruta concreta (8 semanas)

### Semana 0 — Lanzamiento v0.1 (esperando review CWS)

- [ ] CWS aprueba v0.1
- [ ] Subir v0.2 inmediatamente (ya en main, solo bump version + zip)
- [ ] Tweet/Mastodon/Reddit de lanzamiento (5 posts max)
- [ ] **Hito mental:** sin métricas todavía, solo difundir

### Semana 1-2 — Validar tracción

- [ ] Monitorizar instalaciones en CWS Developer Console
- [ ] Leer cada review/issue de GitHub
- [ ] **Hito de decisión:**
  - ✅ **>50 instalaciones + feedback positivo** → continuar a backend
  - ⚠️ **20-50 instalaciones + algún feedback** → continuar pero con cautela
  - ❌ **<20 instalaciones o reviews negativas** → arreglar bugs, no expandir

### Semana 3 — Deploy backend (SI hay tracción)

- [ ] Comprar dominio: `lucent.app` o `lucentaudit.com` (~€10/año)
- [ ] Hetzner CX21 (€5/mes) + Docker compose up
- [ ] DNS + Cloudflare delante
- [ ] Inicializar feeds: `npm run sync` (URLhaus, MalwareBazaar, OpenPhish)
- [ ] Verificar `/health` responde
- [ ] **Hito:** API en producción a `api.lucent.app`

### Semana 4 — Conectar TI client

- [ ] `extension/shared/constants.js` → `BACKEND_URL` apunta a producción
- [ ] Sistema de API keys (genera clave única tras pagar)
- [ ] Settings → "Pegar tu API key Pro" (el user introduce la que recibe por email)
- [ ] Test end-to-end: visitar web maliciosa → ScriptSpy muestra "⚠ THREAT URLhaus"

### Semana 5 — Pagos

- [ ] Cuenta ExtensionPay (Stripe under the hood)
- [ ] Producto "Lucent Pro" creado
- [ ] Webhook: pago confirmado → genera API key + envía email
- [ ] UI: pestaña "Pro" en popup con botón upgrade
- [ ] **Trial de 14 días gratis** para reducir fricción

### Semana 6 — IA preempaquetada

- [ ] Endpoint `POST /ai/summarize` en backend
- [ ] Proxy a Anthropic API (con presupuesto compartido)
- [ ] Quota: 50 resúmenes/usuario/mes
- [ ] Cliente: si user tiene API key Pro, usa backend; si tiene su propia API key, usa esa; si no tiene nada, ofrece upgrade

### Semana 7 — Lanzar Pro v1

- [ ] Subir v0.3 a CWS con la pestaña Pro
- [ ] Actualizar listing CWS para mencionar Pro (ahora SÍ es real)
- [ ] Tweet de lanzamiento Pro
- [ ] Email a usuarios FREE existentes (si conseguiste algunos contactos): "Pro está aquí"

### Semana 8 — Medir conversión

- [ ] Stats: ¿cuántos pagaron? ¿cuántos cancelaron en el trial?
- [ ] **Hito de decisión final:**
  - ✅ **>10 suscriptores Pro** → considerar Pro Pentester (tier 2)
  - ⚠️ **3-10 suscriptores** → mantener Pro Personal, mejorar features
  - ❌ **<3 suscriptores** → cerrar Pro o pivotar

---

## Coste real

| Mes | Gasto fijo | Gasto variable | Total |
|-----|-----------|----------------|-------|
| 1 (deploy) | €5 (Hetzner) + €10 (dominio una vez) | ~€0 | **€15** |
| 2-12 | €5 (Hetzner) | €0.05/Pro user/mes (IA) | **~€5-10/mes** |

**Punto de equilibrio:**
- 3 suscriptores Pro Personal = €6/mes ingresos
- Cubre el coste fijo

---

## Si no hay tracción — plan B

**Si en mes 1 hay <20 instalaciones:**
- NO desplegar backend (€0 de gasto)
- Seguir como FREE indefinidamente
- Mejorar la extensión (v0.3, v0.4 con features de la lista FREE)
- Re-lanzar en r/netsec, Hacker News tras añadir features llamativas

**Si en mes 3 hay 0 conversiones a Pro:**
- Apagar backend (de vuelta a €0/mes)
- Mantener extensión FREE
- Las features Pro implementadas pasarían a FREE (regalo a la comunidad)
- Considerarlo "experimento aprendido"

**Riesgo financiero máximo:** €30 (3 meses de Hetzner sin recuperar nada). Asumible.

---

## Lo que NO hago en v1

Movido a `PRO_ROADMAP.md` (futuro lejano):
- Pro Pentester (YARA, Wappalyzer, multi-lenguaje)
- Pro Enterprise (consultor, API, dashboard)
- Cualquier feature que requiera más que 1-2 días de desarrollo

**Razón:** validar primero la propuesta básica. Si €2/mes con TI+IA no convence, tampoco lo hará YARA a €10. Si SÍ convence, escalo.

---

## Métricas de éxito definidas

**Mes 1 post-lanzamiento v0.1:**
- ≥50 instalaciones CWS
- ≥3 reviews 4+ estrellas
- Cero bugs críticos sin resolver

**Mes 3 post-lanzamiento Pro v1:**
- ≥5 suscriptores Pro pagando
- Renovaciones >70% (o sea, no se dan de baja al primer mes)
- ROI positivo (ingresos > gastos)

Si ambos hitos se cumplen → seguir adelante.
Si fallan → revisar y posiblemente pivotar.

---

*Última actualización: 2026-04-26*
