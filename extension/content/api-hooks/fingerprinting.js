export function hookFingerprinting(emit) {
  hookCanvas(emit);
  hookAudioContext(emit);
  hookWebGL(emit);
  hookNavigatorProps(emit);
  hookScreenProps(emit);
  hookFonts(emit);
  hookBattery(emit);
}

function hookCanvas(emit) {
  const _toDataURL = HTMLCanvasElement.prototype.toDataURL;
  const _getImageData = CanvasRenderingContext2D.prototype.getImageData;

  HTMLCanvasElement.prototype.toDataURL = function () {
    emit('fp-canvas', { method: 'toDataURL' });
    return _toDataURL.apply(this, arguments);
  };

  CanvasRenderingContext2D.prototype.getImageData = function () {
    emit('fp-canvas', { method: 'getImageData' });
    return _getImageData.apply(this, arguments);
  };
}

function hookAudioContext(emit) {
  const _AC = window.AudioContext || window.webkitAudioContext;
  if (!_AC) { return; }

  const AC = function () {
    emit('fp-audio', { method: 'AudioContext' });
    return new _AC(...arguments);
  };
  AC.prototype = _AC.prototype;
  if (window.AudioContext) { window.AudioContext = AC; }
  if (window.webkitAudioContext) { window.webkitAudioContext = AC; }
}

function hookWebGL(emit) {
  const _getParameter = WebGLRenderingContext.prototype.getParameter;
  const _getExtension = WebGLRenderingContext.prototype.getExtension;

  WebGLRenderingContext.prototype.getParameter = function (param) {
    emit('fp-webgl', { method: 'getParameter', param });
    return _getParameter.call(this, param);
  };

  WebGLRenderingContext.prototype.getExtension = function (name) {
    emit('fp-webgl', { method: 'getExtension', name });
    return _getExtension.call(this, name);
  };

  // Also hook WebGL2 if available
  if (window.WebGL2RenderingContext) {
    const _getParameter2 = WebGL2RenderingContext.prototype.getParameter;
    WebGL2RenderingContext.prototype.getParameter = function (param) {
      emit('fp-webgl', { method: 'getParameter2', param });
      return _getParameter2.call(this, param);
    };
  }
}

const NAV_FP_PROPS = [
  'userAgent', 'platform', 'language', 'languages',
  'hardwareConcurrency', 'deviceMemory', 'plugins',
];

function hookNavigatorProps(emit) {
  for (const prop of NAV_FP_PROPS) {
    const descriptor = Object.getOwnPropertyDescriptor(Navigator.prototype, prop)
      || Object.getOwnPropertyDescriptor(navigator, prop);
    if (!descriptor?.get) { continue; }

    const _get = descriptor.get;
    Object.defineProperty(Navigator.prototype, prop, {
      get() {
        emit('fp-navigator', { prop });
        return _get.call(this);
      },
      configurable: true,
    });
  }
}

const SCREEN_FP_PROPS = ['width', 'height', 'colorDepth', 'pixelDepth'];

function hookScreenProps(emit) {
  for (const prop of SCREEN_FP_PROPS) {
    const descriptor = Object.getOwnPropertyDescriptor(Screen.prototype, prop)
      || Object.getOwnPropertyDescriptor(screen, prop);
    if (!descriptor?.get) { continue; }

    const _get = descriptor.get;
    try {
      Object.defineProperty(Screen.prototype, prop, {
        get() {
          emit('fp-screen', { prop });
          return _get.call(this);
        },
        configurable: true,
      });
    } catch {
      // Some props are non-configurable in certain contexts
    }
  }
}

function hookFonts(emit) {
  if (!document.fonts?.check) { return; }
  const _check = document.fonts.check.bind(document.fonts);
  document.fonts.check = function (font, text) {
    emit('fp-fonts', { font });
    return _check(font, text);
  };
}

function hookBattery(emit) {
  if (!navigator.getBattery) { return; }
  const _getBattery = navigator.getBattery.bind(navigator);
  navigator.getBattery = function () {
    emit('fp-battery', {});
    return _getBattery();
  };
}
