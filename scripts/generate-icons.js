import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = crc & 1 ? (0xedb88320 ^ (crc >>> 1)) : crc >>> 1;
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const buf = Buffer.alloc(12 + data.length);
  buf.writeUInt32BE(data.length, 0);
  buf.write(type, 4, 'ascii');
  data.copy(buf, 8);
  buf.writeUInt32BE(crc32(Buffer.concat([Buffer.from(type, 'ascii'), data])), 8 + data.length);
  return buf;
}

function createPNG(size) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // RGB

  // Dark background (#0f0f11) with a simple "B" shape suggestion
  const rowSize = 1 + size * 3;
  const raw = Buffer.alloc(size * rowSize);

  for (let y = 0; y < size; y++) {
    raw[y * rowSize] = 0; // filter: none
    for (let x = 0; x < size; x++) {
      const i = y * rowSize + 1 + x * 3;
      const cx = size / 2;
      const cy = size / 2;
      const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
      const r = size * 0.45;
      const inner = size * 0.28;

      if (dist <= r && dist >= inner) {
        // Ring — accent color #4f8ef7
        raw[i] = 0x4f;
        raw[i + 1] = 0x8e;
        raw[i + 2] = 0xf7;
      } else if (dist < inner) {
        // Inner — slightly lighter background
        raw[i] = 0x1a;
        raw[i + 1] = 0x1a;
        raw[i + 2] = 0x1e;
      } else {
        // Outer — dark bg
        raw[i] = 0x0f;
        raw[i + 1] = 0x0f;
        raw[i + 2] = 0x11;
      }
    }
  }

  const compressed = deflateSync(raw);

  return Buffer.concat([sig, makeChunk('IHDR', ihdr), makeChunk('IDAT', compressed), makeChunk('IEND', Buffer.alloc(0))]);
}

const outDir = join('extension', 'icons');
mkdirSync(outDir, { recursive: true });

for (const size of [16, 48, 128]) {
  const png = createPNG(size);
  writeFileSync(join(outDir, `icon${size}.png`), png);
  console.warn(`icon${size}.png — ${png.length} bytes`);
}

console.warn('Icons generated in extension/icons/');
