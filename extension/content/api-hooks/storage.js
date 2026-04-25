export function hookStorage(emit) {
  hookCookies(emit);
  hookLocalStorage(emit);
  hookSessionStorage(emit);
}

function hookCookies(emit) {
  const descriptor = Object.getOwnPropertyDescriptor(Document.prototype, 'cookie');
  if (!descriptor) { return; }

  Object.defineProperty(document, 'cookie', {
    get() {
      emit('cookie-read', {});
      return descriptor.get.call(this);
    },
    set(val) {
      const name = String(val).split('=')[0].trim();
      emit('cookie-write', { name });
      descriptor.set.call(this, val);
    },
    configurable: true,
  });
}

function hookWebStorage(storage, typeRead, typeWrite, emit) {
  const _setItem = storage.setItem.bind(storage);
  const _getItem = storage.getItem.bind(storage);

  storage.setItem = function (key, value) {
    emit(typeWrite, { key, size: String(value).length });
    return _setItem(key, value);
  };

  storage.getItem = function (key) {
    emit(typeRead, { key });
    return _getItem(key);
  };
}

function hookLocalStorage(emit) {
  try {
    hookWebStorage(localStorage, 'storage-read', 'storage-write', emit);
  } catch {
    // localStorage may be unavailable (e.g. sandboxed iframe)
  }
}

function hookSessionStorage(emit) {
  try {
    hookWebStorage(sessionStorage, 'storage-read', 'storage-write', emit);
  } catch {
    // sessionStorage may be unavailable
  }
}
