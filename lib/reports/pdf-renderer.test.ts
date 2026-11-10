import { describe, expect, it } from 'vitest';
import { renderReportAsPDF } from './pdf-renderer';

describe('renderReportAsPDF', () => {
  it('produces a valid PDF byte stream starting with %PDF magic', async () => {
    const bytes = await renderReportAsPDF({
      tenantName: 'Acme Trading',
      title: 'Müşteri borçları (A/R Aging)',
      periodLabel: '1 May 2026 — 11 May 2026',
      currency: 'USD',
      heroValue: 492715.4,
      heroDeltaPct: null,
      heroDeltaSign: 'flat',
      headers: ['Müşteri', 'Tutar', 'Yaş'],
      rows: [
        ['Ulugbek Trading', '433 401', '31-60'],
        ['Test Customer', '59 314', '0-30'],
      ],
      totalLabel: 'Toplam',
      totalValue: 492715.4,
      generatedAt: new Date('2026-05-11T22:00:00Z'),
    });
    expect(bytes.length).toBeGreaterThan(500);
    const head = Buffer.from(bytes.slice(0, 5)).toString();
    expect(head).toBe('%PDF-');
  });

  it('paginates when rows exceed one page (>30 rows)', async () => {
    const rows = Array.from({ length: 80 }, (_, i) => [`Row ${i + 1}`, String(i * 100), '0-30']);
    const bytes = await renderReportAsPDF({
      tenantName: 'Big Co',
      title: 'Stress test',
      periodLabel: '—',
      currency: 'USD',
      heroValue: 0,
      heroDeltaPct: null,
      heroDeltaSign: 'flat',
      headers: ['Name', 'Amount', 'Bucket'],
      rows,
      totalLabel: 'Total',
      totalValue: 0,
      generatedAt: new Date(),
    });
    expect(bytes.length).toBeGreaterThan(2000);
  });
});
