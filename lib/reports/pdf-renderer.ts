import PDFDocument from 'pdfkit';

export interface PDFInput {
  tenantName: string;
  title: string;
  periodLabel: string;
  currency: string;
  heroValue: number;
  heroDeltaPct: number | null;
  heroDeltaSign: 'up' | 'down' | 'flat';
  headers: string[];
  rows: Array<Array<string | number>>;
  totalLabel: string;
  totalValue: number;
  generatedAt: Date;
}

const A4 = { width: 595.28, height: 841.89 };
const MARGIN = 50;

export async function renderReportAsPDF(input: PDFInput): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const doc = new PDFDocument({ size: 'A4', margin: MARGIN });
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(new Uint8Array(Buffer.concat(chunks))));
    doc.on('error', reject);

    try {
      // Header band
      doc.font('Helvetica-Bold').fontSize(16).text(input.tenantName, { continued: false });
      doc
        .font('Helvetica')
        .fontSize(11)
        .fillColor('#444')
        .text(`${input.title} · ${input.periodLabel}`);
      doc
        .moveDown(0.5)
        .strokeColor('#bbb')
        .lineWidth(0.5)
        .moveTo(MARGIN, doc.y)
        .lineTo(A4.width - MARGIN, doc.y)
        .stroke();
      doc.moveDown(0.8);

      // Hero card
      const currencyFmt = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: input.currency,
      });
      doc
        .fillColor('#000')
        .font('Helvetica-Bold')
        .fontSize(28)
        .text(currencyFmt.format(input.heroValue));
      if (input.heroDeltaPct !== null) {
        const arrow =
          input.heroDeltaSign === 'up' ? '↑' : input.heroDeltaSign === 'down' ? '↓' : '·';
        const color =
          input.heroDeltaSign === 'up'
            ? '#0a8a3e'
            : input.heroDeltaSign === 'down'
              ? '#c03333'
              : '#666';
        doc
          .font('Helvetica')
          .fontSize(11)
          .fillColor(color)
          .text(`${arrow} ${Math.abs(input.heroDeltaPct).toFixed(1)} % vs önceki dönem`);
      }
      doc.fillColor('#000').moveDown(1.2);

      drawTable(doc, input);

      doc.font('Helvetica').fontSize(9).fillColor('#777');
      const footer = `Oluşturuldu: ${input.generatedAt.toISOString().slice(0, 16).replace('T', ' ')}`;
      doc.text(footer, MARGIN, A4.height - MARGIN, { width: A4.width - 2 * MARGIN, align: 'left' });
    } catch (e) {
      reject(e);
      return;
    }
    doc.end();
  });
}

function drawTable(doc: PDFKit.PDFDocument, input: PDFInput) {
  const colCount = input.headers.length;
  const usable = A4.width - 2 * MARGIN;
  const colW = usable / colCount;
  const rowH = 20;

  const drawHeaderRow = () => {
    doc.font('Helvetica-Bold').fontSize(10).fillColor('#000');
    input.headers.forEach((h, i) => {
      doc.text(h, MARGIN + i * colW, doc.y, { width: colW, continued: i < colCount - 1 });
    });
    doc.moveDown(0.5);
    doc.font('Helvetica').fontSize(10);
  };

  drawHeaderRow();

  for (const row of input.rows) {
    if (doc.y + rowH > A4.height - MARGIN - 40) {
      doc.addPage();
      drawHeaderRow();
    }
    row.forEach((cell, i) => {
      doc.text(String(cell), MARGIN + i * colW, doc.y, {
        width: colW,
        continued: i < colCount - 1,
      });
    });
    doc.moveDown(0.5);
  }

  doc.moveDown(0.5).font('Helvetica-Bold').fontSize(11);
  const fmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: input.currency });
  doc.text(`${input.totalLabel}: ${fmt.format(input.totalValue)}`, MARGIN, doc.y, {
    width: usable,
    align: 'right',
  });
}
