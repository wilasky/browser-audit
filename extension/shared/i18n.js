// Full i18n for the popup UI — Spanish + English.
// Strings stay synchronized between locales. Add new keys to both at once.

const TRANSLATIONS = {
  // ---- Tabs ----
  'tab.scriptspy':   { es: 'ScriptSpy',   en: 'ScriptSpy' },
  'tab.compliance':  { es: 'RGPD',        en: 'GDPR' },
  'tab.health':      { es: 'Health',      en: 'Health' },

  // ---- Common ----
  'btn.save':         { es: 'Guardar',          en: 'Save' },
  'btn.cancel':       { es: 'Cancelar',         en: 'Cancel' },
  'btn.back':         { es: '← Volver',         en: '← Back' },
  'btn.copy':         { es: 'Copiar',           en: 'Copy' },
  'btn.refresh':      { es: 'Actualizar',       en: 'Refresh' },
  'btn.close':        { es: 'Cerrar',           en: 'Close' },
  'common.loading':   { es: 'Cargando…',        en: 'Loading…' },
  'common.no_data':   { es: 'Sin datos',        en: 'No data' },
  'common.error':     { es: 'Error',            en: 'Error' },
  'common.ok':        { es: 'OK',               en: 'OK' },

  // ---- ScriptSpy ----
  'spy.page':              { es: 'Página',                  en: 'Page' },
  'spy.refresh':           { es: 'Actualizar',              en: 'Refresh' },
  'spy.activate':          { es: 'Activar ScriptSpy',       en: 'Activate ScriptSpy' },
  'spy.active':            { es: 'ScriptSpy activo ✓',      en: 'ScriptSpy active ✓' },
  'spy.activating':        { es: '⌛ Inyectando…',          en: '⌛ Injecting…' },
  'spy.no_data':           { es: 'Sin datos. Navega en la página activa, activa ScriptSpy y pulsa Actualizar.', en: 'No data. Navigate to the active tab, activate ScriptSpy and click Refresh.' },
  'spy.host_banner':       { es: '🔬 Para análisis profundo (descarga de scripts, hash SHA256, detección de obfuscación) activa el permiso de host.', en: '🔬 For deep analysis (script download, SHA256 hash, obfuscation detection) enable host permission.' },
  'spy.activate_host':     { es: 'Activar',                 en: 'Enable' },
  'spy.view_source':       { es: 'Ver código fuente ↗',     en: 'View source ↗' },
  'spy.deep_analysis':     { es: '🔬 Análisis profundo',    en: '🔬 Deep analysis' },
  'spy.legend':            { es: '? Leyenda de términos',   en: '? Term legend' },
  'spy.lookup_in':         { es: 'Buscar en',               en: 'Lookup at' },
  'spy.no_perm_alert':     { es: 'Sin permiso de host no se puede descargar el código del script para analizarlo.', en: 'Without host permission the script source cannot be downloaded for analysis.' },
  'spy.error_inject':      { es: 'Error al inyectar.',      en: 'Injection error.' },
  'spy.activate_btn':      { es: 'Activar ScriptSpy',       en: 'Activate ScriptSpy' },

  // ScriptSpy summary stats
  'spy.scripts':           { es: 'scripts',          en: 'scripts' },
  'spy.third_party':       { es: 'terceros',         en: 'third-party' },
  'spy.high_risk':         { es: 'riesgo alto',      en: 'high risk' },
  'spy.medium':            { es: 'medio',            en: 'medium' },
  'spy.events':            { es: 'eventos',          en: 'events' },

  // Risk levels
  'risk.high':             { es: 'ALTO',             en: 'HIGH' },
  'risk.med':              { es: 'MEDIO',            en: 'MED' },
  'risk.low':              { es: 'BAJO',             en: 'LOW' },

  // Risk reasons
  'risk.fp_techniques':    { es: '{n} técnica(s) de fingerprinting',  en: '{n} fingerprinting technique(s)' },
  'risk.silent_beacon':    { es: '{n} beacon silencioso',             en: '{n} silent beacon' },
  'risk.mouse_tracking':   { es: 'tracking de ratón',                 en: 'mouse tracking' },
  'risk.form_reading':     { es: 'lectura de formularios (3rd party)', en: 'form reading (3rd party)' },
  'risk.targets':          { es: '{n} destinos de red',               en: '{n} network destinations' },
  'risk.threat_match':     { es: '⚠ en lista de amenazas',            en: '⚠ on threat list' },
  'risk.no_suspicious':    { es: 'sin comportamiento sospechoso',     en: 'no suspicious behavior' },

  // Badges
  'badge.first_party':     { es: '1st party',        en: '1st party' },
  'badge.third_party':     { es: '3rd party',        en: '3rd party' },
  'badge.threat':          { es: '⚠ THREAT',         en: '⚠ THREAT' },

  // Legend sections
  'legend.origin':         { es: 'Origen',                en: 'Origin' },
  'legend.risk':           { es: 'Riesgo',                en: 'Risk' },
  'legend.network':        { es: 'Red',                   en: 'Network' },
  'legend.storage':        { es: 'Almacenamiento',        en: 'Storage' },
  'legend.inputs':         { es: 'Inputs',                en: 'Inputs' },
  'legend.fingerprinting': { es: 'Fingerprinting (FP)',   en: 'Fingerprinting (FP)' },

  // Event chip labels
  'evt.fetch':             { es: 'Fetch',           en: 'Fetch' },
  'evt.xhr':               { es: 'XHR',             en: 'XHR' },
  'evt.beacon':            { es: 'Beacon',          en: 'Beacon' },
  'evt.websocket':         { es: 'WebSocket',       en: 'WebSocket' },
  'evt.cookie_read':       { es: 'Cookie R',        en: 'Cookie R' },
  'evt.cookie_write':      { es: 'Cookie W',        en: 'Cookie W' },
  'evt.storage_read':      { es: 'Storage R',       en: 'Storage R' },
  'evt.storage_write':     { es: 'Storage W',       en: 'Storage W' },
  'evt.listen':            { es: 'Input listener',  en: 'Input listener' },
  'evt.mouse_listen':      { es: 'Mouse',           en: 'Mouse' },
  'evt.read_input':        { es: 'Form read',       en: 'Form read' },
  'evt.fp_canvas':         { es: 'Canvas FP',       en: 'Canvas FP' },
  'evt.fp_audio':          { es: 'Audio FP',        en: 'Audio FP' },
  'evt.fp_webgl':          { es: 'WebGL FP',        en: 'WebGL FP' },
  'evt.fp_navigator':      { es: 'Navigator FP',    en: 'Navigator FP' },
  'evt.fp_screen':         { es: 'Screen FP',       en: 'Screen FP' },
  'evt.fp_fonts':          { es: 'Fonts FP',        en: 'Fonts FP' },
  'evt.fp_battery':        { es: 'Battery FP',      en: 'Battery FP' },
  'evt.script_inject':     { es: 'Script inject',   en: 'Script inject' },

  // ---- Health Check ----
  'health.refresh':            { es: '↺ Actualizar',           en: '↺ Refresh' },
  'health.grant':              { es: '+ Activar {n} checks',   en: '+ Enable {n} checks' },
  'health.grant_tip':          { es: 'Concede permisos opcionales para ejecutar los {n} checks que requieren management/privacy/contentSettings', en: 'Grants optional permissions to run the {n} checks that require management/privacy/contentSettings' },
  'health.reset':              { es: '↶ Restablecer',          en: '↶ Reset' },
  'health.reset_tip':          { es: 'Restablecer ajustes de Chrome aplicados con ⚡', en: 'Reset Chrome settings applied with ⚡' },
  'health.import':             { es: '↑ Importar',             en: '↑ Import' },
  'health.audited_at':         { es: 'Auditado',               en: 'Audited' },
  'health.checks_count':       { es: 'checks v',               en: 'checks v' },
  'health.score_filter':       { es: 'Score del filtro',       en: 'Filter score' },
  'health.score_global':       { es: 'Global',                 en: 'Global' },
  'health.auditing':           { es: 'Auditando…',             en: 'Auditing…' },
  'health.auditing_first':     { es: 'Ejecutando primera auditoría…', en: 'Running first audit…' },
  'health.audit_failed':       { es: 'No se pudo completar la auditoría.', en: 'Audit could not be completed.' },
  'health.calc_fingerprint':   { es: 'Calculando huella digital…', en: 'Calculating fingerprint…' },
  'health.loading_audit':      { es: 'Cargando auditoría…',    en: 'Loading audit…' },
  'health.applying':           { es: 'Aplicando…',             en: 'Applying…' },
  'health.requesting_perm':    { es: 'Pidiendo permiso…',      en: 'Requesting permission…' },
  'health.applied':            { es: '✓ Aplicado',             en: '✓ Applied' },
  'health.apply_now':          { es: '⚡ Aplicar ahora',        en: '⚡ Apply now' },
  'health.fix_btn':            { es: 'Arreglar →',             en: 'Fix →' },
  'health.show_options':       { es: 'Ver opciones',           en: 'Show options' },
  'health.see_details':        { es: 'Ver detalles →',         en: 'See details →' },
  'health.no_perm_apply':      { es: 'Sin permiso "privacy" no se puede aplicar.', en: 'Without "privacy" permission this cannot be applied.' },
  'health.reset_no_changes':   { es: 'No hay ajustes restablecibles en esta auditoría.', en: 'No resettable settings in this audit.' },
  'health.reset_confirm':      { es: 'Esto restablecerá {n} ajustes de Chrome a sus valores por defecto del navegador. ¿Continuar?', en: 'This will reset {n} Chrome settings to browser defaults. Continue?' },
  'health.reset_done':         { es: '{n} ajustes restablecidos. Reauditando…', en: '{n} settings reset. Re-auditing…' },
  'health.reset_error':        { es: 'Error al restablecer.',  en: 'Reset error.' },
  'health.import_invalid':     { es: 'Formato no válido — falta el array results', en: 'Invalid format — missing results array' },
  'health.import_error':       { es: 'Error importando JSON: {msg}', en: 'JSON import error: {msg}' },
  'health.audited_label':      { es: 'Auditado',               en: 'Audited' },

  // Profiles
  'profile.label':       { es: 'Vista:',         en: 'View:' },
  'profile.standard':    { es: 'Estándar',       en: 'Standard' },
  'profile.advanced':    { es: 'Avanzado',       en: 'Advanced' },
  'profile.basic':       { es: 'Básico',         en: 'Basic' },
  'profile.failed':      { es: 'FAIL',           en: 'FAIL' },

  // Status counters
  'status.fail':         { es: 'FAIL',           en: 'FAIL' },
  'status.warn':         { es: 'WARN',           en: 'WARN' },
  'status.pass':         { es: 'PASS',           en: 'PASS' },
  'status.na':           { es: 'N/A',            en: 'N/A' },
  'status.checks':       { es: 'checks',         en: 'checks' },
  'status.fail_count':   { es: '{n} fallo{s}',   en: '{n} fail{s}' },
  'status.warn_count':   { es: '{n} aviso{s}',   en: '{n} warn{s}' },
  'status.pass_count':   { es: '{n} ok',         en: '{n} ok' },

  // Severity
  'severity.critical':   { es: 'CRÍTICO',        en: 'CRITICAL' },
  'severity.high':       { es: 'ALTO',           en: 'HIGH' },
  'severity.medium':     { es: 'MEDIO',          en: 'MEDIUM' },
  'severity.low':        { es: 'BAJO',           en: 'LOW' },

  // Score labels
  'score.excellent':     { es: 'Excelente',          en: 'Excellent' },
  'score.good':          { es: 'Bueno',              en: 'Good' },
  'score.improvable':    { es: 'Mejorable',          en: 'Improvable' },
  'score.moderate_risk': { es: 'Riesgo moderado',    en: 'Moderate risk' },
  'score.high_risk':     { es: 'Riesgo elevado',     en: 'High risk' },
  'score.critical':      { es: 'Riesgo crítico',     en: 'Critical risk' },

  // ---- Compliance / GDPR ----
  'comp.title':            { es: 'Análisis RGPD / LSSI / Cookies de la página activa', en: 'GDPR / Privacy / Cookie analysis of active page' },
  'comp.analyze':          { es: 'Analizar página',           en: 'Analyze page' },
  'comp.analyze_again':    { es: 'Volver a analizar',         en: 'Re-analyze' },
  'comp.analyzing':        { es: 'Analizando…',               en: 'Analyzing…' },
  'comp.analyzing_detail': { es: 'Inspeccionando cookies, headers, formularios y scripts…', en: 'Inspecting cookies, headers, forms and scripts…' },
  'comp.ai_summarize':     { es: '✨ Resumir con IA',          en: '✨ Summarize with AI' },
  'comp.ai_extracting':    { es: '✨ Extrayendo texto…',       en: '✨ Extracting text…' },
  'comp.ai_summarizing':   { es: '✨ Resumiendo ({n} chars)…', en: '✨ Summarizing ({n} chars)…' },
  'comp.ai_summarizing_policy': { es: 'Resumiendo política de privacidad…', en: 'Summarizing privacy policy…' },
  'comp.ai_no_text':       { es: 'No se pudo extraer el texto de la página.', en: 'Could not extract page text.' },
  'comp.ai_no_data':       { es: 'La página no devolvió datos. ¿Es una página del sistema?', en: 'Page returned no data. Is it a system page?' },
  'comp.ai_summary':       { es: '✨ Resumen IA',              en: '✨ AI Summary' },
  'comp.ai_pass_through':  { es: 'El contenido pasó por tu API key de IA. No por nuestros servidores.', en: 'Content went through your own AI API key. Not through our servers.' },
  'comp.ai_no_config':     { es: 'Configura una API key de Claude u OpenAI en la pestaña ⚙ Settings → Asistente IA.', en: 'Configure a Claude or OpenAI API key in the ⚙ Settings → AI Assistant tab.' },
  'comp.intro':            { es: 'Pulsa <strong>Analizar página</strong> para evaluar la web actual contra criterios de cumplimiento.', en: 'Click <strong>Analyze page</strong> to evaluate the current site against compliance criteria.' },
  'comp.section_cookies':  { es: '🍪 Cookies & Consentimiento', en: '🍪 Cookies & Consent' },
  'comp.section_gdpr':     { es: '📋 RGPD / LSSI',             en: '📋 GDPR' },
  'comp.section_headers':  { es: '🔒 Headers de seguridad',    en: '🔒 Security Headers' },
  'comp.section_pentest':  { es: '🔧 Análisis técnico (pentest)', en: '🔧 Technical analysis (pentest)' },
  'comp.score_overall':    { es: 'Cumplimiento general',       en: 'Overall compliance' },

  // ---- Script detail (deep analysis) ----
  'sd.title':              { es: 'Análisis profundo de script', en: 'Deep script analysis' },
  'sd.downloading':        { es: 'Descargando y analizando código fuente…', en: 'Downloading and analyzing source code…' },
  'sd.cant_download':      { es: 'No se pudo descargar el código (script inline o bloqueado).', en: 'Could not download code (inline or blocked).' },
  'sd.lookup_external':    { es: '🔍 Lookup externo',           en: '🔍 External lookup' },
  'sd.suspicious_apis':    { es: '⚠ APIs sospechosas detectadas', en: '⚠ Suspicious APIs detected' },
  'sd.obfuscation':        { es: '🔀 Análisis de obfuscación',  en: '🔀 Obfuscation analysis' },
  'sd.urls_hardcoded':     { es: 'URLs hardcoded en el código ({n})', en: 'URLs hardcoded in code ({n})' },
  'sd.ips_hardcoded':      { es: 'IPs hardcoded ({n})',         en: 'Hardcoded IPs ({n})' },
  'sd.base64_strings':     { es: 'Strings base64 largos ({n})', en: 'Long base64 strings ({n})' },
  'sd.no_apis':            { es: 'Sin patrones de API sospechosa detectados.', en: 'No suspicious API patterns detected.' },
  'sd.no_urls':            { es: 'Sin URLs hardcoded.',         en: 'No hardcoded URLs.' },
  'sd.no_ips':             { es: 'Sin IPs hardcoded.',          en: 'No hardcoded IPs.' },
  'sd.no_base64':          { es: 'Sin chunks base64 largos.',   en: 'No long base64 chunks.' },
  'sd.no_obf':             { es: 'Sin patrones de obfuscación típicos', en: 'No typical obfuscation patterns' },
  'sd.col_api':            { es: 'API',           en: 'API' },
  'sd.col_count':          { es: 'Veces',         en: 'Count' },
  'sd.col_risk':           { es: 'Riesgo',        en: 'Risk' },
  'sd.col_desc':           { es: 'Descripción',   en: 'Description' },
  'sd.kb':                 { es: 'KB',            en: 'KB' },
  'sd.lines':              { es: 'líneas',        en: 'lines' },
  'sd.error_perm':         { es: '⚙ Ve a Settings → "Análisis profundo de scripts" → "Permitir descarga de scripts" y concede el permiso a Chrome cuando lo pida.', en: '⚙ Go to Settings → "Deep script analysis" → "Allow script download" and grant permission when Chrome asks.' },
  'sd.grant_now':          { es: 'Pedir permiso ahora',         en: 'Grant permission now' },
  'sd.error_cors':         { es: 'El servidor del script puede haber respondido con error (404/timeout) o estar bloqueando peticiones desde extensiones. Prueba abriendo la URL en una pestaña nueva para ver el código directamente.', en: 'The script server may have returned an error (404/timeout) or be blocking extension requests. Try opening the URL in a new tab to see the code directly.' },

  // Verdict levels
  'verdict.critical':      { es: 'Patrón altamente sospechoso — investigar urgentemente', en: 'Highly suspicious pattern — investigate urgently' },
  'verdict.high':          { es: 'Múltiples señales de alerta — analizar manualmente', en: 'Multiple warning signs — analyze manually' },
  'verdict.medium':        { es: 'Algunas señales típicas, posiblemente código de producción minificado', en: 'Some typical patterns, possibly minified production code' },
  'verdict.low':           { es: 'Sin patrones especialmente preocupantes', en: 'No particularly concerning patterns' },

  // ---- Fingerprint detail ----
  'fp.title':              { es: 'Análisis de huella digital',   en: 'Fingerprint analysis' },
  'fp.calculating':        { es: 'Calculando huella digital…',   en: 'Calculating fingerprint…' },
  'fp.bits_label':         { es: 'bits de entropía',             en: 'entropy bits' },
  'fp.unique_signals':     { es: '{n} señal{es} única{s} de {total}', en: '{n} unique signal{s} of {total}' },
  'fp.id_label':           { es: 'ID de tu navegador:',          en: 'Your browser ID:' },
  'fp.copy_hash_tip':      { es: 'Copiar hash completo',         en: 'Copy full hash' },
  'fp.what_is':            { es: '<strong>¿Qué es esto?</strong> Cada señal es un dato que tu navegador revela a las webs que visitas. Combinadas forman un identificador casi único aunque borres las cookies. El hash de arriba representa tu "huella" actual — sería el ID con el que te seguiría un tracker.', en: '<strong>What is this?</strong> Each signal is data your browser reveals to websites. Combined they form an almost unique identifier even after clearing cookies. The hash above represents your current "fingerprint" — the ID a tracker would use.' },
  'fp.actions_title':      { es: '⚙ Cómo reducir tu huella',     en: '⚙ How to reduce your fingerprint' },
  'fp.compare_title':      { es: 'Comparar contra otros usuarios',en: 'Compare against other users' },
  'fp.compare_note':       { es: 'Estos sitios tienen base de datos para decir si tu huella es única entre millones. Nuestra extensión calcula los mismos valores que ellos pero sin la comparación poblacional.', en: 'These sites have databases to tell if your fingerprint is unique among millions. Our extension calculates the same values but without the population comparison.' },
  'fp.canvas_blocked':     { es: '✓ Tu navegador YA está bloqueando el canvas fingerprint. Buen trabajo.', en: '✓ Your browser is ALREADY blocking canvas fingerprinting. Good job.' },
  'fp.error_calc':         { es: 'Error calculando huella: {msg}', en: 'Fingerprint error: {msg}' },
  'fp.uniqueness_common':  { es: 'Común',                        en: 'Common' },
  'fp.uniqueness_rare':    { es: 'Único',                        en: 'Unique' },
  'fp.action1_title':      { es: '1. Activar User-Agent reducido (Chrome)', en: '1. Enable reduced User-Agent (Chrome)' },
  'fp.action1_desc':       { es: 'Chrome puede reducir la información del User-Agent automáticamente. Esto reduce ~3 bits de entropía. Activa <code>Reduce User-Agent string</code>.', en: 'Chrome can reduce User-Agent information automatically. This reduces ~3 bits of entropy. Enable <code>Reduce User-Agent string</code>.' },
  'fp.action2_title':      { es: '2. Bloquear canvas con extensión', en: '2. Block canvas with an extension' },
  'fp.action2_desc':       { es: 'Chrome no bloquea canvas nativamente. Instala una extensión como <code>Canvas Blocker</code> o <code>Trace</code> que añadan ruido aleatorio. Reduce ~8 bits de entropía.', en: 'Chrome does not block canvas natively. Install an extension like <code>Canvas Blocker</code> or <code>Trace</code> that adds random noise. Reduces ~8 bits of entropy.' },
  'fp.action3_title':      { es: '3. Cambiar a Brave o Firefox', en: '3. Switch to Brave or Firefox' },
  'fp.action3_desc':       { es: '<strong>Brave</strong> bloquea canvas, WebGL y audio fingerprinting por defecto. <strong>Firefox</strong> con "Strict tracking protection" también lo hace. Cero configuración necesaria.', en: '<strong>Brave</strong> blocks canvas, WebGL and audio fingerprinting by default. <strong>Firefox</strong> with "Strict tracking protection" does the same. Zero configuration needed.' },
  'fp.action4_title':      { es: '4. Tor Browser (máxima privacidad)', en: '4. Tor Browser (maximum privacy)' },
  'fp.action4_desc':       { es: 'Para casos extremos: Tor Browser estandariza todas las señales para que todos los usuarios tengan el mismo fingerprint (~10 bits de entropía total). Más lento pero indistinguible.', en: 'For extreme cases: Tor Browser standardizes all signals so all users share the same fingerprint (~10 bits total). Slower but indistinguishable.' },
  'fp.action_btn1':        { es: 'Abrir flag →',                 en: 'Open flag →' },
  'fp.action_btn2':        { es: 'Buscar →',                     en: 'Search →' },
  'fp.action_btn3':        { es: 'Brave →',                      en: 'Brave →' },
  'fp.action_btn4':        { es: 'Descargar →',                  en: 'Download →' },
  'fp.level_low':          { es: 'Huella relativamente común — similar a muchos usuarios de Chrome', en: 'Relatively common fingerprint — similar to many Chrome users' },
  'fp.level_medium':       { es: 'Huella moderadamente única — identificable con otros datos', en: 'Moderately unique fingerprint — identifiable combined with other data' },
  'fp.level_high':         { es: 'Huella muy única — rastreable sin cookies en la mayoría de sitios', en: 'Highly unique fingerprint — trackable without cookies on most sites' },

  // ---- Settings ----
  'settings.lang_title':       { es: 'Idioma · Language',           en: 'Language · Idioma' },
  'settings.lang_label':       { es: 'Idioma de la extensión:',     en: 'Extension language:' },
  'settings.lang_auto':        { es: 'Automático (Chrome)',         en: 'Auto (Chrome)' },
  'settings.lang_es':          { es: 'Español',                     en: 'Spanish' },
  'settings.lang_en':          { es: 'Inglés',                      en: 'English' },
  'settings.lang_hint':        { es: 'Cambia el idioma de la interfaz. Recarga el popup para aplicar.', en: 'Change interface language. Reload the popup to apply.' },

  'settings.history':          { es: 'Histórico de score',          en: 'Score history' },
  'settings.history_empty':    { es: 'Sin auditorías todavía. Vuelve después de unas cuantas para ver evolución.', en: 'No audits yet. Come back after a few to see trends.' },
  'settings.history_clear':    { es: 'Limpiar histórico',           en: 'Clear history' },
  'settings.history_confirm':  { es: '¿Borrar todo el histórico de auditorías?', en: 'Delete all audit history?' },

  'settings.audit_auto':       { es: 'Auditoría automática',        en: 'Auto audit' },
  'settings.audit_re':         { es: 'Re-auditar automáticamente',  en: 'Auto re-audit' },
  'settings.audit_interval':   { es: 'Intervalo:',                  en: 'Interval:' },
  'settings.audit_hourly':     { es: 'Cada hora',                   en: 'Hourly' },
  'settings.audit_6h':         { es: 'Cada 6h',                     en: 'Every 6h' },
  'settings.audit_12h':        { es: 'Cada 12h',                    en: 'Every 12h' },
  'settings.audit_daily':      { es: 'Cada 24h (recomendado)',      en: 'Every 24h (recommended)' },
  'settings.audit_weekly':     { es: 'Semanal',                     en: 'Weekly' },
  'settings.audit_fp':         { es: 'Calcular huella digital al abrir el popup', en: 'Calculate fingerprint when opening popup' },
  'settings.audit_fp_hint':    { es: 'Desactivar acelera la apertura del popup (~300ms más rápido).', en: 'Disabling speeds up popup opening (~300ms faster).' },

  'settings.view_health':      { es: 'Vista del Health Check',      en: 'Health Check view' },
  'settings.default_profile':  { es: 'Perfil por defecto:',         en: 'Default profile:' },
  'settings.show_rationale':   { es: 'Mostrar explicación:',        en: 'Show explanation:' },
  'settings.rationale_click':  { es: 'Al hacer click',              en: 'On click' },
  'settings.rationale_always': { es: 'Siempre visible',             en: 'Always visible' },
  'settings.rationale_never':  { es: 'Nunca',                       en: 'Never' },

  'settings.scriptspy':        { es: 'ScriptSpy',                   en: 'ScriptSpy' },
  'settings.spy_auto':         { es: 'Activar automáticamente al abrir el popup', en: 'Auto-activate when opening popup' },
  'settings.spy_auto_hint':    { es: 'Solo se activa en pestañas web reales (no en chrome:// ni extensiones).', en: 'Only activates on real web tabs (not chrome:// or extensions).' },
  'settings.spy_show_1p':      { es: 'Mostrar también scripts de primer partido (1st party)', en: 'Also show first-party scripts (1st party)' },
  'settings.spy_show_1p_hint': { es: 'Por defecto solo se muestran 3rd party (más relevantes para privacidad).', en: 'By default only 3rd party shown (more relevant for privacy).' },

  'settings.alerts':           { es: 'Alertas',                     en: 'Alerts' },
  'settings.alert_drop':       { es: 'Avisar si el score baja drásticamente', en: 'Alert if score drops sharply' },
  'settings.alert_threshold':  { es: 'Umbral:',                     en: 'Threshold:' },
  'settings.alert_5':          { es: '−5 puntos',                   en: '−5 points' },
  'settings.alert_10':         { es: '−10 puntos (recomendado)',    en: '−10 points (recommended)' },
  'settings.alert_20':         { es: '−20 puntos',                  en: '−20 points' },

  'settings.ai':               { es: 'Asistente IA',                en: 'AI Assistant' },
  'settings.ai_intro':         { es: 'Activa funciones IA usando <strong>tu propia API key</strong>. El contenido se envía directamente al proveedor — nunca pasa por nuestros servidores.', en: 'Enable AI features using <strong>your own API key</strong>. Content is sent directly to the provider — never through our servers.' },
  'settings.ai_features':      { es: '<strong>Funciones disponibles:</strong> Resumen de políticas de privacidad en RGPD. (Más en futuras versiones.)', en: '<strong>Available features:</strong> Privacy policy summarization in GDPR tab. (More in future versions.)' },
  'settings.ai_provider':      { es: 'Proveedor:',                  en: 'Provider:' },
  'settings.ai_model':         { es: 'Modelo:',                     en: 'Model:' },
  'settings.ai_get_key':       { es: 'Conseguir API key:',          en: 'Get API key:' },
  'settings.ai_saved':         { es: '✓ Guardado. Prueba en la pestaña RGPD → "Resumir con IA".', en: '✓ Saved. Try it in the GDPR tab → "Summarize with AI".' },

  'settings.deep_analysis':       { es: 'Análisis profundo de scripts', en: 'Deep script analysis' },
  'settings.deep_analysis_intro': { es: 'Para descargar y analizar el código fuente de scripts (hash SHA256, detección de obfuscación, APIs sospechosas, URLs hardcoded), la extensión necesita acceso a las URLs de los scripts.', en: 'To download and analyze script source code (SHA256 hash, obfuscation detection, suspicious APIs, hardcoded URLs), the extension needs access to script URLs.' },
  'settings.deep_grant':          { es: '+ Permitir descarga de scripts', en: '+ Allow script download' },
  'settings.deep_revoke':         { es: 'Revocar',                  en: 'Revoke' },
  'settings.deep_granted':        { es: '✓ Permiso concedido. Ya puedes analizar scripts en profundidad.', en: '✓ Permission granted. You can now analyze scripts in depth.' },
  'settings.deep_denied':         { es: 'Permiso denegado.',        en: 'Permission denied.' },
  'settings.deep_revoked':        { es: 'Permiso revocado.',        en: 'Permission revoked.' },

  'settings.plan':             { es: 'Plan',                        en: 'Plan' },
  'settings.plan_intro':       { es: 'Lucent es <strong>gratis</strong> y open source. Toda la funcionalidad está disponible sin pagos ni cuentas.', en: 'Lucent is <strong>free</strong> and open source. All functionality is available without payments or accounts.' },

  'settings.import_export':    { es: 'Importar / Exportar configuración', en: 'Import / Export config' },
  'settings.import_export_hint': { es: 'Guarda y restaura tus preferencias entre dispositivos. La API key de IA NO se exporta por seguridad — debes pegarla manualmente en cada equipo.', en: 'Save and restore preferences across devices. The AI API key is NOT exported for security — paste it manually on each device.' },
  'settings.export_btn':       { es: '↓ Exportar config (.json)',   en: '↓ Export config (.json)' },
  'settings.import_btn':       { es: '↑ Importar config (.json)',   en: '↑ Import config (.json)' },
  'settings.import_ok':        { es: '✓ Configuración importada correctamente.', en: '✓ Config imported successfully.' },

  'settings.data_privacy':     { es: 'Datos y privacidad',          en: 'Data & privacy' },
  'settings.clear_cache':      { es: 'Limpiar caché TI',            en: 'Clear TI cache' },
  'settings.clear_prefs':      { es: 'Restablecer preferencias',    en: 'Reset preferences' },
  'settings.cache_cleared':    { es: 'Caché de threat intelligence limpiada.', en: 'Threat intelligence cache cleared.' },
  'settings.prefs_confirm':    { es: '¿Restablecer todas las preferencias a valores por defecto?', en: 'Reset all preferences to defaults?' },
  'settings.privacy_note':     { es: 'Toda la configuración se guarda en chrome.storage.local. Se borra automáticamente al desinstalar la extensión. Nunca se transmite a ningún servidor.', en: 'All config is stored in chrome.storage.local. Deleted automatically on extension uninstall. Never transmitted to any server.' },

  'settings.about':            { es: 'Acerca de',                   en: 'About' },
  'settings.about_text':       { es: 'Lucent v0.1 · Browser security & privacy<br>Cliente open source · MIT License', en: 'Lucent v0.1 · Browser security & privacy<br>Open source client · MIT License' },
  'settings.feedback':         { es: '💬 Reportar bug / sugerencia', en: '💬 Report bug / suggestion' },
  'settings.privacy_link':     { es: 'Política privacidad',         en: 'Privacy policy' },

  // ---- Onboarding ----
  'ob.step1_title':        { es: 'Lucent — Browser Audit',    en: 'Lucent — Browser Audit' },
  'ob.step1_body':         { es: 'Inspecciona en tiempo real qué hacen los scripts de cualquier web: qué datos envían, si hacen fingerprinting, qué cookies leen.', en: 'Real-time inspection of what scripts do on any website: what data they send, if they fingerprint, what cookies they read.' },
  'ob.step1_cta':          { es: 'Siguiente →',               en: 'Next →' },
  'ob.step2_title':        { es: 'Health & RGPD',              en: 'Health & GDPR' },
  'ob.step2_body':         { es: 'Audita la configuración de Chrome contra estándares CIS/NIST/ENS. Analiza cualquier web contra criterios RGPD. Activa los permisos opcionales para checks completos.', en: 'Audit Chrome config against CIS/NIST/ENS standards. Analyze any website against GDPR criteria. Enable optional permissions for full checks.' },
  'ob.step2_cta':          { es: 'Activar permisos y empezar', en: 'Enable permissions and start' },
  'ob.skip':               { es: 'Saltar introducción',        en: 'Skip intro' },
};

const STORAGE_KEY = 'uiLanguage';
let _currentLang = null;

function detectChromeLang() {
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
    txt = txt.replace(new RegExp(`\\{${k}\\}`, 'g'), v);
  }
  // Plurals: {s} → 's' if last param.n != 1, else ''
  if (params.n !== undefined) {
    txt = txt.replace(/\{s\}/g, params.n === 1 ? '' : 's');
    txt = txt.replace(/\{es\}/g, params.n === 1 ? '' : 'es');
  }
  return txt;
}

export async function initI18n() {
  await getLanguage();
}
