# REVAMP_V3_NOTES.md

> Memoria de la rama `feat/revamp-v3` — "vuelco de uso" de Lucent. Se actualiza al final de cada sesión de brainstorming/diseño en esta rama. `main` no se toca — todo lo que se quite o se pruebe aquí sigue disponible en su historial por si hace falta rescatarlo.

---

## Idea de partida (2026-08-29)

Dar un giro de posicionamiento a Lucent: de "herramienta técnica de auditoría del navegador" a "centro de privacidad y seguridad para el día a día", añadiendo una pestaña nueva de **Guías de bastionado** (iOS, Android, router, etc.) con checklists embebidos, además de lo que ya existe (ScriptSpy, Health, GDPR).

Punto de partida elegido por el usuario para empezar a darle forma: **UX/UI del popup**, concretamente esta pestaña de Guías.

## Decisiones tomadas hasta ahora

1. **No mezclar "privacidad" y "seguridad" en pestañas separadas.** Un único checklist por plataforma, cada paso etiquetado 🔒 Seguridad / 🕵 Privacidad (a veces ambas), con filtros para verlo por categoría. Mismo patrón que ya usa `extension/data/baseline.v1.json` (categories `privacy`/`security` dentro de un solo array de `checks`), no hace falta inventar nada nuevo.
2. **Las guías son checklists auto-reportados, no auditoría automática.** La extensión no puede leer ajustes de iOS/Android — el usuario cambia el ajuste en su dispositivo y marca "hecho" a mano. Esto se comunica explícito en la UI (nota bajo la barra de progreso) para no prometer algo que no se puede cumplir.
3. **Vive en página completa (`chrome.tabs.create`), no en el popup de 400px.** El popup ya va apretado con lo que hay (`compliance.js` 917 líneas, `health-overview.js` 685 líneas); las guías largas necesitan su propio espacio con scroll cómodo.
4. **Perfiles por dispositivo.** Si el usuario tiene varios móviles, cada uno lleva su propio progreso independiente. UI: pastillas tipo "📱 iPhone de Aitor" / "+ Nuevo perfil" arriba del checklist, guardado en `chrome.storage.local` por perfil (sin permisos nuevos).
5. **Contenido colapsado por fases, no todo desplegado.** Con 40+ pasos por guía, un checklist plano sería agobiante. Se agrupan en fases (`<details>` nativo, primera fase abierta por defecto) — mismo patrón que ya usa Health con sus "categorías plegables `<details>` + botón 📂 expand-all" (ver `docs/STATUS.md`, mejoras v0.2.2).
6. **Solo Free por ahora.** Se aparcan las pestañas Pro (Windows avanzado / Linux avanzado) del hub hasta tener varias guías Free bien cerradas — no tiene sentido diseñar el tier de pago antes de validar el gratuito.
7. **Fotos: sí, pero con cuidado.** Se pueden empaquetar como assets locales de la extensión (como ya existe `docs/screenshotsv2/`), nunca remotas — no rompe el modelo de privacidad ni CWS. Pero no en cada paso: el mantenimiento de capturas cuando Apple/Google rediseñan un menú es mayor que el de una ruta de texto tipo breadcrumb. Selectivo, solo en los pasos más difíciles de encontrar.
8. **Cada guía cita su fuente** al pie de cada paso (no se copia contenido de guías ajenas, se redacta con palabras propias apoyándose en fuentes serias).
9. **Mantenimiento de contenido, no de código.** Cada guía lleva una nota con la versión de OS contra la que se revisó (ej. "revisado contra iOS 26"), para saber cuándo toca una pasada de actualización.

## Investigación de fuentes (para basar contenido, no copiar)

Fuentes serias identificadas tras cribar bastante ruido SEO/IA generado:

