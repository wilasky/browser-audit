import { runAudit } from './audit-engine.js';
import { ingestEvent, getAggregatedData, resetTab } from './event-aggregator.js';
import { getPlanState, devTogglePro, resetPlan } from './plan-manager.js';

const AUDIT_INTERVAL_MS = 24 * 60 * 60 * 1000;

async function doAudit() {
  try {
    const audit = await runAudit();
    await chrome.storage.local.set({ lastAudit: audit });
    return audit;
  } catch (err) {
    console.error('[BrowserAudit] Audit failed:', err);
  }
}

async function injectScriptSpy(tabId) {
  try {
    const [tab] = await chrome.tabs.get(tabId).then((t) => [t]).catch(() => [null]);
    if (!tab || tab.url?.startsWith('chrome://') || tab.url?.startsWith('chrome-extension://')) {
      return { ok: false, reason: 'Página del sistema — ScriptSpy solo funciona en páginas web.' };
    }
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
    return { ok: false, reason: err.message };
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
  if (details.frameId === 0) {
    resetTab(details.tabId);
  }
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
    sendResponse(tabId ? getAggregatedData(tabId) : { scripts: [], pageUrl: '' });
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
