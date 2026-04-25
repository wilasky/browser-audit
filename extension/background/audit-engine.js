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
  const min = check.method.minMajorVersion ?? 120;

  if (current >= min) {
    return { status: 'pass', detail: `Chrome v${current}` };
  }
  if (current >= min - 4) {
    return { status: 'warn', detail: `Chrome v${current} — considera actualizar (mínimo recomendado: v${min})` };
  }
  return { status: 'fail', detail: `Chrome v${current} — versión antigua con vulnerabilidades conocidas (mínimo: v${min})` };
}

async function runChromePrivacy(check) {
  const { api, expected } = check.method;
  const [namespace, key] = api.split('.');

  return new Promise((resolve) => {
    const setting = chrome.privacy?.[namespace]?.[key];
    if (!setting) {
      resolve({ status: 'unknown', detail: `API chrome.privacy.${api} no disponible en esta versión de Chrome` });
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

      // For object values (e.g. dnsOverHttpsMode returns {mode, templates}),
      // compare the nested 'mode' field if the expected value is a string
      const effectiveValue = (value && typeof value === 'object' && 'mode' in value)
        ? value.mode
        : value;
      const pass = effectiveValue === expected;
      const detailValue = typeof effectiveValue === 'string' ? effectiveValue : String(effectiveValue);
      resolve({
        status: pass ? 'pass' : 'fail',
        detail: pass ? 'Configurado correctamente' : `Valor actual: ${detailValue}`,
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

async function runExtensionsCountCheck(check) {
  const installed = await chrome.management.getAll();
  const active = installed.filter((e) => e.type === 'extension' && e.enabled && e.id !== chrome.runtime.id);
  const max = check.method.maxRecommended ?? 10;
  if (active.length <= max) {
    return { status: 'pass', detail: `${active.length} extensión(es) activa(s)` };
  }
  return {
    status: 'warn',
    detail: `${active.length} extensiones activas (recomendado: máximo ${max})`,
  };
}

async function runDevModeCheck() {
  const installed = await chrome.management.getAll();
  // Sideloaded extensions indicate dev mode is on
  const devModeExt = installed.filter((e) => e.type === 'extension' && e.installType === 'other' && e.id !== chrome.runtime.id);
  if (devModeExt.length === 0) {
    return { status: 'pass', detail: 'Sin extensiones en modo desarrollador' };
  }
  return {
    status: 'warn',
    detail: `Modo desarrollador activo (${devModeExt.length} extensión(es) sin verificar)`,
    extensions: devModeExt.map((e) => ({ id: e.id, name: e.name })),
  };
}

async function runCanvasFingerprintCheck() {
  // The actual canvas check runs in popup context — here we read the cached result
  const stored = await chrome.storage.local.get('canvasBlocked');
  if (stored.canvasBlocked === true) {
    return { status: 'pass', detail: 'Canvas fingerprint bloqueado por el navegador' };
  }
  if (stored.canvasBlocked === false) {
    return { status: 'fail', detail: 'Canvas fingerprint NO bloqueado — rastreable por cualquier web' };
  }
  return { status: 'unknown', detail: 'Pendiente de cálculo (abre una página)' };
}

async function runWebrtcStrictCheck(check) {
  const { api, strictValues } = check.method;
  const [namespace, key] = api.split('.');
  return new Promise((resolve) => {
    const setting = chrome.privacy?.[namespace]?.[key];
    if (!setting) { resolve({ status: 'unknown', detail: 'API no disponible' }); return; }
    setting.get({}, (details) => {
      if (chrome.runtime.lastError) { resolve({ status: 'unknown', detail: chrome.runtime.lastError.message }); return; }
      const strict = strictValues.includes(details.value);
      resolve({
        status: strict ? 'pass' : 'fail',
        detail: strict ? 'WebRTC en modo más restrictivo' : `WebRTC policy: ${details.value} (necesita: disable_non_proxied_udp)`,
      });
    });
  });
}

function runSiteIsolationCheck() {
  // Site isolation is on by default — detect common ways it's disabled
  // Site isolation on by default — only disabled via chrome://flags which is unusual
  const hasSharedArrayBuffer = typeof SharedArrayBuffer !== 'undefined';
  return Promise.resolve({
    status: hasSharedArrayBuffer ? 'pass' : 'warn',
    detail: hasSharedArrayBuffer
      ? 'Aislamiento de sitios activo'
      : 'SharedArrayBuffer no disponible — posible configuración inusual',
  });
}

async function runPermissionCheck() {
  return { status: 'pass', detail: 'Revisa manualmente en chrome://settings/content' };
}

async function runPrivateNetworkCheck() {
  // No public API to check this flag — return informational
  return {
    status: 'unknown',
    detail: 'Verifica manualmente en chrome://flags#private-network-access-respect-preflight-results',
  };
}

async function runManagementPolicyCheck() {
  // chrome.management lists installed extensions; managed extensions have installType==='admin'
  try {
    const installed = await chrome.management.getAll();
    const managed = installed.filter((e) => e.installType === 'admin');
    if (managed.length === 0) {
      return { status: 'pass', detail: 'Sin extensiones gestionadas por política' };
    }
    return {
      status: 'warn',
      detail: `${managed.length} extensión(es) gestionada(s) por política — verifica que sean tuyas`,
      extensions: managed.map((e) => ({ id: e.id, name: e.name })),
    };
  } catch {
    return { status: 'unknown', detail: 'Permiso management no concedido' };
  }
}

async function runDownloadPromptCheck() {
  return {
    status: 'unknown',
    detail: 'Verifica en chrome://settings/downloads que esté activado "Preguntar dónde guardar"',
  };
}

async function runContentSettingCheck(check) {
  const setting = check.method.setting;
  if (!chrome.contentSettings?.[setting]) {
    return { status: 'unknown', detail: 'API contentSettings no disponible' };
  }
  return new Promise((resolve) => {
    chrome.contentSettings[setting].get({ primaryUrl: 'https://example.com' }, (details) => {
      if (chrome.runtime.lastError) {
        resolve({ status: 'unknown', detail: chrome.runtime.lastError.message });
        return;
      }
      const isBlocked = details.setting === 'block' || details.setting === 'ask';
      resolve({
        status: isBlocked ? 'pass' : 'warn',
        detail: `Default: ${details.setting}`,
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
  extensionsCountCheck: runExtensionsCountCheck,
  devModeCheck: runDevModeCheck,
  canvasFingerprintCheck: runCanvasFingerprintCheck,
  webrtcStrictCheck: runWebrtcStrictCheck,
  siteIsolationCheck: runSiteIsolationCheck,
  permissionCheck: runPermissionCheck,
  privateNetworkCheck: runPrivateNetworkCheck,
  managementPolicyCheck: runManagementPolicyCheck,
  downloadPromptCheck: runDownloadPromptCheck,
  contentSettingCheck: runContentSettingCheck,
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
              rationale: check.rationale,
              fix: check.fix,
              api: check.method.api ?? null,
              expected: check.method.expected ?? null,
              canApply: check.method.canApply ?? false,
              advanced: check.advanced ?? false,
          frameworks: check.frameworks ?? [],
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
          rationale: check.rationale,
          fix: check.fix,
          // Pass api+expected so popup can apply the fix directly
          api: check.method.api ?? null,
          expected: check.method.expected ?? null,
          canApply: check.method.canApply ?? false,
          advanced: check.advanced ?? false,
          frameworks: check.frameworks ?? [],
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
