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

// Coverage of a rounded square at (cx, cy) with half-size hs and corner radius cr
function roundedSquareCoverage(x, y, cx, cy, hs, cr) {
  const dx = Math.abs(x - cx) - (hs - cr);
  const dy = Math.abs(y - cy) - (hs - cr);
  if (dx <= 0 && dy <= 0) { return 1; }
  if (dx > 0 && dy > 0) {
    // Corner — circle of radius cr
    return circleCoverage(dx + cr, dy + cr, cr, cr, cr);
  }
  // Edge zone
  const edge = Math.max(dx, dy);
  if (edge < -0.5) { return 1; }
  if (edge > 0.5) { return 0; }
  return 0.5 - edge;
}

// --- Render an icon at the given size ---
function renderIcon(size) {
  const cx = size / 2;
  const cy = size / 2;
  const half = size / 2;

  // Geometry — relative to size
  const cornerR     = size * 0.22;
  const ringOuter   = size * 0.40;
  const ringInner   = size * 0.31;
  const innerCircle = size * 0.27;
  const okOuter     = size * 0.18;
  const okInner     = size * 0.08;

  // Image data: rgb per pixel
  const data = Buffer.alloc(size * size * 3);

  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      // 1. Start with rounded-square background gradient (bgOuter at edges → bgInner at center)
      const bgCov = roundedSquareCoverage(px, py, cx, cy, half - 0.5, cornerR);
      // Radial gradient inside the square
      const radial = Math.min(1, Math.hypot(px - cx, py - cy) / half);
      let color = mix(C.bgOuter, C.bgInner, 1 - radial * 0.7);

      // Outside the rounded square: transparent black (we encode RGB only, so use bgOuter)
      if (bgCov < 1) {
        color = mix(color, [0, 0, 0], bgCov);
      }

      // 2. Inner darker disc (gives depth)
      const discCov = circleCoverage(px, py, cx, cy, innerCircle);
      if (discCov > 0) {
        color = mix([0x0a, 0x0d, 0x16], color, discCov);
      }

      // 3. Outer track ring (subtle, full circle)
      const trackCov = ringCoverage(px, py, cx, cy, ringInner, ringOuter);
      if (trackCov > 0) {
        color = mix(C.ringBg, color, trackCov);
      }

      // 4. Score arc (~78% of circle) — starts at top, sweeps clockwise
      // Math.atan2 has 0 = right, π/2 = bottom. We want top = -π/2.
      const arcStart = -Math.PI / 2 - 0.05;
      const arcEnd   = arcStart + (2 * Math.PI * 0.78);
      const arcCov = arcCoverage(px, py, cx, cy, ringInner, ringOuter, arcStart, arcEnd);
      if (arcCov > 0) {
        // Gradient along the arc — accent at start, slightly dimmer at end
        const angle = Math.atan2(py - cy, px - cx);
        const norm = ((angle - arcStart) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
        const t = Math.min(1, norm / (arcEnd - arcStart));
        const arcColor = mix(C.accent, C.accentLo, 1 - t * 0.45);
        color = mix(arcColor, color, arcCov);
      }

      // 5. Center "OK" indicator — small green dot ring
      const okCov = ringCoverage(px, py, cx, cy, okInner, okOuter);
      if (okCov > 0) {
        color = mix(C.ok, color, okCov);
      }

      // 6. Inner highlight (top-left quadrant subtle glow)
      const dxh = px - cx * 0.7;
      const dyh = py - cy * 0.7;
      const hd = Math.hypot(dxh, dyh);
      if (hd < size * 0.15) {
        const intensity = (1 - hd / (size * 0.15)) * 0.08;
        color = mix(C.highlight, color, intensity);
      }

      const i = (py * size + px) * 3;
      data[i] = color[0];
      data[i + 1] = color[1];
      data[i + 2] = color[2];
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

function encodePNG(rgbData, size) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 2;  // color type RGB

  // Apply filter type 0 (none) per scanline
  const rowSize = 1 + size * 3;
  const filtered = Buffer.alloc(size * rowSize);
  for (let y = 0; y < size; y++) {
    filtered[y * rowSize] = 0;
    rgbData.copy(filtered, y * rowSize + 1, y * size * 3, (y + 1) * size * 3);
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
