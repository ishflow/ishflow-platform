import { describe, expect, it } from 'vitest';
import { slugifyFilename } from './slugify-filename';

function isAsciiOnly(s: string): boolean {
  return Array.from(s).every((ch) => ch.charCodeAt(0) <= 127);
}

describe('slugifyFilename', () => {
  it('leaves an already-safe ASCII filename unchanged', () => {
    expect(slugifyFilename('report.pdf')).toBe('report.pdf');
  });

  it('transliterates Cyrillic characters', () => {
    const result = slugifyFilename('Счёт-фактура №123.pdf');
    expect(result).toMatch(/^[A-Za-z0-9._-]+\.pdf$/);
    expect(isAsciiOnly(result)).toBe(true);
  });

  it('transliterates Turkish characters', () => {
    const result = slugifyFilename('fatura_şirket.pdf');
    expect(result).toMatch(/^[A-Za-z0-9._-]+\.pdf$/);
    expect(isAsciiOnly(result)).toBe(true);
  });

  it('transliterates German umlauts', () => {
    const result = slugifyFilename('Übergabe.docx');
    expect(result).toMatch(/^[A-Za-z0-9._-]+\.docx$/);
    expect(isAsciiOnly(result)).toBe(true);
  });

  it('replaces spaces and special chars with underscores', () => {
    const result = slugifyFilename('my file (1).pdf');
    expect(result).toMatch(/^[A-Za-z0-9._-]+\.pdf$/);
    expect(result).not.toContain(' ');
  });

  it('collapses multiple consecutive underscores', () => {
    const result = slugifyFilename('file   name.pdf');
    expect(result).not.toMatch(/__+/);
  });

  it('falls back to "file" when stem is empty after slugifying', () => {
    const result = slugifyFilename('!!!.pdf');
    expect(result).toMatch(/^file.*\.pdf$/);
  });

  it('truncates a very long stem to 80 chars while preserving extension', () => {
    const longName = `${'a'.repeat(200)}.pdf`;
    const result = slugifyFilename(longName);
    const dotIdx = result.lastIndexOf('.');
    const stem = result.slice(0, dotIdx);
    const ext = result.slice(dotIdx + 1);
    expect(stem.length).toBeLessThanOrEqual(80);
    expect(ext).toBe('pdf');
  });

  it('handles a filename with no extension', () => {
    const result = slugifyFilename('Счёт без расширения');
    expect(result).toMatch(/^[A-Za-z0-9._-]+$/);
    expect(isAsciiOnly(result)).toBe(true);
  });

  it('preserves dots and hyphens in the stem', () => {
    const result = slugifyFilename('file-v1.2.3.tar.gz');
    expect(result).toMatch(/^[A-Za-z0-9._-]+$/);
  });
});
