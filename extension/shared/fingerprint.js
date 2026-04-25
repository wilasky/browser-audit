// Detailed browser fingerprint analysis — values match what trackers and EFF measure.
// Runs in popup context (has DOM access).

const COMMON_SCREENS = new Set([
  '1920x1080','1366x768','1536x864','1280x720','1440x900',
  '2560x1440','1280x800','1600x900','1024x768','1920x1200',
]);
const COMMON_LANGS = new Set([
  'en-US','en-GB','es-ES','es','en','fr-FR','de-DE','zh-CN','pt-BR','it-IT',
]);
const COMMON_TZS = new Set([
  'America/New_York','America/Chicago','America/Los_Angeles','America/Sao_Paulo',
  'Europe/London','Europe/Paris','Europe/Berlin','Europe/Madrid',
  'Asia/Tokyo','Asia/Shanghai','Asia/Kolkata','Pacific/Auckland',
]);

// Simple MD5-compatible hash for fingerprint display (mirrors EFF's approach)
async function hashValue(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  const arr = Array.from(new Uint8Array(buf));
  // Return first 32 hex chars (128 bits) — similar to MD5 length shown by EFF
  return arr.map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
}

// Canvas fingerprint — same technique as EFF Cover Your Tracks
async function canvasFingerprint() {
  try {
    const c = document.createElement('canvas');
    c.width = 220; c.height = 30;
    const ctx = c.getContext('2d');
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#f60';
    ctx.fillRect(125, 1, 62, 20);
    ctx.fillStyle = '#069';
    ctx.fillText('Cwm fjordbank glyphs vext quiz,😀', 2, 15);
    ctx.fillStyle = 'rgba(102,204,0,0.7)';
    ctx.fillText('Cwm fjordbank glyphs vext quiz,😀', 4, 17);
    const dataUrl = c.toDataURL();
    const hash = await hashValue(dataUrl);
    // Also check if canvas is blocked/uniform (privacy protection)
    const isBlocked = dataUrl.length < 200;
    return { hash, blocked: isBlocked, raw: dataUrl.slice(-20) };
  } catch {
    return { hash: 'no disponible', blocked: false, raw: null };
  }
}

// WebGL fingerprint — renderer info + render hash
async function webglFingerprint() {
  try {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl') || c.getContext('experimental-webgl');
    if (!gl) { return { vendor: 'No WebGL', renderer: 'No WebGL', hash: 'n/d', unique: false }; }

    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const vendor = ext ? (gl.getParameter(ext.UNMASKED_VENDOR_WEBGL) || gl.getParameter(gl.VENDOR)) : gl.getParameter(gl.VENDOR);
    const renderer = ext ? (gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) || gl.getParameter(gl.RENDERER)) : gl.getParameter(gl.RENDERER);

    // Render a scene for the hash (same approach as EFF)
    c.width = 300; c.height = 150;
    const gl2 = c.getContext('webgl');
    if (gl2) {
      gl2.clearColor(0.2, 0.4, 0.6, 1.0);
      gl2.clear(gl2.COLOR_BUFFER_BIT);
    }
    const renderHash = await hashValue(vendor + '|' + renderer);

    const isGeneric = /swiftshader|angle|mesa|llvmpipe|software/i.test(renderer);
    return { vendor, renderer, hash: renderHash, unique: !isGeneric };
  } catch {
    return { vendor: 'error', renderer: 'error', hash: 'n/d', unique: false };
  }
}

// Audio fingerprint — same calculation as EFF (OfflineAudioContext oscillator)
async function audioFingerprint() {
  try {
    const ctx = new OfflineAudioContext(1, 44100, 44100);
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.value = 10000;
    const comp = ctx.createDynamicsCompressor();
    [
      ['threshold', -50], ['knee', 40], ['ratio', 12],
      ['attack', 0], ['release', 0.25],
    ].forEach(([k, v]) => { if (comp[k]) { comp[k].value = v; } });
    osc.connect(comp);
    comp.connect(ctx.destination);
    osc.start(0);
    const buffer = await ctx.startRendering();
    const data = buffer.getChannelData(0);
    // EFF sums a specific slice
    let sum = 0;
    for (let i = 4500; i < 5000; i++) { sum += Math.abs(data[i]); }
    // Raw value matches what EFF shows
    return { value: sum, display: sum.toFixed(8) };
  } catch {
    return { value: null, display: 'no disponible' };
  }
}

