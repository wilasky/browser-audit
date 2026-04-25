# Guía de Lanzamiento — Browser Audit

## 1. Sobre los risk scores que ves

**Pregunta:** "Un script da 5/100 en ScriptSpy pero 41/100 en análisis profundo. ¿Es normal?"

**Sí.** Son dos cosas distintas:

- **Risk score de ScriptSpy (lista)** → mide **comportamiento observado en runtime**: cuántas peticiones hace, si lee inputs, si hace fingerprinting, etc.
- **Risk score del análisis profundo** → mide **patrones del código fuente estático**: si usa `eval`, obfuscación, strings sospechosos, base64.

Un script puede tener bajo comportamiento (no hace casi nada visible) pero alto código sospechoso (lleno de `atob` y obfuscación porque está minificado/empaquetado). Es esperado y útil — son dos perspectivas complementarias.

---

## 2. Reglas YARA — qué son y por qué no están aún

**YARA** es un lenguaje de pattern matching usado por antivirus y threat hunters. Una regla YARA describe un patrón que identifica malware específico:

```yara
rule Coinhive_Cryptominer {
    strings:
        $a = "CoinHive.Anonymous"
        $b = "WebMiner"
    condition:
        any of them
}
```

**Para qué sirve en el navegador:** detectar variantes específicas y conocidas de malware/skimmers que los feeds de URLhaus aún no cubren.

**Por qué no está implementado:** requiere `yara-x` compilado a WASM (~500KB) en el background service worker, y un feed de reglas mantenidas. Era la **Fase 6** del roadmap original, planeada para post-lanzamiento porque:
- El análisis estático actual ya cubre los patrones más comunes (`eval`, obfuscación, base64)
- Mantener un feed de reglas YARA es trabajo continuo
- WASM en SW tiene limitaciones de memoria

**Decisión:** queda como **feature Pro futura**. Mucho más vendible cuando viene con el plan de pago.

---

## 3. Propuestas de nombre — análisis con neuromarketing

**Criterios:**
- 1-2 sílabas memorables
- Connotación de seguridad/visibilidad
- Pronunciable en inglés y español
- Dominio `.com` razonablemente disponible
- No sonar a antivirus genérico

### Top 5 candidatos

| Nombre | Por qué funciona | Puntuación |
|--------|------------------|------------|
| **Lucent** | "Brillante / luminoso". Connota visibilidad clara. Corto, fácil. Muy poco usado en seguridad. | ⭐⭐⭐⭐⭐ |
| **Looker** | "El que mira". Directo al beneficio (ver lo que pasa). Riesgo: existe Google Looker Studio. | ⭐⭐⭐ |
| **Truelens** | "Lente real". Compone dos conceptos fuertes. Sugerido en arquitectura original. | ⭐⭐⭐⭐ |
| **Watchdog** | Cliché pero efectivo. Asocia inmediatamente con vigilancia. Muchos competidores lo usan. | ⭐⭐⭐ |
| **Sentry** | Centinela. Corto, fuerte. Riesgo: existe Sentry.io (errores). | ⭐⭐⭐ |

### Mis 2 finalistas con razonamiento

**1. Lucent** ✦
- 6 letras, 2 sílabas
- "Hacer transparente lo opaco" — encaja perfectamente con "ver lo que tu navegador hace"
- Sin competidor directo en seguridad de browsers
- Tagline: *"See what your browser is hiding"*

**2. Truelens**
- Más descriptivo, menos memorable
- "Ver la verdad de cada web"
- Tagline: *"The real lens for every website"*

**Mi recomendación:** **Lucent** — más distintivo, más espacio para crecer la marca.

### Si prefieres mantener "Browser Audit"

Es funcional pero genérico. Como nombre de **producto** no es ideal. Como **descripción** sí. Solución: **"Lucent — Browser Audit"** combinas ambos.

---

## 4. Plan de marketing mínimo

### Cuentas a crear

| Plataforma | Necesidad | Coste |
|------------|-----------|-------|
| **Gmail** (cuenta de proyecto) | OBLIGATORIO. Para Chrome Web Store + redes | Gratis |
| **Chrome Web Store Developer** | OBLIGATORIO. Publicar la extensión. | $5 una vez |
| **GitHub** (ya tienes) | Repositorio público para credibilidad | Gratis |
| **Twitter/X** (`@lucent_io` o similar) | Anuncios + comunidad seguridad activa | Gratis |
| **Mastodon** (infosec.exchange) | Comunidad seguridad muy activa | Gratis |
| **Reddit** (cuenta personal sirve) | r/privacy, r/netsec, r/chrome_extensions | Gratis |
| **Producthunt** (después) | Lanzamiento día específico | Gratis |

**No necesitas:** Instagram, TikTok, LinkedIn empresa. Para una herramienta privacy-tech la audiencia está en X/Mastodon/Reddit.

### Plan de lanzamiento (1 semana de trabajo)

**Día 1 (HOY): Publicar en CWS**
- Subir el ZIP firmado
- Listing con copy en EN+ES (ya tienes en `docs/CWS_LISTING.md`)
- 5 screenshots (los haces tú con la extensión funcionando en webs reales)
- Privacy Policy en GitHub Pages (gratis)

