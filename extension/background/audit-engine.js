import baseline from '../data/baseline.v1.json';

// --- Score calculation ---

export function calculateScore(results) {
  let totalWeight = 0;
  let lostPoints = 0;

  for (const r of results) {
    if (r.status === 'skipped') {continue;}
    totalWeight += r.weight;
    if (r.status === 'fail') {lostPoints += r.weight;}
    if (r.status === 'warn') {lostPoints += r.weight * 0.5;}
  }

  if (totalWeight === 0) {return 100;}
  return Math.max(0, Math.round(100 - (lostPoints / totalWeight) * 100));
}

export function scoreLabel(score) {
  if (score >= 90) {return { label: 'Excelente', level: 'green' };}
  if (score >= 75) {return { label: 'Bueno', level: 'green' };}
  if (score >= 60) {return { label: 'Mejorable', level: 'amber' };}
  if (score >= 40) {return { label: 'Riesgo moderado', level: 'amber' };}
  if (score >= 20) {return { label: 'Riesgo elevado', level: 'red' };}
  return { label: 'Riesgo crítico', level: 'red' };
}

// --- Permission helpers ---

async function hasPermission(perm) {
  return new Promise((resolve) =>
    chrome.permissions.contains({ permissions: [perm] }, resolve)
  );
}

// --- Check handlers ---

async function runUserAgent(check) {
  const ua = navigator.userAgent;
  const m = ua.match(/Chrome\/(\d+)\./);
  if (!m) {return { status: 'unknown', detail: 'No se pudo leer la versión de Chrome' };}

  const current = parseInt(m[1], 10);

  // Fetch latest stable version from Chromium dash
  try {
    const res = await fetch(
      'https://chromiumdash.appspot.com/fetch_releases?channel=Stable&platform=Windows&num=1'
    );
    const data = await res.json();
    const latest = data[0]?.version ? parseInt(data[0].version.split('.')[0], 10) : null;

    if (!latest) {return { status: 'unknown', detail: `Chrome v${current} (no se pudo verificar la última versión)` };}

    const lag = latest - current;
    const allowed = check.method.majorLagAllowed ?? 2;

    if (lag <= 0) {return { status: 'pass', detail: `Chrome v${current} (última versión)` };}
    if (lag <= allowed) {return { status: 'warn', detail: `Chrome v${current} (${lag} versión(es) por detrás)` };}
    return { status: 'fail', detail: `Chrome v${current} (${lag} versiones por detrás — vulnerable)` };
  } catch {
    return { status: 'unknown', detail: `Chrome v${current} (sin conexión para verificar)` };
  }
}

async function runChromePrivacy(check) {
  const { api, expected } = check.method;
  const [namespace, key] = api.split('.');

  return new Promise((resolve) => {
    const setting = chrome.privacy?.[namespace]?.[key];
    if (!setting) {
      resolve({ status: 'unknown', detail: 'API no disponible' });
      return;
    }

    setting.get({}, (details) => {
      if (chrome.runtime.lastError) {
        resolve({ status: 'unknown', detail: chrome.runtime.lastError.message });
        return;
      }

      const value = details.value;
      const levelOfControl = details.levelOfControl;

      // If controlled by policy, report but don't penalize
      if (levelOfControl === 'controlled_by_other_software') {
        resolve({ status: 'warn', detail: 'Controlado por política corporativa' });
        return;
      }

      if (expected === undefined) {
        // Just report the value
        resolve({ status: 'pass', detail: String(value) });
        return;
      }

      const pass = value === expected;
      resolve({
        status: pass ? 'pass' : 'fail',
        detail: pass ? 'Configurado correctamente' : `Valor actual: ${JSON.stringify(value)}`,
      });
    });
  });
}

async function runExtensionsCheck(_check) {
  const installed = await chrome.management.getAll();
  // Blacklist is bundled — in Phase 5 it will be enriched from backend
  const blacklist = { entries: [] };

  const matches = installed.filter((ext) => {
    if (ext.id === chrome.runtime.id) {return false;} // skip ourselves
    const byId = blacklist.entries.some((b) => b.id === ext.id);
    const byName = blacklist.entries.some(
      (b) => b.name.toLowerCase() === ext.name.toLowerCase()
    );
    return byId || byName;
  });

  if (matches.length === 0) {
    return {
      status: 'pass',
      detail: `${installed.length - 1} extensión(es) revisada(s), ninguna en lista negra`,
    };
  }

  return {
    status: 'fail',
    detail: `${matches.length} extensión(es) en lista negra`,
    extensions: matches.map((e) => ({ id: e.id, name: e.name })),
  };
}

async function runExtensionsPermissionsAudit(check) {
  const { flagPermissions, tolerance } = check.method;
  const installed = await chrome.management.getAll();

  const flagged = installed
    .filter((ext) => ext.id !== chrome.runtime.id && ext.type === 'extension' && ext.enabled)
    .map((ext) => {
      const sensitive = (ext.permissions ?? []).filter((p) => flagPermissions.includes(p));
      const sensitiveHosts = (ext.hostPermissions ?? []).filter((p) =>
        flagPermissions.includes(p)
      );
      const all = [...sensitive, ...sensitiveHosts];
      return { name: ext.name, id: ext.id, sensitivePerms: all };
    })
    .filter((e) => e.sensitivePerms.length >= tolerance);

  if (flagged.length === 0) {
    return { status: 'pass', detail: 'Ninguna extensión con permisos excesivos' };
  }

  return {
    status: 'warn',
    detail: `${flagged.length} extensión(es) con ${tolerance}+ permisos sensibles`,
    extensions: flagged,
  };
}

