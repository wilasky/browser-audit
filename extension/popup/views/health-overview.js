const STATUS_ICON = { pass: '✓', warn: '⚠', fail: '✗', skipped: '—', unknown: '?' };
const STATUS_CLASS = { pass: 'pass', warn: 'warn', fail: 'fail', skipped: 'skip', unknown: 'skip' };

function scoreCircleSVG(score, level) {
  const r = 44;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  const color = level === 'green' ? '#22c55e' : level === 'amber' ? '#f59e0b' : '#ef4444';

  return `
    <svg viewBox="0 0 100 100" class="score-circle">
      <circle cx="50" cy="50" r="${r}" fill="none" stroke="#2a2a2e" stroke-width="10"/>
      <circle cx="50" cy="50" r="${r}" fill="none" stroke="${color}" stroke-width="10"
        stroke-dasharray="${dash.toFixed(1)} ${circ.toFixed(1)}"
        stroke-dashoffset="${circ / 4}"
        stroke-linecap="round"/>
      <text x="50" y="54" text-anchor="middle" font-size="22" font-weight="700" fill="${color}">${score}</text>
    </svg>`;
}

function groupByCategory(results, categories) {
  const map = {};
  for (const cat of categories) { map[cat.id] = { ...cat, checks: [] }; }
  for (const r of results) {
    if (map[r.category]) { map[r.category].checks.push(r); }
  }
  return Object.values(map).filter((c) => c.checks.length > 0);
}

function renderCheck(r) {
  const cls = STATUS_CLASS[r.status] ?? 'skip';
  const icon = STATUS_ICON[r.status] ?? '?';
  const showFix = r.fix && r.status !== 'pass' && r.status !== 'skipped';
  // Use data-check-id only — fix data stays in JS, never in HTML attributes
  const fixBtn = showFix
    ? `<button class="fix-btn" data-check-id="${r.id}">Arreglar</button>`
    : '';

  return `
    <li class="check-item check-${cls}">
      <span class="check-icon">${icon}</span>
      <span class="check-title">${r.title}</span>
      <span class="check-detail">${r.detail ?? ''}</span>
      ${fixBtn}
    </li>`;
}

function renderCategory(cat) {
  const checks = cat.checks.map(renderCheck).join('');
  return `
    <section class="category">
      <h2 class="cat-title">${cat.icon} ${cat.label}</h2>
      <ul class="check-list">${checks}</ul>
    </section>`;
}

function applyFix(fix) {
  if ((fix.type === 'navigate' || fix.type === 'externalLink') && fix.url) {
    chrome.tabs.create({ url: fix.url });
  } else if (fix.type === 'showInstructions' && fix.instructions) {
    alert(fix.instructions);
  }
}

function sendMsg(msg) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(msg, (result) => {
      void chrome.runtime.lastError;
      resolve(result ?? null);
    });
  });
}

export function renderHealthOverview(audit, container) {
  const { label, level } = audit;
  const groups = groupByCategory(audit.results, audit.categories);

  // Build fix lookup map before touching the DOM
  const fixMap = {};
  for (const r of audit.results) {
    if (r.fix) { fixMap[r.id] = r.fix; }
  }

  container.innerHTML = `
    <div class="overview-header">
      ${scoreCircleSVG(audit.score, level)}
      <div class="score-meta">
        <div class="score-label">${label}</div>
        <div class="score-sub">Auditado ${new Date(audit.completedAt).toLocaleTimeString()}</div>
        <button id="btn-refresh" class="btn-secondary">Actualizar</button>
        <button id="btn-grant-permissions" class="btn-secondary">Activar chequeos</button>
      </div>
    </div>
    <div class="categories">${groups.map(renderCategory).join('')}</div>`;

  container.querySelector('#btn-refresh').addEventListener('click', async () => {
    container.innerHTML = '<p class="loading">Auditando…</p>';
    const freshAudit = await sendMsg({ type: 'run_audit' });
    if (freshAudit) { renderHealthOverview(freshAudit, container); }
  });

  container.querySelector('#btn-grant-permissions').addEventListener('click', () => {
    chrome.permissions.request({ permissions: ['management', 'privacy'] }, async (granted) => {
      void chrome.runtime.lastError;
      if (granted) {
        container.innerHTML = '<p class="loading">Auditando con todos los permisos…</p>';
        const freshAudit = await sendMsg({ type: 'run_audit' });
        if (freshAudit) { renderHealthOverview(freshAudit, container); }
      }
    });
  });

  container.querySelectorAll('.fix-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const fix = fixMap[btn.dataset.checkId];
      if (fix) { applyFix(fix); }
    });
  });
}
