// Isolated world bridge — relays events from instrumentation (MAIN world) to background
// Phase 0 stub: listener wired up, no events yet
window.addEventListener('__browseraudit_event', (e) => {
  chrome.runtime.sendMessage({ type: 'scriptspy_event', payload: e.detail });
});
