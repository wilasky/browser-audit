# Post-mortem · Rechazo CWS v0.1.0 (Blue Argon)

**Fecha rechazo:** 2026-04-26 · **Fecha fix:** 2026-04-28 · **Versión arreglada:** 0.2.0

## Mensaje literal de Google

> ID del elemento: `gaeakblaejmchannjngonjnmbnaeoaao`
> ID de referencia de la infracción: **Blue Argon**
> Infracción: incluir código alojado de forma remota en un elemento de Manifest V3.
> Contenido infractor — Fragmento de código: `popup/popup.js`:
> `"https://cdnjs.cloudflare.com/ajax/libs/pdfobject/2.1.1/pdfobject.min.js"`

## Causa raíz

La cadena no estaba en `extension/popup/popup.js` (114 líneas, source). Estaba en el
**bundle generado por esbuild** (`extension/dist/popup/popup.js`, ~950 KB), que incluye la
librería `jspdf` completa.

`jspdf` define un modo de salida `output('pdfobjectnewwindow')` que internamente hace:

```js
var url = "https://cdnjs.cloudflare.com/ajax/libs/pdfobject/2.1.1/pdfobject.min.js";
var script = document.createElement("script");
script.src = url;
script.integrity = "sha512-...";
document.body.appendChild(script);
```

La extensión **nunca** invoca ese modo (`extension/popup/export.js` solo llama a
`doc.save()`). Pero el reviewer estático de CWS escanea el bundle, encuentra la URL +
patrón de inyección, y rechaza por Blue Argon.

## Diagnóstico equivocado inicial

Una primera lectura asumió que había que sustituir PDFObject por una copia local. Eso
era incorrecto: la extensión **no usa PDFObject**. La rama es código muerto introducido
por una dependencia transitiva.

## Fix aplicado

`scripts/strip-remote-code.js` ejecuta un reemplazo determinista tras el bundle:

| De | A |
|---|---|
| `"https://cdnjs.cloudflare.com/ajax/libs/pdfobject/2.1.1/pdfobject.min.js"` | `""` |
| `"sha512-4ze/a9/4jqu+tX9dfOqJYSvyYd5M6qum/3HpCLr+/Jqf0whc37VUbkpNGHR7/8pSnCFw47T1fmIpwBV7UySh3g=="` | `""` |

- Integrado en `scripts/build.js` y `scripts/dev.js` para que dev y prod produzcan
  binarios idénticos en este punto.
- Aborta el build si tras el patch queda cualquier `cdnjs|jsdelivr|unpkg` literal.
- Si jspdf cambia y rompe el patch, el build falla con mensaje claro.

La rama queda inerte: aunque alguien llamara `output('pdfobjectnewwindow')`, `script.src
= ""` no carga nada.

## Lo que NO se cambió

- `manifest.json` (permisos, CSP) — sin relación con Blue Argon.
- Dependencias del proyecto — no se añadió ni quitó nada de `package.json`.
- No se empaquetó PDFObject local — no se usa.

## Checklist de resubida

- [x] Versión bumpeada `0.1.0` → `0.2.0` en `manifest.json` y `package.json`.
- [x] `npm run lint` limpio.
- [x] `npm test` 28/28 pasan.
- [x] `npm run package` → `browser-audit-2026-04-28.zip`.
- [x] `grep cdnjs|jsdelivr|unpkg` sobre el ZIP: solo restos inertes (`"pdfobjectnewwindow"`
      como case label y mensaje de error — no son URLs cargables).
- [ ] Smoke test manual en `chrome://extensions/` (cargar dist/, exportar PDF).
- [ ] Subir ZIP al CWS, rellenar release notes, submit.

## Lección

Cuando CWS cita un fragmento concreto de tu bundle, no asumas que es código tuyo.
Comprueba primero si proviene de una dependencia. El `grep` sobre `extension/` source no
encontraba nada — confundió el diagnóstico hasta que se revisó el ZIP empaquetado.

**Mejora preventiva:** el script `strip-remote-code.js` actúa como red de seguridad
permanente. Si una futura dependencia introduce otra carga remota, el grep posterior
abortará el build antes de empaquetar.
