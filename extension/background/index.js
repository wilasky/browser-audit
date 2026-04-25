import { runAudit } from './audit-engine.js';

const AUDIT_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24h

async function doAudit() {
  try {
    const audit = await runAudit();
    await chrome.storage.local.set({ lastAudit: audit });
    return audit;
  } catch (err) {
    console.error('[BrowserAudit] Audit failed:', err);
  }
}

chrome.runtime.onInstalled.addListener(async () => {
  await chrome.storage.local.set({ installedAt: Date.now(), planTier: 'free' });
  await doAudit();
});

// Re-run audit every 24h via alarm
chrome.runtime.onStartup.addListener(async () => {
  const stored = await chrome.storage.local.get('lastAudit');
  const last = stored.lastAudit?.completedAt ?? 0;
  if (Date.now() - last > AUDIT_INTERVAL_MS) {
    await doAudit();
  }
});

// Popup requests a fresh audit
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'run_audit') {
    doAudit().then(sendResponse);
    return true; // keep channel open for async response
  }
  if (msg.type === 'get_audit') {
    chrome.storage.local.get('lastAudit').then((s) => sendResponse(s.lastAudit ?? null));
    return true;
  }
  if (msg.type === 'scriptspy_event') {
    // Phase 2: aggregate ScriptSpy events — placeholder
  }
});