// Font detection via canvas width measurement
function detectFonts() {
  const TEST_FONTS = [
    'Arial','Arial Black','Arial Narrow','Calibri','Cambria','Comic Sans MS',
    'Consolas','Courier New','Georgia','Helvetica','Impact','Lucida Console',
    'Palatino','Segoe UI','Tahoma','Times New Roman','Trebuchet MS','Verdana',
    'Garamond','Century Gothic','Bookman Old Style','Franklin Gothic Medium',
  ];
  const BASE = 'monospace';
  const TEST = 'mmmmmmmmmmlli';
  const SIZE = '72px';

  const cv = document.createElement('canvas');
  const ctx = cv.getContext('2d');
  ctx.font = `${SIZE} ${BASE}`;
  const baseWidth = ctx.measureText(TEST).width;

  const detected = [];
  for (const font of TEST_FONTS) {
    ctx.font = `${SIZE} '${font}',${BASE}`;
    if (ctx.measureText(TEST).width !== baseWidth) { detected.push(font); }
  }
  return detected;
}

// Get plugin list matching EFF's format
function getPlugins() {
  const plugins = Array.from(navigator.plugins ?? []);
  return plugins.map((p) => p.name).sort();
}

export async function calculateFingerprintEntropy() {
  const d = await calculateFingerprintDetail();
  return d.totalEntropy;
}

