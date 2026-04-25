import esbuild from 'esbuild';
import { copyFile, mkdir, cp } from 'node:fs/promises';
import { existsSync } from 'node:fs';

const SRC = 'extension';
const OUT = 'extension/dist';

const entryPoints = [
  `${SRC}/background/index.js`,
  `${SRC}/content/instrumentation.js`,
  `${SRC}/content/bridge.js`,
  `${SRC}/popup/popup.js`,
];

async function build() {
  await mkdir(OUT, { recursive: true });
  await mkdir(`${OUT}/background`, { recursive: true });
  await mkdir(`${OUT}/content`, { recursive: true });
  await mkdir(`${OUT}/popup`, { recursive: true });
  await mkdir(`${OUT}/icons`, { recursive: true });
  await mkdir(`${OUT}/data`, { recursive: true });
  await mkdir(`${OUT}/shared`, { recursive: true });

  await esbuild.build({
    entryPoints,
    bundle: true,
    outdir: OUT,
    outbase: SRC,
    format: 'esm',
    target: 'chrome120',
    sourcemap: process.env.NODE_ENV !== 'production',
    minify: process.env.NODE_ENV === 'production',
    logLevel: 'info',
  });

  await copyFile(`${SRC}/manifest.json`, `${OUT}/manifest.json`);
  await copyFile(`${SRC}/popup/popup.html`, `${OUT}/popup/popup.html`);

  if (existsSync(`${SRC}/popup/popup.css`)) {
    await copyFile(`${SRC}/popup/popup.css`, `${OUT}/popup/popup.css`);
  }
  if (existsSync(`${SRC}/data`)) {
    await cp(`${SRC}/data`, `${OUT}/data`, { recursive: true });
  }
  if (existsSync(`${SRC}/icons`)) {
    await cp(`${SRC}/icons`, `${OUT}/icons`, { recursive: true });
  }

  console.warn('Build complete →', OUT);
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
});
