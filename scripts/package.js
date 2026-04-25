import { createWriteStream } from 'node:fs';
import { execSync } from 'node:child_process';

const SRC = 'extension/dist';
const OUT_FILE = `browser-audit-${new Date().toISOString().slice(0, 10)}.zip`;

async function pkg() {
  // Production build (minified, no sourcemaps) before packaging
  console.warn('Running production build…');
  execSync('node scripts/build.js', { stdio: 'inherit', env: { ...process.env, NODE_ENV: 'production' } });

  const { default: archiver } = await import('archiver').catch(() => {
    throw new Error('Run: npm install --save-dev archiver');
  });

  const output = createWriteStream(OUT_FILE);
  const archive = archiver('zip', { zlib: { level: 9 } });

  await new Promise((resolve, reject) => {
    output.on('close', resolve);
    archive.on('error', reject);
    archive.pipe(output);
    // Exclude sourcemaps from production zip (CWS doesn't need them)
    archive.glob('**/*', { cwd: SRC, ignore: ['**/*.map'] });
    archive.finalize();
  });

  console.warn('Package created:', OUT_FILE, `(${archive.pointer()} bytes)`);
  console.warn('Ready to upload to https://chrome.google.com/webstore/devconsole');
}

pkg().catch((err) => {
  console.error(err);
  process.exit(1);
});
