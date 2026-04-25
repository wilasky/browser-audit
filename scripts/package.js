import { createWriteStream } from 'node:fs';
import { readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { createGzip } from 'node:zlib';

const SRC = 'extension/dist';
const OUT_FILE = `browser-audit-${new Date().toISOString().slice(0, 10)}.zip`;

async function* walk(dir) {
  for (const entry of await readdir(dir)) {
    const full = join(dir, entry);
    const s = await stat(full);
    if (s.isDirectory()) {
      yield* walk(full);
    } else {
      yield full;
    }
  }
}

async function pkg() {
  const { default: archiver } = await import('archiver').catch(() => {
    throw new Error('Run: npm install --save-dev archiver');
  });

  const output = createWriteStream(OUT_FILE);
  const archive = archiver('zip', { zlib: { level: 9 } });

  await new Promise((resolve, reject) => {
    output.on('close', resolve);
    archive.on('error', reject);
    archive.pipe(output);
    archive.directory(SRC, false);
    archive.finalize();
  });

  console.warn('Package created:', OUT_FILE, `(${archive.pointer()} bytes)`);
}

pkg().catch((err) => {
  console.error(err);
  process.exit(1);
});
