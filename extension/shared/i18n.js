// Lightweight i18n for the popup UI.
// Supports ES (default) and EN. User preference stored in chrome.storage.local.

const TRANSLATIONS = {
  // Tabs
  'tab.scriptspy':   { es: 'ScriptSpy',   en: 'ScriptSpy' },
  'tab.compliance':  { es: 'RGPD',        en: 'GDPR' },
  'tab.health':      { es: 'Health',      en: 'Health' },

  // ScriptSpy main
  'spy.page':        { es: 'Página',                    en: 'Page' },
  'spy.refresh':     { es: 'Actualizar',                en: 'Refresh' },
  'spy.activate':    { es: 'Activar ScriptSpy',         en: 'Activate ScriptSpy' },
  'spy.active':      { es: 'ScriptSpy activo ✓',        en: 'ScriptSpy active ✓' },
  'spy.injecting':   { es: '⌛ Inyectando…',            en: '⌛ Injecting…' },
  'spy.no_data':     { es: 'Sin datos. Navega en la página activa, activa ScriptSpy y pulsa Actualizar.', en: 'No data. Navigate on the active tab, activate ScriptSpy and click Refresh.' },
  'spy.host_banner': { es: '🔬 Para análisis profundo (descarga de scripts, hash SHA256, detección de obfuscación) activa el permiso de host.', en: '🔬 For deep analysis (script download, SHA256 hash, obfuscation detection) enable host permission.' },
  'spy.activate_host': { es: 'Activar', en: 'Enable' },
  'spy.view_source': { es: 'Ver código fuente ↗',       en: 'View source ↗' },
  'spy.deep_analysis': { es: '🔬 Análisis profundo',    en: '🔬 Deep analysis' },
  'spy.legend':      { es: '? Leyenda de términos',     en: '? Legend' },

  // ScriptSpy summary stats
  'spy.scripts':     { es: 'scripts',           en: 'scripts' },
  'spy.third_party': { es: 'terceros',          en: 'third-party' },
  'spy.high_risk':   { es: 'riesgo alto',       en: 'high risk' },
  'spy.medium':      { es: 'medio',             en: 'medium' },
  'spy.events':      { es: 'eventos',           en: 'events' },

  // Risk levels
  'risk.high':       { es: 'ALTO',              en: 'HIGH' },
  'risk.med':        { es: 'MEDIO',             en: 'MED' },
  'risk.low':        { es: 'BAJO',              en: 'LOW' },

  // Health
  'health.refresh':       { es: '↺ Actualizar',          en: '↺ Refresh' },
  'health.grant':         { es: '+ Activar {n} checks',  en: '+ Enable {n} checks' },
  'health.reset':         { es: '↶ Restablecer',         en: '↶ Reset' },
  'health.import':        { es: '↑ Importar',            en: '↑ Import' },
  'health.audited_at':    { es: 'Auditado',              en: 'Audited' },
  'health.checks_count':  { es: 'checks v',              en: 'checks v' },

  // Profiles
  'profile.label':        { es: 'Vista:',                en: 'View:' },
  'profile.standard':     { es: 'Estándar',              en: 'Standard' },
  'profile.advanced':     { es: 'Avanzado',              en: 'Advanced' },
  'profile.basic':        { es: 'Básico',                en: 'Basic' },
  'profile.failed':       { es: 'FAIL',                  en: 'FAIL' },

  // Status
  'status.fail':          { es: 'FAIL',                  en: 'FAIL' },
  'status.warn':          { es: 'WARN',                  en: 'WARN' },
  'status.pass':          { es: 'PASS',                  en: 'PASS' },
  'status.na':            { es: 'N/A',                   en: 'N/A' },

  // Severity
  'severity.critical':    { es: 'CRÍTICO',               en: 'CRITICAL' },
  'severity.high':        { es: 'ALTO',                  en: 'HIGH' },
  'severity.medium':      { es: 'MEDIO',                 en: 'MEDIUM' },
  'severity.low':         { es: 'BAJO',                  en: 'LOW' },

  // Score labels
  'score.excellent':      { es: 'Excelente',             en: 'Excellent' },
  'score.good':           { es: 'Bueno',                 en: 'Good' },
  'score.improvable':     { es: 'Mejorable',             en: 'Improvable' },
  'score.moderate_risk':  { es: 'Riesgo moderado',       en: 'Moderate risk' },
  'score.high_risk':      { es: 'Riesgo elevado',        en: 'High risk' },
  'score.critical':       { es: 'Riesgo crítico',        en: 'Critical risk' },

  // Compliance
  'comp.title':           { es: 'Análisis RGPD / LSSI / Cookies de la página activa', en: 'GDPR / Cookie / Privacy analysis of active page' },
  'comp.analyze':         { es: 'Analizar página',       en: 'Analyze page' },
  'comp.analyze_again':   { es: 'Volver a analizar',     en: 'Analyze again' },
  'comp.ai_summarize':    { es: '✨ Resumir con IA',     en: '✨ Summarize with AI' },
  'comp.intro':           { es: 'Pulsa <strong>Analizar página</strong> para evaluar la web actual contra criterios de cumplimiento.', en: 'Click <strong>Analyze page</strong> to evaluate the current site against compliance criteria.' },
  'comp.section_cookies': { es: '🍪 Cookies & Consentimiento', en: '🍪 Cookies & Consent' },
  'comp.section_gdpr':    { es: '📋 RGPD / LSSI',        en: '📋 GDPR' },
  'comp.section_headers': { es: '🔒 Headers de seguridad', en: '🔒 Security Headers' },
  'comp.section_pentest': { es: '🔧 Análisis técnico (pentest)', en: '🔧 Technical analysis (pentest)' },
  'comp.score_overall':   { es: 'Cumplimiento general',  en: 'Overall compliance' },

  // Settings
  'settings.history':         { es: 'Histórico de score',         en: 'Score history' },
  'settings.audit_auto':      { es: 'Auditoría automática',       en: 'Auto audit' },
  'settings.view_health':     { es: 'Vista del Health Check',     en: 'Health Check view' },
  'settings.scriptspy':       { es: 'ScriptSpy',                  en: 'ScriptSpy' },
  'settings.alerts':          { es: 'Alertas',                    en: 'Alerts' },
  'settings.ai':              { es: 'Asistente IA',               en: 'AI Assistant' },
  'settings.deep_analysis':   { es: 'Análisis profundo de scripts', en: 'Deep script analysis' },
  'settings.plan':            { es: 'Plan',                       en: 'Plan' },
  'settings.import_export':   { es: 'Importar / Exportar configuración', en: 'Import / Export config' },
  'settings.data_privacy':    { es: 'Datos y privacidad',         en: 'Data & privacy' },
  'settings.about':           { es: 'Acerca de',                  en: 'About' },
  'settings.language':        { es: 'Idioma',                     en: 'Language' },
  'settings.lang_auto':       { es: 'Automático (Chrome)',        en: 'Auto (Chrome)' },
  'settings.lang_es':         { es: 'Español',                    en: 'Spanish' },
  'settings.lang_en':         { es: 'Inglés',                     en: 'English' },

  // Common buttons
  'btn.save':        { es: 'Guardar',           en: 'Save' },
  'btn.cancel':      { es: 'Cancelar',          en: 'Cancel' },
  'btn.back':        { es: '← Volver',          en: '← Back' },
  'btn.copy':        { es: 'Copiar',            en: 'Copy' },
};