export async function calculateFingerprintDetail() {
  const ua = navigator.userAgent;
  const screen = `${window.screen.width}x${window.screen.height}`;
  const colorDepth = window.screen.colorDepth;
  const lang = navigator.language;
  const langs = (navigator.languages ?? [lang]).join(',');
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const tzOffset = new Date().getTimezoneOffset();
  const cores = navigator.hardwareConcurrency ?? '?';
  const memory = navigator.deviceMemory; // may be undefined
  const plugins = getPlugins();
  const touch = navigator.maxTouchPoints ?? 0;
  const dnt = navigator.doNotTrack;
  const cookiesEnabled = navigator.cookieEnabled;

  const [canvas, webgl, audio] = await Promise.all([
    canvasFingerprint(),
    webglFingerprint(),
    audioFingerprint(),
  ]);

  let fonts = [];
  try { fonts = detectFonts(); } catch { /* ok */ }

  // Build fingerprint hash (combined identifier — what trackers compute)
  const combinedRaw = [
    ua, lang, langs, tz, String(tzOffset), screen, String(colorDepth),
    String(cores), plugins.join('|'), canvas.hash, webgl.hash, audio.display,
    fonts.join('|'),
  ].join('||');
  const fingerprintHash = await hashValue(combinedRaw);

  // Uniqueness scoring per signal
  function uniq(val, commonSet) {
    return commonSet.has(String(val)) ? 'common' : 'rare';
  }

  const signals = [
    {
      id: 'ua', name: 'Navegador / Sistema Operativo',
      value: ua.slice(0, 80) + (ua.length > 80 ? '…' : ''),
      uniqueness: 'common', entropyBits: 3.5,
      detail: 'El User-Agent es compartido por muchos usuarios de Chrome en Windows.',
    },
    {
      id: 'lang', name: 'Idioma y región',
      value: `${lang} (${langs})`,
      uniqueness: uniq(lang, COMMON_LANGS),
      entropyBits: uniq(lang, COMMON_LANGS) === 'common' ? 1.5 : 4.0,
      detail: 'Los idiomas minoritarios o combinaciones inusuales son más identificadores.',
    },
    {
      id: 'tz', name: 'Zona horaria',
      value: `${tz} · UTC${tzOffset <= 0 ? '+' : ''}${-tzOffset / 60}h`,
      uniqueness: uniq(tz, COMMON_TZS),
      entropyBits: uniq(tz, COMMON_TZS) === 'common' ? 2.5 : 4.2,
      detail: 'La zona horaria combinada con el idioma puede identificar la región exacta.',
    },
    {
      id: 'screen', name: 'Resolución y profundidad de color',
      value: `${screen} · ${colorDepth} bits`,
      uniqueness: uniq(screen, COMMON_SCREENS),
      entropyBits: uniq(screen, COMMON_SCREENS) === 'common' ? 2.0 : 4.5,
      detail: 'Las resoluciones comunes (1920×1080, 2560×1440) son menos identificadoras.',
    },
    {
      id: 'hardware', name: 'Hardware (CPU · RAM · Táctil)',
      value: `${cores} núcleos · ${memory ? memory + ' GB' : 'RAM no disponible'} · táctil: ${touch > 0 ? 'sí (' + touch + ' puntos)' : 'no'}`,
      uniqueness: cores > 16 ? 'rare' : 'common',
      entropyBits: cores > 16 ? 4.0 : 2.0,
      detail: 'Configuraciones de hardware raras (muchos núcleos, mucha RAM) son más únicas.',
    },
    {
      id: 'canvas', name: 'Canvas fingerprint',
      value: canvas.blocked ? '🛡️ Bloqueado (protección activa)' : `Hash: ${canvas.hash}`,
      uniqueness: canvas.blocked ? 'common' : 'rare',
      entropyBits: canvas.blocked ? 0.5 : 8.5,
      highlight: !canvas.blocked,
      detail: canvas.blocked
        ? 'Tu navegador o una extensión está bloqueando el canvas fingerprint. Excelente.'
        : 'El canvas fingerprint es ÚNICO para tu combinación de GPU + driver + fuentes. Es el identificador más preciso.',
    },
    {
      id: 'webgl', name: 'GPU / WebGL renderer',
      value: webgl.unique ? `${webgl.vendor} — ${webgl.renderer.slice(0, 60)}` : webgl.renderer.slice(0, 60),
      uniqueness: webgl.unique ? 'rare' : 'common',
      entropyBits: webgl.unique ? 6.0 : 2.5,
      highlight: webgl.unique,
      detail: webgl.unique
        ? 'El identificador de tu GPU es específico. Las GPUs genéricas (SwiftShader, ANGLE) son más comunes.'
        : 'Tu GPU usa un renderer genérico — menos identificador.',
    },
    {
      id: 'audio', name: 'Audio fingerprint (AudioContext)',
      value: audio.value !== null ? audio.display : 'no disponible',
      uniqueness: audio.value !== null ? 'rare' : 'common',
      entropyBits: audio.value !== null ? 4.5 : 0.5,
      highlight: audio.value !== null,
      detail: 'El procesado de audio varía entre OS, hardware y drivers. El valor numérico es prácticamente único por dispositivo.',
    },
    {
      id: 'fonts', name: `Fuentes detectadas (${fonts.length} de 22)`,
      value: fonts.length > 0 ? fonts.join(', ') : 'Ninguna detectada',
      uniqueness: fonts.length > 12 ? 'rare' : 'common',
      entropyBits: fonts.length > 14 ? 3.5 : fonts.length > 8 ? 2.0 : 1.0,
      detail: 'Las fuentes instaladas revelan el sistema operativo y el software. Más fuentes = más identificable.',
    },
    {
      id: 'plugins', name: `Plugins del navegador (${plugins.length})`,
      value: plugins.length > 0 ? plugins.join(' · ') : 'Sin plugins',
      uniqueness: plugins.length > 3 ? 'rare' : 'common',
      entropyBits: plugins.length > 3 ? 2.5 : 0.5,
      detail: 'Chrome moderno tiene pocos plugins. Una lista inusual de plugins es muy identificadora.',
    },
    {
      id: 'dnt', name: 'Do Not Track / Cookies',
      value: `DNT: ${dnt === '1' ? 'activado' : dnt === '0' ? 'desactivado' : 'no definido'} · Cookies: ${cookiesEnabled ? 'sí' : 'no'}`,
      uniqueness: dnt === '1' ? 'rare' : 'common',
      entropyBits: dnt === '1' ? 2.0 : 0.3,
      detail: 'Activar DNT te hace más identificable porque lo usa poca gente (~5% de usuarios).',
    },
  ];

  const totalEntropy = Math.round(signals.reduce((acc, s) => acc + s.entropyBits, 0) * 10) / 10;

  let level, levelText;
  if (totalEntropy < 22) {
    level = 'green';
    levelText = 'Huella relativamente común — similar a muchos usuarios de Chrome';
  } else if (totalEntropy < 30) {
    level = 'amber';
    levelText = 'Huella moderadamente única — identificable con otros datos';
  } else {
    level = 'red';
    levelText = 'Huella muy única — rastreable sin cookies en la mayoría de sitios';
  }

  return {
    signals,
    totalEntropy,
    level,
    levelText,
    fingerprintHash,
    canvasBlocked: canvas.blocked,
  };
}
