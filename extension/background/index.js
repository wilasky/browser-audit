import { runAudit } from './audit-engine.js';
import { ingestEvent, getAggregatedData, resetTab } from './event-aggregator.js';

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
    // MAIN world: monkey-patches browser APIs
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['content/instrumentation.js'],
      world: 'MAIN',
    });
    // ISOLATED world: bridge that relays events to background
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['content/bridge.js'],
      world: 'ISOLATED',
    });
  } catch (err) {
    console.error('[BrowserAudit] Injection failed:', err.message);
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
      injectScriptSpy(tabId).then(() => sendResponse({ ok: true }));
    } else {
      sendResponse({ ok: false });
    }
    return true;
  }

  if (msg.type === 'get_scriptspy') {
    const tabId = msg.tabId;
    sendResponse(tabId ? getAggregatedData(tabId) : { scripts: [], pageUrl: '' });
  }

  if (msg.type === 'scriptspy_event') {
    const tabId = sender.tab?.id;
    if (tabId && msg.payload) {
      ingestEvent(tabId, msg.payload);
    }
  }
});
