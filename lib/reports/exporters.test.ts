import { describe, expect, it } from 'vitest';
import { formatAsCsv, formatAsXlsx } from './exporters';

describe('formatAsCsv', () => {
  it('formats headers and rows as CSV', () => {
    const headers = ['Name', 'Value'];
    const rows = [
      ['Alice', 100],
      ['Bob', 200],
    ];
    const bytes = formatAsCsv(headers, rows);
    const text = new TextDecoder().decode(bytes);
    expect(text).toContain('Name,Value');
    expect(text).toContain('Alice,100');
    expect(text).toContain('Bob,200');
  });

  it('quotes fields with commas', () => {
    const headers = ['Name', 'Value'];
    const rows = [['Alice, Jr.', 100]];
    const bytes = formatAsCsv(headers, rows);
    const text = new TextDecoder().decode(bytes);
    expect(text).toContain('"Alice, Jr.",100');
  });

  it('includes BOM', () => {
    const bytes = formatAsCsv(['A'], [['B']]);
    expect(bytes[0]).toBe(0xef);
    expect(bytes[1]).toBe(0xbb);
    expect(bytes[2]).toBe(0xbf);
  });
});

describe('formatAsXlsx', () => {
  it('creates valid xlsx with correct sheet name and headers', async () => {
    const headers = ['Quantity', 'Revenue', 'Cost', 'Margin', 'Margin %'];
    const rows = [[1, '100.00', '50.00', '50.00', '50.00']];
    const bytes = await formatAsXlsx(headers, rows, 'gross-profit');

    const ExcelJS = await import('exceljs');
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(bytes.buffer as ArrayBuffer);

    const worksheet = workbook.getWorksheet('gross-profit');
    expect(worksheet).toBeDefined();
    expect(worksheet!.getRow(1).getCell(1).value).toBe('Quantity');
    expect(worksheet!.getRow(1).getCell(2).value).toBe('Revenue');
    expect(worksheet!.getRow(1).getCell(3).value).toBe('Cost');
    expect(worksheet!.getRow(1).getCell(4).value).toBe('Margin');
    expect(worksheet!.getRow(1).getCell(5).value).toBe('Margin %');
  });
});
