import { describe, expect, it } from 'vitest';
import { tr } from './i18n';

describe('tr', () => {
  it('resolves en', () => {
    const m = tr('tool.errors.not_found', 'en');
    expect(m).toBeTruthy();
    expect(m).toMatch(/not found/i);
  });

  it('resolves ru', () => {
    const m = tr('tool.errors.not_found', 'ru');
    expect(m).toBeTruthy();
    expect(m).toMatch(/не найден/);
  });

  it('resolves tr', () => {
    const m = tr('tool.errors.not_found', 'tr');
    expect(m).toBeTruthy();
    expect(m).toMatch(/bulunamadı/);
  });

  it('falls back to en for an unknown locale', () => {
    const m = tr('tool.errors.not_found', 'xx');
    const en = tr('tool.errors.not_found', 'en');
    expect(m).toBe(en);
  });

  it('returns null for keys missing in every locale', () => {
    expect(tr('tool.errors.totally.made.up', 'en')).toBeNull();
    expect(tr('tool.errors.totally.made.up', 'ru')).toBeNull();
  });
});
