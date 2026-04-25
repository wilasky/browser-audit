// Plan tier management.
//
// Phase 3: infrastructure with dev toggle. ExtensionPay integration happens in Phase 8
// when the extension has a real Chrome Web Store ID.
//
// Tiers: 'free' | 'pro'
// State persisted in chrome.storage.local with a 1h verification TTL.

const STORAGE_KEY = 'planState';

async function loadState() {
  const s = await chrome.storage.local.get(STORAGE_KEY);
  return s[STORAGE_KEY] ?? { tier: 'free', verifiedAt: 0, email: null, devMode: false };
}

async function saveState(state) {
  await chrome.storage.local.set({ [STORAGE_KEY]: state });
}

// --- Public API ---

export async function isProUser() {
  const state = await loadState();
  return state.tier === 'pro';
}

export async function getPlanState() {
  const state = await loadState();
  return {
    tier: state.tier,
    email: state.email,
    devMode: state.devMode ?? false,
    isPro: state.tier === 'pro',
  };
}

// Toggle for sandbox testing without a real payment.
// In Phase 8, this will be replaced by ExtensionPay.openPaymentPage().
export async function devTogglePro() {
  const state = await loadState();
  const newTier = state.tier === 'pro' ? 'free' : 'pro';
  await saveState({
    ...state,
    tier: newTier,
    verifiedAt: Date.now(),
    email: newTier === 'pro' ? 'dev@test.local' : null,
    devMode: true,
  });
  return newTier;
}

// Called when ExtensionPay confirms a real payment (Phase 8).
export async function onPaymentSuccess(email) {
  await saveState({ tier: 'pro', verifiedAt: Date.now(), email, devMode: false });
}

export async function resetPlan() {
  await saveState({ tier: 'free', verifiedAt: 0, email: null, devMode: false });
}