async function runExtensionsSourceCheck() {
  const installed = await chrome.management.getAll();
  const sideloaded = installed.filter(
    (ext) =>
      ext.id !== chrome.runtime.id &&
      ext.type === 'extension' &&
      ext.installType === 'other'
  );

  if (sideloaded.length === 0) {
    return { status: 'pass', detail: 'Todas las extensiones provienen de Chrome Web Store' };
  }

  return {
    status: 'warn',
    detail: `${sideloaded.length} extensión(es) instalada(s) manualmente`,
    extensions: sideloaded.map((e) => ({ id: e.id, name: e.name })),
  };
}

async function runExtensionsMV2Check() {
  const installed = await chrome.management.getAll();
  const mv2 = installed.filter(
    (ext) =>
      ext.id !== chrome.runtime.id &&
      ext.type === 'extension' &&
      ext.manifestVersion === 2
  );

  if (mv2.length === 0) {
    return { status: 'pass', detail: 'Sin extensiones Manifest V2' };
  }

  return {
    status: 'warn',
    detail: `${mv2.length} extensión(es) en Manifest V2 (obsoleto)`,
    extensions: mv2.map((e) => ({ id: e.id, name: e.name })),
  };
}

async function runFingerprintCalculation(check) {
  const { thresholds } = check.method;

  // Basic entropy signals available from background (no DOM access)
  // Full calculation runs in content script context — here we check storage for cached result
  const stored = await chrome.storage.local.get('fingerprintEntropy');
  if (stored.fingerprintEntropy === null || stored.fingerprintEntropy === undefined) {
    return { status: 'unknown', detail: 'Pendiente de cálculo (abre una página web)' };
  }

  const bits = stored.fingerprintEntropy;
  if (bits < thresholds.pass) {
    return { status: 'pass', detail: `${bits.toFixed(1)} bits — navegador común` };
  }
  if (bits < thresholds.warn) {
    return { status: 'warn', detail: `${bits.toFixed(1)} bits — moderadamente único` };
  }
  return { status: 'fail', detail: `${bits.toFixed(1)} bits — altamente identificable` };
}

async function runWebrtcLeakTest(check) {
  const { api, safeValues } = check.method;
  const [namespace, key] = api.split('.');

  return new Promise((resolve) => {
    const setting = chrome.privacy?.[namespace]?.[key];
    if (!setting) {
      resolve({ status: 'unknown', detail: 'API no disponible' });
      return;
    }

    setting.get({}, (details) => {
      if (chrome.runtime.lastError) {
        resolve({ status: 'unknown', detail: chrome.runtime.lastError.message });
        return;
      }

      const value = details.value;
      const safe = safeValues.includes(value);
      resolve({
        status: safe ? 'pass' : 'warn',
        detail: safe ? 'Sin fugas de IP por WebRTC' : `Política WebRTC: ${value}`,
      });
    });
  });
}

// --- Handler dispatch ---

const HANDLERS = {
  userAgent: runUserAgent,
  chromePrivacy: runChromePrivacy,
  extensionsCheck: runExtensionsCheck,
  extensionsPermissionsAudit: runExtensionsPermissionsAudit,
  extensionsSourceCheck: runExtensionsSourceCheck,
  extensionsMV2Check: runExtensionsMV2Check,
  fingerprintCalculation: runFingerprintCalculation,
  webrtcLeakTest: runWebrtcLeakTest,
};

// --- Main audit runner ---

export async function runAudit() {
  const results = await Promise.all(
    baseline.checks.map(async (check) => {
      try {
        // Skip checks that need a permission the user hasn't granted
        if (check.requiresPermission) {
          const granted = await hasPermission(check.requiresPermission);
          if (!granted) {
            return {
              id: check.id,
              category: check.category,
              title: check.title,
              severity: check.severity,
              weight: check.weight,
              status: 'skipped',
              detail: `Requiere permiso "${check.requiresPermission}"`,
            };
          }
        }

        const handler = HANDLERS[check.method.type];
        if (!handler) {
          return {
            id: check.id,
            category: check.category,
            title: check.title,
            severity: check.severity,
            weight: check.weight,
            status: 'unknown',
            detail: `Handler "${check.method.type}" no implementado`,
          };
        }

        const result = await handler(check);
        return {
          id: check.id,
          category: check.category,
          title: check.title,
          severity: check.severity,
          weight: check.weight,
          fix: check.fix,
          ...result,
        };
      } catch (err) {
        return {
          id: check.id,
          category: check.category,
          title: check.title,
          severity: check.severity,
          weight: check.weight,
          status: 'unknown',
          detail: `Error: ${err.message}`,
        };
      }
    })
  );

  const score = calculateScore(results);
  const { label, level } = scoreLabel(score);

  return {
    score,
    label,
    level,
    completedAt: Date.now(),
    baselineVersion: baseline.version,
    results,
    categories: baseline.categories,
  };
}
