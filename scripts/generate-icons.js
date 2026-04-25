// Professional icon generation for Browser Audit.
// Renders an anti-aliased multi-layer "score shield" using only Node.js built-ins.
//
// Design:
//   - Dark gradient background (deep navy → near-black) on a rounded square
//   - Outer ring: bright accent blue (the brand color)
//   - Inner accent arc: green checkmark representing "audit OK"
//   - Subtle inner highlight for depth
//
// The result is a clean, modern icon recognizable at all three CWS sizes.

import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

// --- Color palette (RGB tuples) ---
const C = {
  bgOuter:  [0x07, 0x0a, 0x12],
  bgInner:  [0x12, 0x16, 0x22],
  ringBg:   [0x1f, 0x26, 0x36],
  accent:   [0x4f, 0x8e, 0xf7],
  accentLo: [0x2c, 0x5a, 0xa8],
  ok:       [0x22, 0xc5, 0x5e],
  highlight:[0x2a, 0x3a, 0x55],
};

// --- Pixel helpers ---
function mix(c1, c2, alpha) {
  return [
    Math.round(c1[0] * alpha + c2[0] * (1 - alpha)),
    Math.round(c1[1] * alpha + c2[1] * (1 - alpha)),
    Math.round(c1[2] * alpha + c2[2] * (1 - alpha)),
  ];
}

// Anti-aliased coverage of a pixel by a circle (1.0 inside, 0.0 outside, fractional on edge)
function circleCoverage(x, y, cx, cy, r) {
  const d = Math.hypot(x - cx, y - cy);
  if (d < r - 0.5) { return 1; }
  if (d > r + 0.5) { return 0; }
  return r + 0.5 - d;
}

// Coverage of an annulus (ring between rInner and rOuter)
function ringCoverage(x, y, cx, cy, rInner, rOuter) {
  const outer = circleCoverage(x, y, cx, cy, rOuter);
  const inner = circleCoverage(x, y, cx, cy, rInner);
  return Math.max(0, outer - inner);
}

// Coverage of an arc segment between two angles (rad)
function arcCoverage(x, y, cx, cy, rInner, rOuter, startAngle, endAngle) {
  const ringCov = ringCoverage(x, y, cx, cy, rInner, rOuter);
  if (ringCov === 0) { return 0; }
  let angle = Math.atan2(y - cy, x - cx);
  // Normalize to [0, 2π]
  if (angle < 0) { angle += 2 * Math.PI; }
  let s = startAngle; let e = endAngle;
  if (s < 0) { s += 2 * Math.PI; }
  if (e < 0) { e += 2 * Math.PI; }
  if (s <= e) {
    if (angle < s || angle > e) { return 0; }
  } else {
    // Arc wraps around 2π
    if (angle < s && angle > e) { return 0; }
  }
  return ringCov;
}

// --- Render an icon at the given size (RGBA with alpha — circular) ---
function renderIcon(size) {
  const cx = size / 2;
  const cy = size / 2;

  // Geometry — relative to size
  const discRadius  = size * 0.48;       // outer circle (the badge)
  const ringOuter   = size * 0.40;
  const ringInner   = size * 0.31;
  const innerCircle = size * 0.27;
  const okOuter     = size * 0.18;
  const okInner     = size * 0.08;

  // Image data: RGBA per pixel
  const data = Buffer.alloc(size * size * 4);

  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      // Start fully transparent
      let r = 0, g = 0, b = 0, a = 0;

      // 1. Outer disc (the badge background, with anti-aliased edges)
      const discCov = circleCoverage(px, py, cx, cy, discRadius);
      if (discCov > 0) {
        const radial = Math.min(1, Math.hypot(px - cx, py - cy) / discRadius);
        const bg = mix(C.bgOuter, C.bgInner, 1 - radial * 0.7);
        r = bg[0]; g = bg[1]; b = bg[2];
        a = Math.round(discCov * 255);
      }

      // 2. Inner darker disc (depth)
      const innerCov = circleCoverage(px, py, cx, cy, innerCircle);
      if (innerCov > 0) {
        const blended = mix([0x0a, 0x0d, 0x16], [r, g, b], innerCov);
        r = blended[0]; g = blended[1]; b = blended[2];
      }

      // 3. Outer track ring
      const trackCov = ringCoverage(px, py, cx, cy, ringInner, ringOuter);
      if (trackCov > 0) {
        const blended = mix(C.ringBg, [r, g, b], trackCov);
        r = blended[0]; g = blended[1]; b = blended[2];
      }

      // 4. Score arc (~78% of circle)
      const arcStart = -Math.PI / 2 - 0.05;
      const arcEnd   = arcStart + (2 * Math.PI * 0.78);
      const arcCov = arcCoverage(px, py, cx, cy, ringInner, ringOuter, arcStart, arcEnd);
      if (arcCov > 0) {
        const angle = Math.atan2(py - cy, px - cx);
        const norm = ((angle - arcStart) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
        const t = Math.min(1, norm / (arcEnd - arcStart));
        const arcColor = mix(C.accent, C.accentLo, 1 - t * 0.45);
        const blended = mix(arcColor, [r, g, b], arcCov);
        r = blended[0]; g = blended[1]; b = blended[2];
      }

      // 5. Center OK ring
      const okCov = ringCoverage(px, py, cx, cy, okInner, okOuter);
      if (okCov > 0) {
        const blended = mix(C.ok, [r, g, b], okCov);
        r = blended[0]; g = blended[1]; b = blended[2];
      }

      const i = (py * size + px) * 4;
      data[i] = r; data[i + 1] = g; data[i + 2] = b; data[i + 3] = a;
    }
  }

  return data;
}

// --- PNG encoding (minimal, RGB) ---
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
  buf.writeUInt32BE(
    crc32(Buffer.concat([Buffer.from(type, 'ascii'), data])),
    8 + data.length
  );
  return buf;
}

function encodePNG(rgbaData, size) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // color type RGBA (with alpha)

  const rowSize = 1 + size * 4;
  const filtered = Buffer.alloc(size * rowSize);
  for (let y = 0; y < size; y++) {
    filtered[y * rowSize] = 0;
    rgbaData.copy(filtered, y * rowSize + 1, y * size * 4, (y + 1) * size * 4);
  }

  const compressed = deflateSync(filtered);

  return Buffer.concat([
    sig,
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', compressed),
    makeChunk('IEND', Buffer.alloc(0)),
  ]);
}

// --- Main ---
const outDir = join('extension', 'icons');
mkdirSync(outDir, { recursive: true });

for (const size of [16, 48, 128]) {
  const rgb = renderIcon(size);
  const png = encodePNG(rgb, size);
  writeFileSync(join(outDir, `icon${size}.png`), png);
  console.warn(`icon${size}.png — ${png.length} bytes`);
}

console.warn('Icons generated in extension/icons/');
