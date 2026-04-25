const INPUT_EVENTS = new Set(['keydown', 'keyup', 'keypress', 'input', 'change', 'paste']);
const MOUSE_EVENTS = new Set(['mousemove', 'mousedown', 'mouseup', 'click', 'scroll']);

export function hookInputTracking(emit) {
  hookAddEventListener(emit);
  hookFormData(emit);
}

function hookAddEventListener(emit) {
  const _addEventListener = EventTarget.prototype.addEventListener;

  EventTarget.prototype.addEventListener = function (type, listener, options) {
    if (INPUT_EVENTS.has(type)) {
      emit('listen', { event: type });
    } else if (MOUSE_EVENTS.has(type)) {
      emit('mouse-listen', { event: type });
    }
    return _addEventListener.call(this, type, listener, options);
  };
}

function hookFormData(emit) {
  const _FormData = window.FormData;
  window.FormData = function (form) {
    if (form instanceof HTMLFormElement) {
      emit('read-input', { form: form.id || form.name || '(unnamed)' });
    }
    return new _FormData(form);
  };
  window.FormData.prototype = _FormData.prototype;
}
