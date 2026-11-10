/**
 * Client-side CSV export from a rendered `<table class="data">` element.
 *
 * Used by the shared list toolbars (V2DocFilterBar, ProductListTable) so the
 * "Dışa aktar" / "Export" button produces a real download without a per-entity
 * server endpoint. Reads the table directly from the DOM, so the exported
 * data matches exactly what the user sees (including the current search/chip
 * filter applied to the URL).
 *
 * Limitations:
 *  - Only the visible page is exported (consistent with what's on screen).
 *  - Cells render text; embedded HTML (pills, links) is flattened via
 *    `textContent`.
 *
 * Sanitizes leading `=+-@` to prevent CSV-injection (Excel formulas) by
 * prefixing those cells with a single apostrophe.
 */
export function exportTableToCsv(table: HTMLTableElement, filename: string) {
  const rows: string[][] = [];

  const headerCells = Array.from(table.tHead?.rows[0]?.cells ?? []);
  if (headerCells.length > 0) {
    rows.push(headerCells.map((th) => (th.textContent ?? '').trim()));
  }

  for (const body of Array.from(table.tBodies)) {
    for (const tr of Array.from(body.rows)) {
      const cells = Array.from(tr.cells).map((td) => (td.textContent ?? '').trim());
      rows.push(cells);
    }
  }

  const csv = rows.map((row) => row.map(csvCell).join(',')).join('\n');
  const blob = new Blob(['﻿', csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

function csvCell(raw: string): string {
  const needsEscape = /[",\n\r]/.test(raw);
  const safe = /^[=+\-@]/.test(raw) ? `'${raw}` : raw;
  if (needsEscape) {
    return `"${safe.replace(/"/g, '""')}"`;
  }
  return safe;
}

/**
 * Convenience helper: find the nearest `<table class="data">` to `anchorEl`
 * (walking up to `[data-table-card]` then back down) and export it. Used by
 * toolbar buttons that don't have a direct ref to the table.
 */
export function exportNearestTable(anchorEl: HTMLElement, filename: string) {
  const card =
    (anchorEl.closest('[data-table-card]') as HTMLElement | null) ??
    (anchorEl.closest('.table-card') as HTMLElement | null) ??
    document;
  const table = (card.querySelector('table.data') ??
    card.querySelector('table')) as HTMLTableElement | null;
  if (!table) return false;
  exportTableToCsv(table, filename);
  return true;
}
