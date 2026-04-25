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

chrome.runtime.onInstalled.addListener(async () => {
  await chrome.storage.local.set({ installedAt: Date.now(), planTier: 'free' });
  await doAudit();
});

chrome.runtime.onStartup.addListener(async () => {
  const stored = await chrome.storage.local.get('lastAudit');
  const last = stored.lastAudit?.completedAt ?? 0;
  if (Date.now() - last > AUDIT_INTERVAL_MS) {
    await doAudit();
  }
});

// Reset ScriptSpy data when user navigates to a new page
chrome.webNavigation?.onCommitted.addListener((details) => {
  if (details.frameId === 0 && details.tabId > 0) {
    resetTab(details.tabId);
  }
});

// Clean up when a tab is closed to prevent memory leaks
chrome.tabs.onRemoved.addListener((tabId) => {
  resetTab(tabId);
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
    // Enrich with TI then respond (non-blocking if TI fails)
    enrichWithThreatIntel(tabId)
      .catch((err) => console.warn('[BrowserAudit] TI enrichment failed:', err.message))
      .finally(() => sendResponse(getAggregatedData(tabId)));
    return true;
  }

  if (msg.type === 'apply_fix') {
    // Directly set a chrome.privacy setting without opening Chrome settings
    const { api, value } = msg;
    const [namespace, key] = api.split('.');
    const setting = chrome.privacy?.[namespace]?.[key];
    if (!setting) { sendResponse({ ok: false, reason: 'API no disponible' }); return; }
    setting.set({ value }, () => {
      if (chrome.runtime.lastError) {
        sendResponse({ ok: false, reason: chrome.runtime.lastError.message });
      } else {
        sendResponse({ ok: true });
      }
    });
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
