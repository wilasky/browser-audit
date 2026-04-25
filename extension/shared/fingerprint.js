// Detailed browser fingerprint analysis.
// Returns both a summary entropy score AND per-signal breakdown.
// Runs in popup context (has DOM/WebCrypto access).

// Reference distributions from EFF Cover Your Tracks research data.
// "common" = top 10% of browsers share this value (~low entropy)
// "rare" = unique or near-unique (~high entropy)
const COMMON_SCREENS = new Set([
  '1920x1080', '1366x768', '1536x864', '1280x720', '1440x900',
  '2560x1440', '1280x800', '1600x900', '1024x768', '1920x1200',
]);
const COMMON_LANGS = new Set(['en-US', 'en-GB', 'es-ES', 'es', 'en', 'fr-FR', 'de-DE', 'zh-CN']);
const COMMON_TZS = new Set([
  'America/New_York', 'America/Chicago', 'America/Los_Angeles',
  'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Europe/Madrid',
  'Asia/Tokyo', 'Asia/Shanghai', 'America/Sao_Paulo',
]);

function uniqueness(value, commonSet) {
  return commonSet.has(String(value)) ? 'common' : 'rare';
}

async function canvasFingerprint() {
  try {
    const c = document.createElement('canvas');
    c.width = 200; c.height = 50;
    const ctx = c.getContext('2d');
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#f60'; ctx.fillRect(125, 1, 62, 20);
    ctx.fillStyle = '#069'; ctx.font = '11pt Arial';
    ctx.fillText('Browser Audit \u{1F50D}', 2, 15);
    ctx.fillStyle = 'rgba(102,204,0,0.7)';
    ctx.fillText('Browser Audit \u{1F50D}', 4, 17);
    const data = c.toDataURL();
    // Simple hash of last 60 chars (the unique part)
    const sig = data.slice(-60);
    return { value: sig.slice(0, 16) + '…', raw: sig, unique: true };
  } catch {
    return { value: 'no disponible', raw: null, unique: false };
  }
}

async function webglFingerprint() {
  try {
    const gl = document.createElement('canvas').getContext('webgl');
    if (!gl) { return { vendor: 'n/d', renderer: 'n/d', unique: false }; }
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const vendor = ext ? gl.getParameter(ext.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR);
    const renderer = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
    // Generic renderers (SwiftShader, ANGLE, Mesa) are common
    const isCommon = /swiftshader|angle|mesa|llvmpipe/i.test(renderer);
    return { vendor, renderer, unique: !isCommon };
  } catch {
    return { vendor: 'n/d', renderer: 'n/d', unique: false };
  }
}

async function audioFingerprint() {
  try {
    const ac = new OfflineAudioContext(1, 44100, 44100);
    const osc = ac.createOscillator();
    osc.type = 'triangle'; osc.frequency.value = 10000;
    const comp = ac.createDynamicsCompressor();
    osc.connect(comp); comp.connect(ac.destination); osc.start(0);
    const buf = await ac.startRendering();
    const data = buf.getChannelData(0);
    let sum = 0;
    for (let i = 4500; i < 5000; i++) { sum += Math.abs(data[i]); }
    return { value: sum.toFixed(8), unique: true };
  } catch {
    return { value: 'no disponible', unique: false };
  }
}

function detectFontCount() {
  // Quick check of a subset of fonts via canvas measurement
  const baseFonts = ['monospace', 'sans-serif', 'serif'];
  const testFonts = [
    'Arial', 'Helvetica', 'Times New Roman', 'Courier New', 'Verdana',
    'Georgia', 'Palatino', 'Garamond', 'Comic Sans MS', 'Trebuchet MS',
    'Impact', 'Tahoma', 'Consolas', 'Segoe UI', 'Calibri', 'Cambria',
  ];

  const c = document.createElement('canvas');
  const ctx = c.getContext('2d');
  const testText = 'mmmmmmmmmmlli';
  const testSize = '72px';

  const baseMeasures = {};
  for (const base of baseFonts) {
    ctx.font = `${testSize} ${base}`;
    baseMeasures[base] = ctx.measureText(testText).width;
  }

  let detected = 0;
  for (const font of testFonts) {
    for (const base of baseFonts) {
      ctx.font = `${testSize} '${font}',${base}`;
      if (ctx.measureText(testText).width !== baseMeasures[base]) {
        detected++;
        break;
      }
    }
  }
  return detected;
}

export async function calculateFingerprintEntropy() {
  const detail = await calculateFingerprintDetail();
  return detail.totalEntropy;
}