const STORAGE_KEY = 'uiLanguage';
let _currentLang = null;

function detectChromeLang() {
  // chrome.i18n.getUILanguage returns 'es' or 'es-ES' etc.
  const lang = chrome.i18n?.getUILanguage?.() ?? 'es';
  return lang.startsWith('es') ? 'es' : 'en';
}

export async function getLanguage() {
  if (_currentLang) { return _currentLang; }
  const stored = await chrome.storage.local.get(STORAGE_KEY);
  if (stored[STORAGE_KEY] && stored[STORAGE_KEY] !== 'auto') {
    _currentLang = stored[STORAGE_KEY];
  } else {
    _currentLang = detectChromeLang();
  }
  return _currentLang;
}

export async function setLanguage(lang) {
  _currentLang = lang === 'auto' ? detectChromeLang() : lang;
  await chrome.storage.local.set({ [STORAGE_KEY]: lang });
}

export async function getLanguagePreference() {
  const stored = await chrome.storage.local.get(STORAGE_KEY);
  return stored[STORAGE_KEY] ?? 'auto';
}

// Synchronous t() — must call initI18n() first
export function t(key, params = {}) {
  const entry = TRANSLATIONS[key];
  if (!entry) { return key; }
  let txt = entry[_currentLang] ?? entry.es ?? key;
  for (const [k, v] of Object.entries(params)) {
    txt = txt.replace(`{${k}}`, v);
  }
  return txt;
}

export async function initI18n() {
  await getLanguage();
}
