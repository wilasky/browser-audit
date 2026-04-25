// Service worker entry point — Phase 0 stub
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ installedAt: Date.now(), planTier: 'free' });
});
