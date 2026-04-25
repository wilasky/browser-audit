// MAIN world instrumentation — Phase 0 stub
// Will monkey-patch browser APIs in Phase 2
(function () {
  function emit(type, data) {
    window.dispatchEvent(
      new CustomEvent('__browseraudit_event', { detail: { type, data, timestamp: Date.now() } })
    );
  }

  window.__browseraudit = { emit };
})();
