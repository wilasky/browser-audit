import { hookNetwork } from './api-hooks/network.js';
import { hookStorage } from './api-hooks/storage.js';
import { hookInputTracking } from './api-hooks/input-tracking.js';
import { hookFingerprinting } from './api-hooks/fingerprinting.js';
import { hookInjection } from './api-hooks/injection.js';

(function () {
  // Avoid double-injection if script runs twice in the same page
  if (window.__browseraudit_active) { return; }
  window.__browseraudit_active = true;

  function getCallerScript() {
    const err = new Error();
    const lines = (err.stack || '').split('\n');
    for (let i = 2; i < lines.length; i++) {
      const m = lines[i].match(/(https?:\/\/[^\s):]+):(\d+):(\d+)/);
      if (m && !m[1].includes('__browseraudit')) {
        return { url: m[1], line: parseInt(m[2], 10) };
      }
    }
    return { url: 'inline', line: 0 };
  }

  function emit(type, data) {
    const caller = getCallerScript();
    window.dispatchEvent(
      new CustomEvent('__browseraudit_event', {
        detail: { type, data, timestamp: Date.now(), script: caller.url, line: caller.line },
      })
    );
  }

  window.__browseraudit = { emit };

  hookNetwork(emit);
  hookStorage(emit);
  hookInputTracking(emit);
  hookFingerprinting(emit);
  hookInjection(emit);

  emit('page-start', { url: location.href });
})();