**Día 2-3: Crear cuentas + GitHub release**
- Crear Twitter/X y Mastodon
- Bio con link a CWS
- Tag v1.0.0 en GitHub con changelog

**Día 4-5: Difusión**
- Post en r/privacy, r/chrome (cuidado con el spam, leer reglas)
- Post en r/netsec (técnico)
- Tweet thread anunciando el lanzamiento
- Post Mastodon (infosec.exchange tiene mucho cariño a herramientas open)

**Día 6-7: Producthunt**
- Pagar $0 — solo lanzar bien preparado
- Imagen, vídeo de 30 segundos, 5 reviews iniciales (amigos)

### ¿Se puede automatizar con GPT/agentes?

**Sí, parcialmente:**

**Bueno para automatizar:**
- Generar variaciones de copy para tweets
- Adaptar el mensaje a cada subreddit (estilos distintos)
- Responder preguntas técnicas iniciales
- Generar screenshots con anotaciones

**No automatizar:**
- Crear las cuentas (requiere verificación humana)
- Postear en Reddit (los mods detectan bots)
- Responder reviews/issues (debe ser humano genuino)

**Stack recomendado:**
- **GPT-4 / Claude** para generar copy
- **Loom** para grabar vídeo demo (gratis hasta 5 min)
- **Canva** para banner/screenshot composición
- **Buffer** (free tier) para programar posts

---

## 5. Licencia recomendada

**Tu situación:** quieres que sea gratis pero ganar dinero después con Pro.

**Modelo recomendado: Open Core**

- **Cliente (extensión)**: licencia **MIT** o **Apache 2.0**
  - Pueden usarlo, modificarlo, contribuir
  - **No te quita ventaja**: el valor diferencial está en el backend de threat intel, las reglas YARA y la marca
- **Backend (Pro)**: **propietario** — código no publicado
- **Reglas YARA + baseline curada**: **propietario** — actualizaciones por suscripción

**Ejemplos del modelo:**
- Bitwarden (MIT cliente, Pro features con backend)
- Sentry (BSL en cliente)
- Plausible Analytics (AGPL para forzar backend privado)

**Mi recomendación: MIT** — el más permisivo, atrae más contribuidores, no perjudica tu monetización porque el dinero se hace en backend.

Crear `LICENSE` con texto MIT estándar (te lo genero al final).

---

## 6. Panel de descargas en Chrome Web Store

**Sí, se ve todo:**

Una vez publiques, en https://chrome.google.com/webstore/devconsole tienes:
- Usuarios activos (semanal/mensual)
- Instalaciones totales
- Países top
- Reviews y rating
- Crashes/errores reportados
- Quitas/upgrades por versión

**Bonus:** Google Analytics se puede integrar (con opt-in del usuario por privacidad).

---

## 7. Reglas YARA — info detallada

Si vuelves a este punto:

**Implementación práctica para Pro:**
1. Compilar `yara-x` (Rust port) a WASM ~500KB
2. Cargar en background service worker (lazy)
3. Backend mantiene un feed `/yara/rules.json` con reglas firmadas
4. Cliente sincroniza diariamente
5. Aplica reglas al código de scripts interceptados por ScriptSpy
6. UI: badge "🛡 YARA: CoinHive_Cryptominer" en script detectado

**Coste de mantener un feed:**
- ~30 reglas curadas iniciales
- 1-2h/semana actualizando con nuevas amenazas
- Alternativa: usar feed open de [Yara-Rules/rules](https://github.com/Yara-Rules/rules)

**Vendible como "Pro" porque:**
- Diferenciador real
- Reglas curadas = trabajo continuo de un humano
- Backend para distribución

---

## 8. Checklist final pre-publicación

- [ ] Decidir nombre final (Lucent / Truelens / Browser Audit)
- [ ] Crear Gmail del proyecto
- [ ] Crear cuenta CWS Developer ($5)
- [ ] Generar 5 screenshots reales 1280×800
- [ ] Hostear `docs/PRIVACY_POLICY.md` en GitHub Pages (rama `gh-pages`)
- [ ] Actualizar URLs en código (PRIVACY_POLICY link, GitHub repo)
- [ ] Generar LICENSE MIT
- [ ] `npm run package` → ZIP final
- [ ] Subir a CWS y rellenar listing con texto de `docs/CWS_LISTING.md`
- [ ] Tag `v1.0.0` en GitHub con release notes
- [ ] Plan de difusión 1 semana

---

## 9. ¿Lo publicamos hoy?

**Mi opinión técnica:** la extensión está estable, los bugs críticos arreglados, los textos coherentes.

**Lo que NO está listo:**
- 5 screenshots reales (los haces tú con la extensión cargada)
- Decidir nombre
- Crear cuentas (Gmail proyecto, CWS Developer $5)
- Hostear Privacy Policy

**Tiempo estimado para publicar HOY:**
- 30 min: cuenta CWS + Gmail + nombre
- 30 min: screenshots
- 30 min: subir a CWS, rellenar form, enviar a review
- **Review CWS tarda 1-3 días** (no se publica instantáneo)

**Sí, publica hoy.** Los reviews de CWS son lentos, mejor empezar el reloj. Mientras esperas la aprobación creas las cuentas de redes y preparas el plan de difusión.

---

*Última actualización: 2026-04-25*
