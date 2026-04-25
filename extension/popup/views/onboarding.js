const STEPS = [
  {
    icon: '◆',
    title: 'Browser Health Check',
    body: 'Audita la configuración de Chrome contra una baseline de seguridad. Recibes un score 0-100 y pasos concretos para mejorar cada punto.',
    cta: 'Siguiente →',
  },
  {
    icon: '⌖',
    title: 'ScriptSpy',
    body: 'Inspecciona en tiempo real qué hacen los scripts de cualquier web: qué datos envían, si hacen fingerprinting, qué cookies leen. Actívalo en la pestaña ScriptSpy.',
    cta: 'Activar permisos y empezar',
  },
];

export function renderOnboarding(container, onDone) {
  let step = 0;

  function render() {
    const s = STEPS[step];
    const dots = STEPS.map((_, i) =>
      `<span class="ob-dot ${i === step ? 'active' : ''}"></span>`
    ).join('');

    container.innerHTML = `
      <div class="ob-wrap">
        <div class="ob-icon">${s.icon}</div>
        <h2 class="ob-title">${s.title}</h2>
        <p class="ob-body">${s.body}</p>
        <div class="ob-dots">${dots}</div>
        <button class="ob-cta btn-primary">${s.cta}</button>
        <button class="ob-skip">Saltar introducción</button>
      </div>`;

    container.querySelector('.ob-cta').addEventListener('click', () => {
      if (step < STEPS.length - 1) {
        step++;
        render();
      } else {
        finish();
      }
    });

    container.querySelector('.ob-skip').addEventListener('click', finish);
  }

  async function finish() {
    if (step === STEPS.length - 1) {
      // Last step: request permissions before leaving onboarding
      await new Promise((resolve) => {
        chrome.permissions.request({ permissions: ['management', 'privacy'] }, () => {
          void chrome.runtime.lastError;
          resolve();
        });
      });
    }
    await chrome.storage.local.set({ onboardingDone: true });
    onDone();
  }

  render();
}

export async function shouldShowOnboarding() {
  const s = await chrome.storage.local.get('onboardingDone');
  return !s.onboardingDone;
}
