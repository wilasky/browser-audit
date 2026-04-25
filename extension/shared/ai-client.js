// Unified AI client — Claude, OpenAI or local Ollama.
// API keys stored in chrome.storage.local. No data transits our servers.

const STORAGE_KEY = 'aiConfig';

const PROVIDERS = {
  claude: {
    name: 'Claude (Anthropic)',
    url: 'https://api.anthropic.com/v1/messages',
    defaultModel: 'claude-haiku-4-5-20251001',
    keyPrefix: 'sk-ant-',
    keyPlaceholder: 'sk-ant-...',
    signupUrl: 'https://console.anthropic.com/settings/keys',
  },
  openai: {
    name: 'OpenAI (GPT)',
    url: 'https://api.openai.com/v1/chat/completions',
    defaultModel: 'gpt-4o-mini',
    keyPrefix: 'sk-',
    keyPlaceholder: 'sk-...',
    signupUrl: 'https://platform.openai.com/api-keys',
  },
  ollama: {
    name: 'Ollama (local)',
    url: 'http://localhost:11434/api/chat',
    defaultModel: 'llama3.2',
    keyPrefix: '',
    keyPlaceholder: '(no necesita key)',
    signupUrl: 'https://ollama.com/',
  },
};

export function listProviders() {
  return Object.entries(PROVIDERS).map(([id, p]) => ({ id, ...p }));
}

export async function getAIConfig() {
  const s = await chrome.storage.local.get(STORAGE_KEY);
  return s[STORAGE_KEY] ?? { provider: 'claude', apiKey: '', model: '' };
}

export async function saveAIConfig({ provider, apiKey, model }) {
  await chrome.storage.local.set({
    [STORAGE_KEY]: { provider, apiKey: apiKey ?? '', model: model || PROVIDERS[provider]?.defaultModel || '' },
  });
}

export async function isAIConfigured() {
  const cfg = await getAIConfig();
  if (cfg.provider === 'ollama') { return true; } // no key needed
  return cfg.provider && cfg.apiKey && cfg.apiKey.length > 10;
}

// --- Provider-specific call functions ---

async function callClaude(cfg, system, user) {
  const res = await fetch(PROVIDERS.claude.url, {
    method: 'POST',
    headers: {
      'x-api-key': cfg.apiKey,
      'content-type': 'application/json',
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: cfg.model || PROVIDERS.claude.defaultModel,
      max_tokens: 800,
      system,
      messages: [{ role: 'user', content: user }],
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Claude API ${res.status}: ${errText.slice(0, 200)}`);
  }

  const data = await res.json();
  return data.content?.[0]?.text ?? '';
}

async function callOpenAI(cfg, system, user) {
  const res = await fetch(PROVIDERS.openai.url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${cfg.apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: cfg.model || PROVIDERS.openai.defaultModel,
      max_tokens: 800,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`OpenAI API ${res.status}: ${errText.slice(0, 200)}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? '';
}

async function callOllama(cfg, system, user) {
  const res = await fetch(PROVIDERS.ollama.url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      model: cfg.model || PROVIDERS.ollama.defaultModel,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      stream: false,
    }),
  });

  if (!res.ok) {
    throw new Error(`Ollama ${res.status} — ¿está corriendo en localhost:11434?`);
  }

  const data = await res.json();
  return data.message?.content ?? '';
}

export async function callAI(system, user) {
  const cfg = await getAIConfig();
  if (cfg.provider === 'claude') { return callClaude(cfg, system, user); }
  if (cfg.provider === 'openai') { return callOpenAI(cfg, system, user); }
  if (cfg.provider === 'ollama') { return callOllama(cfg, system, user); }
  throw new Error(`Proveedor desconocido: ${cfg.provider}`);
}

// --- Specific use case: Privacy policy summary ---

const POLICY_SYSTEM = `Eres un experto en privacidad y RGPD. Tu trabajo es leer políticas de privacidad y resumirlas en lenguaje claro y directo. Sé concreto, sin lenguaje legal vacío. Usa el formato exacto que se te pida.`;

export async function summarizePrivacyPolicy(text, host) {
  const truncated = text.slice(0, 12000);
  const user = `Esta es la política de privacidad de ${host}. Responde EXACTAMENTE en este formato (sin nada más):

📋 DATOS QUE RECOGEN:
- [bullet 1]
- [bullet 2]
- [bullet 3]

🔄 CON QUIÉN LOS COMPARTEN:
- [bullet 1]
- [bullet 2]

⏱ CUÁNTO LOS GUARDAN:
- [bullet 1]

⚠ PUNTOS PREOCUPANTES:
- [puntos que un usuario debería conocer; si no hay, escribe "Ninguno destacable"]

✅ DERECHOS DEL USUARIO (RGPD):
- [acceso, rectificación, supresión, portabilidad — solo los que mencione el texto]

Política a resumir:
---
${truncated}
---`;

  return callAI(POLICY_SYSTEM, user);
}

// --- Specific use case: Script analysis ---

const SCRIPT_SYSTEM = `Eres un analista de seguridad web. Tu trabajo es identificar qué hacen los scripts de JavaScript que se cargan en páginas web. Sé directo y técnico.`;

export async function analyzeScript(scriptUrl, scriptCode = '') {
  const user = `Analiza este script y dime EXACTAMENTE en este formato:

🔍 QUÉ ES:
[1 línea: nombre del SDK/biblioteca o "desconocido"]

🎯 PROPÓSITO:
[1-2 líneas: qué hace funcionalmente]

⚠ RIESGOS:
- [bullet o "ninguno conocido"]

📊 VEREDICTO:
[Legítimo / Tracker comercial / Sospechoso / Malicioso] — razón breve

URL: ${scriptUrl}
${scriptCode ? `\nCódigo (primeras 3000 chars):\n---\n${scriptCode.slice(0, 3000)}\n---` : ''}`;

  return callAI(SCRIPT_SYSTEM, user);
}
