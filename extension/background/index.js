import { runAudit } from './audit-engine.js';
import { ingestEvent, getAggregatedData, resetTab, enrichWithThreatIntel } from './event-aggregator.js';
import { getPlanState, devTogglePro, resetPlan } from './plan-manager.js';

const AUDIT_INTERVAL_MS = 24 * 60 * 60 * 1000;

async function doAudit() {
  try {
    const audit = await runAudit();
    await chrome.storage.local.set({ lastAudit: audit });

    // Keep rolling history of last 10 audits
    const { auditHistory = [] } = await chrome.storage.local.get('auditHistory');
    const snapshot = { score: audit.score, label: audit.label, level: audit.level, completedAt: audit.completedAt };
    const updated = [snapshot, ...auditHistory].slice(0, 10);
    await chrome.storage.local.set({ auditHistory: updated });

    return audit;
  } catch (err) {
    console.error('[BrowserAudit] Audit failed:', err);
  }
}

async function injectScriptSpy(tabId) {
  // Validate tab exists and is injectable before attempting
  let tab = null;
  try {
    tab = await chrome.tabs.get(tabId);
  } catch {
    return { ok: false, reason: 'La pestaña ya no existe.' };
  }

  const url = tab.url ?? '';
  if (!url || url.startsWith('chrome://') || url.startsWith('chrome-extension://') || url.startsWith('about:')) {
    return { ok: false, reason: 'ScriptSpy solo funciona en páginas web (http/https).' };
  }

  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['content/instrumentation.js'],
      world: 'MAIN',
    });
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['content/bridge.js'],
      world: 'ISOLATED',
    });
    return { ok: true };
  } catch (err) {
    console.error('[BrowserAudit] Injection failed:', err.message);
    return { ok: false, reason: `Error al inyectar: ${err.message}` };
  }
}

// --- Lifecycle ---

// Re-apply persisted privacy fixes — Chrome can lose extension ownership
// when the SW goes idle. This restores the user's intended hardening.
async function reapplyPersistedFixes() {
  const stored = await chrome.storage.local.get('appliedFixes');
  const applied = (stored.appliedFixes ?? []).filter((a) =>
    typeof a === 'object' && a.api && a.value !== undefined && a.value !== null
  );

  for (const fix of applied) {
    const [namespace, key] = fix.api.split('.');
    const setting = chrome.privacy?.[namespace]?.[key];
    if (!setting) { continue; }
    try {
      await new Promise((resolve) => {
        setting.set({ value: fix.value }, () => {
          void chrome.runtime.lastError;
          resolve();
        });
      });
    } catch { /* skip silently */ }
  }
}

chrome.runtime.onInstalled.addListener(async () => {
  await chrome.storage.local.set({ installedAt: Date.now(), planTier: 'free' });
  await reapplyPersistedFixes();
  await doAudit();
  // Schedule periodic drift check (every 30 minutes)
  chrome.alarms.create('reapply-fixes', { periodInMinutes: 30 });
});

chrome.runtime.onStartup.addListener(async () => {
  await reapplyPersistedFixes();
  const stored = await chrome.storage.local.get('lastAudit');
  const last = stored.lastAudit?.completedAt ?? 0;
  if (Date.now() - last > AUDIT_INTERVAL_MS) {
    await doAudit();
  }
  chrome.alarms.create('reapply-fixes', { periodInMinutes: 30 });
});

// Periodic drift check — re-apply fixes if Chrome reset them
chrome.alarms?.onAlarm.addListener((alarm) => {
  if (alarm.name === 'reapply-fixes') {
    reapplyPersistedFixes();
  }
});

// Reset ScriptSpy data when user navigates to a new page
chrome.webNavigation?.onCommitted.addListener((details) => {
  if (details.frameId === 0 && details.tabId > 0) {
    resetTab(details.tabId);
    chrome.storage.local.remove(`scriptspyActive_${details.tabId}`);
  }
});

