import {
  type PDFDocument as PDFDocumentType,
  type PDFFont,
  type PDFPage,
  StandardFonts,
  rgb,
} from 'pdf-lib';
import { PDFDocument } from 'pdf-lib';

/**
 * Shared pdf-lib primitives for ishflow print forms (печатные формы).
 *
 * All forms follow the same skeleton: tenant header + numbered title + meta
 * rows + optional lines table + totals + signature footer. Each caller picks
 * which sections to render via the returned builder API.
 *
 * Only ASCII-safe characters should be passed through these helpers — the
 * built-in Helvetica font does not support Cyrillic glyphs. Callers targeting
 * Russian forms should pre-transliterate or accept that Cyrillic will render
 * as �. Demo routes stick to English labels + ASCII-only content for
 * correctness; a Sprint 16+ task can swap in a Unicode TTF (e.g. Roboto)
 * registered via pdf-lib's fontkit extension.
 */

export type PrintFormBuilder = {
  pdf: PDFDocumentType;
  page: PDFPage;
  font: PDFFont;
  bold: PDFFont;
  width: number;
  height: number;
  margin: number;
  y: number;
};

export async function startPrintForm(): Promise<PrintFormBuilder> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const page = pdf.addPage();
  const { width, height } = page.getSize();
  const margin = 48;
  return { pdf, page, font, bold, width, height, margin, y: height - margin };
}

export function sanitize(s: string | null | undefined): string {
  if (!s) return '';
  // Helvetica can't encode non-latin1 — replace anything outside 0x20-0x7E
  // with a '?' placeholder so the PDF renders without throwing. Cyrillic /
  // Turkish glyphs collapse to '?'. Good enough for MVP print forms.
  return s.replace(/[^\x20-\x7E]/g, '?');
}

export function heading(b: PrintFormBuilder, text: string, size = 18): void {
  b.page.drawText(sanitize(text), {
    x: b.margin,
    y: b.y,
    size,
    font: b.bold,
    color: rgb(0.1, 0.1, 0.1),
  });
  b.y -= size + 10;
}

export function subheading(b: PrintFormBuilder, text: string, size = 14): void {
  b.page.drawText(sanitize(text), {
    x: b.margin,
    y: b.y,
    size,
    font: b.bold,
  });
  b.y -= size + 6;
}

export function metaRow(b: PrintFormBuilder, label: string, value: string): void {
  b.page.drawText(`${sanitize(label)}:`, { x: b.margin, y: b.y, size: 11, font: b.bold });
  b.page.drawText(sanitize(value), {
    x: b.margin + 120,
    y: b.y,
    size: 11,
    font: b.font,
  });
  b.y -= 16;
}

export function horizontalRule(b: PrintFormBuilder): void {
  b.page.drawLine({
    start: { x: b.margin, y: b.y },
    end: { x: b.width - b.margin, y: b.y },
    thickness: 0.5,
    color: rgb(0.4, 0.4, 0.4),
  });
  b.y -= 8;
}

export type TableCol = {
  header: string;
  /** x offset from page margin */
  offset: number;
  /** optional right-align width (used for numbers). Defaults to left-aligned. */
  width?: number;
};

export function tableHeader(b: PrintFormBuilder, cols: TableCol[]): void {
  for (const col of cols) {
    b.page.drawText(sanitize(col.header), {
      x: b.margin + col.offset,
      y: b.y,
      size: 11,
      font: b.bold,
    });
  }
  b.y -= 4;
  horizontalRule(b);
  b.y -= 6;
}

export function tableRow(
  b: PrintFormBuilder,
  cells: Array<{ value: string; offset: number }>,
): void {
  if (b.y < b.margin + 40) {
    const p = b.pdf.addPage();
    const size = p.getSize();
    b.page = p;
    b.width = size.width;
    b.height = size.height;
    b.y = size.height - b.margin;
  }
  for (const c of cells) {
    b.page.drawText(sanitize(c.value), {
      x: b.margin + c.offset,
      y: b.y,
      size: 10,
      font: b.font,
    });
  }
  b.y -= 14;
}

export function signatureBlock(
  b: PrintFormBuilder,
  labels: { director: string; accountant: string },
): void {
  b.y -= 20;
  b.page.drawText(`${sanitize(labels.director)}: ____________________________`, {
    x: b.margin,
    y: b.y,
    size: 10,
    font: b.font,
  });
  b.y -= 18;
  b.page.drawText(`${sanitize(labels.accountant)}: ____________________________`, {
    x: b.margin,
    y: b.y,
    size: 10,
    font: b.font,
  });
}

export async function finishPrintForm(b: PrintFormBuilder, filename: string): Promise<Response> {
  const bytes = await b.pdf.save();
  const bodyInit = new Uint8Array(bytes) as unknown as BodyInit;
  return new Response(bodyInit, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${sanitize(filename)}.pdf"`,
    },
  });
}

export function formatMoney(currency: string, amount: number): string {
  return `${currency} ${amount.toFixed(2)}`;
}