- **iOS:** [iAnonymous3000/iOS-Hardening-Guide](https://github.com/iAnonymous3000/iOS-Hardening-Guide) (el más completo), [paulaime/iOS-Privacy-Guide](https://github.com/paulaime/iOS-Privacy-Guide), [chrizel/iOS-Security-and-Privacy-Guide](https://github.com/chrizel/iOS-Security-and-Privacy-Guide)
- **Android/GrapheneOS:** [iAnonymous3000/awesome-grapheneos-guide](https://github.com/iAnonymous3000/awesome-grapheneos-guide), [Madaidan's Insecurities](https://madaidans-insecurities.github.io/guides/linux-hardening.html) (también cubre Android)
- **macOS:** [drduh/macOS-Security-and-Privacy-Guide](https://github.com/drduh/macos-security-and-privacy-guide) — EL clásico, referencia obligada
- **Windows (para el futuro tier Pro):** [HotCakeX/Harden-Windows-Security](https://github.com/HotCakeX/Harden-Windows-Security/wiki/Microsoft-Security-Baselines)
- **Linux (para el futuro tier Pro):** [trimstray/the-practical-linux-hardening-guide](https://github.com/trimstray/the-practical-linux-hardening-guide) (~10k★, basado en CIS/STIG)
- **Router:** no hay un "drduh del router" en GitHub — mejor escribirlo desde CIS + buenas prácticas genéricas (WPA3, deshabilitar WPS/UPnP, red de invitados para IoT) que adaptar un repo pequeño.
- **Meta-lista para pestaña "Recursos externos":** [Lissy93/awesome-privacy](https://github.com/Lissy93/awesome-privacy), EFF Surveillance Self-Defense (ssd.eff.org), Privacy Guides (privacyguides.org)
- ⚠️ **Nota:** `iAnonymous3000` es un único autor muy prolífico — buena calidad pero cruzar con Madaidan/drduh/HotCakeX antes de tratarlo como palabra final.

## Boceto interactivo

Archivo: **`docs/mockups/guides-ios-mockup.html`** (HTML+CSS+JS autocontenido, sin dependencias — se puede abrir directo en el navegador).

Contiene:
- **Pantalla 1 — Hub de guías:** tarjetas iOS (completa, 42 pasos), Android (stub, sin construir), Router (stub, sin construir), Recursos externos (enlaces curados). Sin Windows/Linux Pro todavía.
- **Pantalla 2 — Detalle iOS:** checklist interactivo real con:
  - 42 pasos organizados en **7 fases** colapsables: (1) Cuenta y bloqueo, (2) Cifrado y copias, (3) Privacidad del día a día, (4) Permisos por app y sensores, (5) Navegación y mensajería, (6) Salud/pagos/familia, (7) Nivel avanzado.
  - Filtros Todos / 🔒 Seguridad (16) / 🕵 Privacidad (28).
  - Perfiles por dispositivo funcionales (cambia el checklist marcado al cambiar de perfil).
  - Botón "📂 Expandir/Colapsar todo".
  - 2 capturas ilustrativas (SVG dibujado a mano, no captura real de Apple — evita temas de derechos mientras es solo idea) en los pasos `advanced-data-protection` y `frequent-locations`.
  - Cada paso: título, tags, tiempo estimado, por qué importa, ruta de menú tipo breadcrumb, fuente citada.

## Aparcado / pendiente para retomar

- **Android:** aplicar el mismo patrón de las 7 fases con contenido real (pendiente de investigar+redactar, apoyándose en GrapheneOS guide + Madaidan para el usuario avanzado, y documentación oficial de Android para el usuario normal).
- **Router/WiFi:** contenido pendiente de redactar (CIS + buenas prácticas genéricas, no hay un repo GitHub de referencia claro).
- **Windows avanzado / Linux avanzado (Pro):** explícitamente aparcado hasta cerrar varias guías Free.
- **Health y pestaña de Settings:** el usuario mencionó que tiene ideas de mejora aquí, pendiente de compartirlas — la conversación se cortó antes de entrar en esto.
- **Dominio `cotee.app`:** el usuario ya lo tiene comprado, mencionado de pasada por si en el futuro hace falta una web companion (SEO/recursos). No se ha decidido nada, no es prioritario — no hace falta web para el MVP de esta idea (el contenido vive en JSON dentro de la extensión, sin backend).
- **Siguiente paso técnico cuando se pase de boceto a implementación real:** los pasos del mockup tendrían que convertirse en `extension/data/guides/ios.json` (mismo patrón que `baseline.v1.json`), con un motor de render genérico reutilizable para todas las plataformas, y el progreso por perfil guardado en `chrome.storage.local` bajo una clave tipo `guideProgress.ios.profiles[]`. Todavía no se ha escrito código real, todo sigue en fase de boceto/validación de UX.

---

*Última actualización: 2026-08-30. Continúa en `feat/revamp-v3` — próxima sesión: seguir nutriendo Android/Router, o pasar a las ideas de Health/Settings.*
