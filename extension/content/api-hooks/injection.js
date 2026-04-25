export function hookInjection(emit) {
  hookCreateElement(emit);
  observeScriptTags(emit);
}

function hookCreateElement(emit) {
  const _createElement = document.createElement.bind(document);

  document.createElement = function (tagName) {
    const el = _createElement(tagName);
    if (typeof tagName === 'string' && tagName.toLowerCase() === 'script') {
      const descriptor = Object.getOwnPropertyDescriptor(HTMLScriptElement.prototype, 'src');
      if (descriptor?.set) {
        const _set = descriptor.set;
        Object.defineProperty(el, 'src', {
          set(val) {
            emit('script-inject', { src: String(val), method: 'createElement' });
            _set.call(this, val);
          },
          get: descriptor.get,
          configurable: true,
        });
      }
    }
    return el;
  };
}

function observeScriptTags(emit) {
  const seen = new WeakSet();

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeName !== 'SCRIPT' || seen.has(node)) { continue; }
        seen.add(node);
        const src = node.src || node.getAttribute('src') || '';
        if (src) {
          emit('script-inject', { src, method: 'DOM' });
        } else {
          emit('script-inject', { src: 'inline', method: 'DOM', size: node.textContent?.length ?? 0 });
        }
      }
    }
  });

  const target = document.documentElement || document.body || document.head;
  if (target) {
    observer.observe(target, { childList: true, subtree: true });
  }
}