export async function calculateFingerprintDetail() {
  const ua = navigator.userAgent;
  const uaMatch = ua.match(/Chrome\/[\d.]+/) ? 'Chrome' : 'Otro';
  const osMatch = ua.match(/Windows NT|Mac OS X|Linux|Android|iPhone|iPad/)?.[0] ?? 'Desconocido';

  const screen = `${window.screen.width}x${window.screen.height}`;
  const colorDepth = window.screen.colorDepth;
  const lang = navigator.language;
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const tzOffset = new Date().getTimezoneOffset();
  const cores = navigator.hardwareConcurrency;
  const memory = navigator.deviceMemory; // might be undefined
  const plugins = navigator.plugins?.length ?? 0;
  const touch = navigator.maxTouchPoints > 0;
  const dnt = navigator.doNotTrack === '1';

  const [canvas, webgl, audio] = await Promise.all([
    canvasFingerprint(),
    webglFingerprint(),
    audioFingerprint(),
  ]);

  let fontCount = 0;
  try { fontCount = detectFontCount(); } catch { /* ok */ }

  // Build signal list with entropy estimates
  const signals = [
    {
      id: 'useragent',
      name: 'Navegador / OS',
      value: `${uaMatch} · ${osMatch}`,
      uniqueness: 'common',
      entropyBits: 3.2,
      tip: 'El User-Agent más común es Chrome en Windows — difícil de usar para identificarte individualmente.',
    },
    {
      id: 'language',
      name: 'Idioma',
      value: lang,
      uniqueness: uniqueness(lang, COMMON_LANGS),
      entropyBits: uniqueness(lang, COMMON_LANGS) === 'common' ? 1.5 : 3.8,
      tip: 'Los idiomas comunes (en-US, es-ES) aportan poca entropía. Los idiomas minoritarios son más identificadores.',
    },
    {
      id: 'timezone',
      name: 'Zona horaria',
      value: `${tz} (UTC${tzOffset <= 0 ? '+' : ''}${-tzOffset / 60})`,
      uniqueness: uniqueness(tz, COMMON_TZS),
      entropyBits: uniqueness(tz, COMMON_TZS) === 'common' ? 2.5 : 4.1,
      tip: 'Las zonas horarias comunes (Europe/Madrid, America/New_York) son menos identificadoras.',
    },
    {
      id: 'screen',
      name: 'Resolución de pantalla',
      value: `${screen} · ${colorDepth}bit`,
      uniqueness: uniqueness(screen, COMMON_SCREENS),
      entropyBits: uniqueness(screen, COMMON_SCREENS) === 'common' ? 2.0 : 4.5,
      tip: 'Las resoluciones estándar (1920×1080, 2560×1440) son compartidas por millones de usuarios.',
    },
    {
      id: 'hardware',
      name: 'Hardware (CPU / RAM)',
      value: `${cores} núcleos · ${memory ? memory + ' GB RAM' : 'RAM: n/d'}`,
      uniqueness: cores > 16 || (memory && memory > 16) ? 'rare' : 'common',
      entropyBits: cores > 16 ? 4.2 : 2.1,
      tip: 'Configuraciones de hardware raras (muchos núcleos, mucha RAM) son más fáciles de identificar.',
    },
    {
      id: 'canvas',
      name: 'Canvas fingerprint',
      value: canvas.value,
      uniqueness: canvas.unique ? 'rare' : 'common',
      entropyBits: canvas.unique ? 8.5 : 0.5,
      tip: 'El canvas fingerprint es único para cada combinación GPU + driver + OS + fuentes. Es uno de los identificadores más precisos.',
      highlight: canvas.unique,
    },
    {
      id: 'webgl',
      name: 'GPU (WebGL)',
      value: webgl.renderer?.slice(0, 50) ?? 'n/d',
      uniqueness: webgl.unique ? 'rare' : 'common',
      entropyBits: webgl.unique ? 6.0 : 2.5,
      tip: 'El identificador de GPU es muy específico. Las GPUs genéricas (SwiftShader, ANGLE) son más comunes.',
      highlight: webgl.unique,
    },
    {
      id: 'audio',
      name: 'Audio fingerprint',
      value: audio.value,
      uniqueness: audio.unique ? 'rare' : 'common',
      entropyBits: audio.unique ? 4.5 : 0.5,
      tip: 'El procesado de audio varía entre dispositivos y sistemas operativos, creando un identificador único.',
      highlight: audio.unique,
    },
    {
      id: 'fonts',
      name: 'Fuentes detectadas',
      value: `${fontCount} / 16 fuentes de prueba`,
      uniqueness: fontCount > 10 ? 'rare' : 'common',
      entropyBits: fontCount > 12 ? 3.5 : fontCount > 8 ? 2.0 : 1.0,
      tip: 'Las fuentes instaladas revelan el sistema operativo y el software instalado.',
    },
    {
      id: 'plugins',
      name: 'Plugins del navegador',
      value: `${plugins} plugins`,
      uniqueness: plugins > 3 ? 'rare' : 'common',
      entropyBits: plugins > 3 ? 2.5 : 0.5,
      tip: 'Pocos plugins es lo habitual en Chrome moderno. Más plugins = más identificable.',
    },
    {
      id: 'touch',
      name: 'Pantalla táctil',
      value: touch ? 'Sí' : 'No',
      uniqueness: 'common',
      entropyBits: 1.0,
      tip: 'Combinado con otros factores, indica si usas un portátil táctil, tablet o PC de escritorio.',
    },
    {
      id: 'dnt',
      name: 'Do Not Track',
      value: dnt ? 'Activado' : 'Desactivado',
      uniqueness: dnt ? 'rare' : 'common',
      entropyBits: dnt ? 2.0 : 0.2,
      tip: 'Irónicamente, activar DNT te hace más identificable porque lo usa poca gente.',
    },
  ];

  const totalEntropy = Math.round(signals.reduce((acc, s) => acc + s.entropyBits, 0) * 10) / 10;

  let level, levelText;
  if (totalEntropy < 20) { level = 'green'; levelText = 'Huella común — difícil de rastrearte sin cookies'; }
  else if (totalEntropy < 30) { level = 'amber'; levelText = 'Huella moderada — identificable con algo de esfuerzo'; }
  else { level = 'red'; levelText = 'Huella muy única — rastreable sin cookies'; }

  return { signals, totalEntropy, level, levelText };
}