// Clean up when a tab is closed to prevent memory leaks
chrome.tabs.onRemoved.addListener((tabId) => {
  resetTab(tabId);
  chrome.storage.local.remove(`scriptspyActive_${tabId}`);
});

// --- Message handler ---

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'run_audit') {
    doAudit().then(sendResponse);
    return true;
  }

  if (msg.type === 'get_audit') {
    chrome.storage.local.get('lastAudit').then((s) => sendResponse(s.lastAudit ?? null));
    return true;
  }

  if (msg.type === 'fetch_script_source') {
    const url = msg.url;
    if (!url) { sendResponse({ ok: false, reason: 'No URL' }); return; }

    // Verify we have host permission for this URL
    chrome.permissions.contains({ origins: [url] }, (hasPermission) => {
      if (!hasPermission) {
        sendResponse({
          ok: false,
          reason: 'Sin permiso de host. Activa "Permitir descarga de scripts" en Settings.',
        });
        return;
      }
      fetch(url, { credentials: 'omit', cache: 'force-cache' })
        .then(async (res) => {
          if (!res.ok) {
            sendResponse({ ok: false, reason: `HTTP ${res.status} ${res.statusText}` });
            return;
          }
          const text = await res.text();
          sendResponse({ ok: true, text, contentType: res.headers.get('content-type') });
        })
        .catch((err) => sendResponse({ ok: false, reason: err.message }));
    });
    return true;
  }

  if (msg.type === 'extract_page_text') {
    const tabId = msg.tabId;
    if (!tabId) { sendResponse({ ok: false, reason: 'No active tab.' }); return; }
    chrome.scripting.executeScript({
      target: { tabId },
      files: ['content/page-text-probe.js'],
      world: 'MAIN',
    }).then((results) => {
      const result = results?.[0]?.result ?? null;
      sendResponse({ ok: true, result });
    }).catch((err) => sendResponse({ ok: false, reason: err.message }));
    return true;
  }

  if (msg.type === 'run_compliance_probe') {
    const tabId = msg.tabId;
    if (!tabId) { sendResponse({ ok: false, reason: 'No active tab.' }); return; }
    chrome.tabs.get(tabId).then((tab) => {
      const url = tab.url ?? '';
      if (!url || url.startsWith('chrome://') || url.startsWith('chrome-extension://')) {
        sendResponse({ ok: false, reason: 'No se puede analizar páginas del sistema.' });
        return;
      }
      chrome.scripting.executeScript({
        target: { tabId },
        files: ['content/compliance-probe.js'],
        world: 'MAIN',
      }).then((results) => {
        const result = results?.[0]?.result ?? null;
        sendResponse({ ok: true, result });
      }).catch((err) => {
        sendResponse({ ok: false, reason: err.message });
      });
    }).catch(() => sendResponse({ ok: false, reason: 'Pestaña no accesible.' }));
    return true;
  }

  if (msg.type === 'inject_scriptspy') {
    const tabId = msg.tabId;
    if (tabId) {
      injectScriptSpy(tabId).then(sendResponse);
    } else {
      sendResponse({ ok: false, reason: 'No se pudo identificar la pestaña activa.' });
    }
    return true;
  }

  if (msg.type === 'get_scriptspy') {
    const tabId = msg.tabId;
    if (!tabId) { sendResponse({ scripts: [], pageUrl: '' }); return; }
    enrichWithThreatIntel(tabId)
      .catch((err) => console.warn('[BrowserAudit] TI enrichment failed:', err.message))
      .finally(async () => {
        const data = getAggregatedData(tabId);
        // If pageUrl is empty (ScriptSpy activated after page load),
        // read URL directly from the active tab
        if (!data.pageUrl) {
          try {
            const tab = await chrome.tabs.get(tabId);
            data.pageUrl = tab?.url ?? '';
            data.pageTitle = tab?.title ?? '';
          } catch { /* tab gone */ }
        } else {
          try {
            const tab = await chrome.tabs.get(tabId);
            data.pageTitle = tab?.title ?? '';
          } catch { /* tab gone */ }
        }
        sendResponse(data);
      });
    return true;
  }

  if (msg.type === 'apply_fix') {
    const { api, value } = msg;
    const [namespace, key] = api.split('.');
    const setting = chrome.privacy?.[namespace]?.[key];
    if (!setting) { sendResponse({ ok: false, reason: 'API no disponible' }); return; }

    setting.set({ value }, async () => {
      if (chrome.runtime.lastError) {
        sendResponse({ ok: false, reason: chrome.runtime.lastError.message });
        return;
      }

      setting.get({}, async (details) => {
        if (chrome.runtime.lastError) {
          sendResponse({ ok: false, reason: 'No se pudo verificar el cambio' });
          return;
        }
        const currentValue = (details.value && typeof details.value === 'object' && 'mode' in details.value)
          ? details.value.mode
          : details.value;
        const success = currentValue === value;

        if (success) {
          // Store {api, value} so we can re-apply if the setting drifts
          // (Chrome can lose extension ownership when the SW sleeps)
          const stored = await chrome.storage.local.get('appliedFixes');
          const applied = (stored.appliedFixes ?? []).map((a) =>
            typeof a === 'string' ? { api: a, value: null } : a
          );
          const existing = applied.find((a) => a.api === api);
          if (existing) {
            existing.value = value;
          } else {
            applied.push({ api, value });
          }
          await chrome.storage.local.set({ appliedFixes: applied });
          sendResponse({ ok: true, verified: true });
        } else {
          const reason = details.levelOfControl === 'controlled_by_other_extensions'
            ? 'Otra extensión controla este ajuste — desactívala o revoca su acceso'
            : details.levelOfControl === 'not_controllable'
            ? 'Política corporativa o sistema bloquea este cambio'
            : `Cambio aplicado pero el valor sigue siendo "${currentValue}". El navegador puede no soportar este valor.`;
          sendResponse({ ok: false, reason });
        }
      });
    });
    return true;
  }

  if (msg.type === 'reset_applied_fixes') {
    const apis = msg.apis ?? [];
    const errors = [];
    let cleared = 0;

    Promise.all(apis.map((api) =>
      new Promise((resolve) => {
        const [namespace, key] = api.split('.');
        const setting = chrome.privacy?.[namespace]?.[key];
        if (!setting) { resolve(); return; }
        setting.clear({}, () => {
          if (chrome.runtime.lastError) {
            errors.push(`${api}: ${chrome.runtime.lastError.message}`);
          } else {
            cleared++;
          }
          resolve();
        });
      })
    )).then(async () => {
      // Wipe persisted appliedFixes so the periodic alarm doesn't re-apply them
      await chrome.storage.local.set({ appliedFixes: [] });
      sendResponse({ ok: errors.length === 0, count: cleared, errors });
    });
    return true;
  }

  if (msg.type === 'get_applied_fixes') {
    chrome.storage.local.get('appliedFixes').then((s) => sendResponse(s.appliedFixes ?? []));
    return true;
  }

  if (msg.type === 'get_history') {
    chrome.storage.local.get('auditHistory').then((s) => sendResponse(s.auditHistory ?? []));
    return true;
  }

  if (msg.type === 'get_plan') {
    getPlanState().then(sendResponse);
    return true;
  }

  if (msg.type === 'dev_toggle_pro') {
    devTogglePro().then((tier) => sendResponse({ tier }));
    return true;
  }

  if (msg.type === 'reset_plan') {
    resetPlan().then(() => sendResponse({ ok: true }));
    return true;
  }

  if (msg.type === 'scriptspy_event') {
    const tabId = sender.tab?.id;
    if (tabId && msg.payload) {
      ingestEvent(tabId, msg.payload);
    }
  }
});
