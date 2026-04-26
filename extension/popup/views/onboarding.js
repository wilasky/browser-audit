import { esc } from '../../shared/sanitize.js';
import { t } from '../../shared/i18n.js';

function getSteps() {
  return [
    {
      icon: '⌖',
      title: t('ob.step1_title'),
      body: t('ob.step1_body'),
      cta: t('ob.step1_cta'),
    },
    {
      icon: '◆',
      title: t('ob.step2_title'),
      body: t('ob.step2_body'),
      cta: t('ob.step2_cta'),
    },
  ];
}

export function renderOnboarding(container, onDone) {
  let step = 0;
  const STEPS = getSteps();

  function render() {
    const s = STEPS[step];
    const dots = STEPS.map((_, i) =>
      `<span class="ob-dot ${i === step ? 'active' : ''}"></span>`
    ).join('');

    container.innerHTML = `
      <div class="ob-wrap">
        <div class="ob-icon">${esc(s.icon)}</div>
        <h2 class="ob-title">${esc(s.title)}</h2>
        <p class="ob-body">${esc(s.body)}</p>
        <div class="ob-dots">${dots}</div>
        <button class="ob-cta btn-primary">${esc(s.cta)}</button>
        <button class="ob-skip">${esc(t('ob.skip'))}</button>
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
        chrome.permissions.request({ permissions: ['management', 'privacy', 'contentSettings'] }, () => {
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
