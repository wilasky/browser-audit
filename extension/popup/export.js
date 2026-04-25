import { jsPDF } from 'jspdf';

// --- JSON export ---

export function exportAuditJSON(audit) {
  const data = {
    exportedAt: new Date().toISOString(),
    tool: 'Browser Audit v0.1',
    score: audit.score,
    label: audit.label,
    baselineVersion: audit.baselineVersion,
    completedAt: new Date(audit.completedAt).toISOString(),
    results: audit.results.map((r) => ({
      id: r.id,
      category: r.category,
      title: r.title,
      severity: r.severity,
      status: r.status,
      detail: r.detail,
    })),
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `browser-audit-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// --- PDF export ---

const STATUS_SYMBOL = { pass: '✓', fail: '✗', warn: '⚠', skipped: '—', unknown: '?' };
const STATUS_COLOR = {
  pass: [34, 197, 94],
  fail: [239, 68, 68],
  warn: [245, 158, 11],
  skipped: [100, 100, 100],
  unknown: [100, 100, 100],
};

export function exportAuditPDF(audit) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = 210; const MARGIN = 14;
  let y = 20;

  // Header
  doc.setFontSize(20); doc.setFont('helvetica', 'bold');
  doc.text('Browser Audit Report', MARGIN, y);
  y += 8;

  doc.setFontSize(10); doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  doc.text(`Fecha: ${new Date(audit.completedAt).toLocaleString()}`, MARGIN, y);
  doc.text(`Baseline: v${audit.baselineVersion}${audit.profileLabel ? ` · Vista: ${audit.profileLabel}` : ''}`, W / 2, y);
  y += 12;

  // Score circle (text version)
  const scoreColor = audit.level === 'green' ? [34, 197, 94] : audit.level === 'amber' ? [245, 158, 11] : [239, 68, 68];
  doc.setFillColor(...scoreColor);
  doc.circle(MARGIN + 12, y + 8, 12, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16); doc.setFont('helvetica', 'bold');
  doc.text(String(audit.score), MARGIN + 12, y + 10, { align: 'center' });

  doc.setTextColor(0);
  doc.setFontSize(14);
  doc.text(audit.label, MARGIN + 28, y + 6);
  doc.setFontSize(10); doc.setFont('helvetica', 'normal');
  doc.setTextColor(80);
  doc.text(`${audit.results.filter((r) => r.status === 'pass').length} chequeos OK · ` +
    `${audit.results.filter((r) => r.status === 'fail').length} fallos · ` +
    `${audit.results.filter((r) => r.status === 'warn').length} avisos`, MARGIN + 28, y + 13);

  y += 30;

  // Results by category
  const byCategory = {};
  for (const r of audit.results) {
    if (!byCategory[r.category]) { byCategory[r.category] = []; }
    byCategory[r.category].push(r);
  }

  for (const [cat, checks] of Object.entries(byCategory)) {
    if (y > 260) { doc.addPage(); y = 20; }

    doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(0);
    doc.text(cat.toUpperCase(), MARGIN, y);
    y += 2;
    doc.setDrawColor(200); doc.line(MARGIN, y, W - MARGIN, y);
    y += 5;

    for (const r of checks) {
      if (y > 270) { doc.addPage(); y = 20; }
      const [cr, cg, cb] = STATUS_COLOR[r.status] ?? [100, 100, 100];
      doc.setTextColor(cr, cg, cb);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
      doc.text(STATUS_SYMBOL[r.status] ?? '?', MARGIN, y);

      doc.setTextColor(0); doc.setFont('helvetica', 'normal');
      doc.text(r.title, MARGIN + 6, y);

      if (r.detail) {
        doc.setTextColor(120); doc.setFontSize(8);
        const lines = doc.splitTextToSize(r.detail, W - MARGIN * 2 - 6);
        doc.text(lines, MARGIN + 6, y + 4);
        y += 4 + lines.length * 3.5;
      } else {
        y += 6;
      }
    }
    y += 4;
  }

  // Footer
  doc.setFontSize(8); doc.setTextColor(150);
  doc.text('Generado por Browser Audit · https://github.com/wilasky/browser-audit', MARGIN, 290);

  doc.save(`browser-audit-${new Date().toISOString().slice(0, 10)}.pdf`);
}
