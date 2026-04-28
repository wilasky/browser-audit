import { readFile, writeFile } from 'node:fs/promises';

// CWS Manifest V3 prohíbe Remotely Hosted Code. El bundle de jspdf incluye una
// rama `output('pdfobjectnewwindow')` que carga PDFObject desde cdnjs vía
// `<script src=...>`. La app NUNCA llama a esa rama (solo usa `doc.save()`),
// pero el reviewer estático de CWS detecta la URL en el bundle y rechaza
// (ID de infracción: Blue Argon).
//
// Solución: tras el bundle, neutralizamos la URL y la integrity. La rama queda
// inerte (script.src = "") sin riesgo para el flujo real.

const TARGETS = [
  {
    file: 'extension/dist/popup/popup.js',
    replacements: [
      {
        from: '"https://cdnjs.cloudflare.com/ajax/libs/pdfobject/2.1.1/pdfobject.min.js"',
        to: '""',
        required: true,
      },
      {
        from: '"sha512-4ze/a9/4jqu+tX9dfOqJYSvyYd5M6qum/3HpCLr+/Jqf0whc37VUbkpNGHR7/8pSnCFw47T1fmIpwBV7UySh3g=="',
        to: '""',
        required: true,
      },
    ],
  },
];

const FORBIDDEN_PATTERNS = [
  /["']https?:\/\/cdnjs\.cloudflare\.com/,
  /["']https?:\/\/(www\.)?jsdelivr\.net/,
  /["']https?:\/\/(www\.)?unpkg\.com/,
];

export async function stripRemoteCode() {
  let totalReplacements = 0;

  for (const target of TARGETS) {
    let content;
    try {
      content = await readFile(target.file, 'utf8');
    } catch (err) {
      if (target.replacements.some((r) => r.required)) { throw err; }
      continue;
    }

    for (const { from, to, required } of target.replacements) {
      if (content.includes(from)) {
        content = content.split(from).join(to);
        totalReplacements++;
      } else if (required) {
        throw new Error(
          `[strip-remote-code] Cadena requerida no encontrada en ${target.file}:\n  ${from.slice(0, 80)}…\n` +
          `Si jspdf cambió, actualiza scripts/strip-remote-code.js.`
        );
      }
    }

    for (const pattern of FORBIDDEN_PATTERNS) {
      const match = content.match(pattern);
      if (match) {
        throw new Error(
          `[strip-remote-code] CDN remoto residual en ${target.file}: ${match[0]}\n` +
          `CWS rechazará el paquete por Remotely Hosted Code.`
        );
      }
    }

    await writeFile(target.file, content);
  }

  console.warn(`[strip-remote-code] Aplicado · ${totalReplacements} reemplazo(s)`);
}

if (import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}`) {
  stripRemoteCode().catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}
