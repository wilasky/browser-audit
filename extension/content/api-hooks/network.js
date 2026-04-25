export function hookNetwork(emit) {
  hookFetch(emit);
  hookXHR(emit);
  hookBeacon(emit);
  hookWebSocket(emit);
}

function hookFetch(emit) {
  const _fetch = window.fetch;
  window.fetch = function (input, init) {
    const url = typeof input === 'string' ? input : input instanceof Request ? input.url : String(input);
    const method = (init?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase();
    emit('fetch', { url, method });
    return _fetch.apply(this, arguments);
  };
}

function hookXHR(emit) {
  const _open = XMLHttpRequest.prototype.open;
  const _send = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function (method, url) {
    this.__ba_method = method.toUpperCase();
    this.__ba_url = url;
    return _open.apply(this, arguments);
  };

  XMLHttpRequest.prototype.send = function () {
    if (this.__ba_url) {
      emit('xhr', { url: this.__ba_url, method: this.__ba_method ?? 'GET' });
    }
    return _send.apply(this, arguments);
  };
}

function hookBeacon(emit) {
  const _beacon = navigator.sendBeacon.bind(navigator);
  navigator.sendBeacon = function (url, data) {
    emit('beacon', { url: String(url), size: data ? String(data).length : 0 });
    return _beacon(url, data);
  };
}

function hookWebSocket(emit) {
  const _WS = window.WebSocket;
  window.WebSocket = function (url, protocols) {
    emit('websocket', { url: String(url) });
    return new _WS(url, protocols);
  };
  window.WebSocket.prototype = _WS.prototype;
  Object.defineProperty(window.WebSocket, 'CONNECTING', { value: _WS.CONNECTING });
  Object.defineProperty(window.WebSocket, 'OPEN', { value: _WS.OPEN });
  Object.defineProperty(window.WebSocket, 'CLOSING', { value: _WS.CLOSING });
  Object.defineProperty(window.WebSocket, 'CLOSED', { value: _WS.CLOSED });
}
