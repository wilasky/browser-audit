import esbuild from 'esbuild';
import { copyFile, mkdir, cp } from 'node:fs/promises';
import { existsSync } from 'node:fs';

const SRC = 'extension';
const OUT = 'extension/dist';

const entryPoints = [
  `${SRC}/background/index.js`,
  `${SRC}/content/instrumentation.js`,
  `${SRC}/content/bridge.js`,
  `${SRC}/content/compliance-probe.js`,
  `${SRC}/popup/popup.js`,
];

async function copyStatics() {
  await mkdir(`${OUT}/icons`, { recursive: true });
  await mkdir(`${OUT}/data`, { recursive: true });
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
}

const ctx = await esbuild.context({
  entryPoints,
  bundle: true,
  outdir: OUT,
  outbase: SRC,
  format: 'esm',
  target: 'chrome120',
  sourcemap: true,
  logLevel: 'info',
  plugins: [
    {
      name: 'copy-statics',
      setup(build) {
        build.onEnd(async () => {
          await copyStatics().catch(console.error);
        });
      },
    },
  ],
});

await copyStatics();
await ctx.watch();
console.warn('Watching for changes…');
