// Isolated world bridge — relays events from instrumentation (MAIN world) to background.
// Wrapped in try-catch because chrome.runtime can become invalid when the extension reloads
// or when the user uninstalls it while pages are still being instrumented.

let invalidated = false;

window.addEventListener('__browseraudit_event', (e) => {
  if (invalidated) { return; }
  try {
    if (!chrome.runtime?.id) { invalidated = true; return; }
    chrome.runtime.sendMessage(
      { type: 'scriptspy_event', payload: e.detail },
      () => { void chrome.runtime.lastError; }
    );
  } catch (err) {
    if (err?.message?.includes('Extension context invalidated')) {
      invalidated = true;
    }
  }
});
