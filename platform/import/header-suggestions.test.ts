import { describe, expect, it } from 'vitest';
import { suggestHeaderMapping } from './header-suggestions';

describe('suggestHeaderMapping', () => {
  it('matches exact header to field name', () => {
    const out = suggestHeaderMapping(
      ['name', 'email'],
      [
        { key: 'name', labels: ['Name', 'Имя', 'Ad'] },
        { key: 'email', labels: ['Email'] },
      ],
    );
    expect(out).toEqual({ name: 'name', email: 'email' });
  });

  it('matches Russian and Turkish localised labels', () => {
    const out = suggestHeaderMapping(
      ['Наименование', 'Телефон'],
      [
        { key: 'name', labels: ['Name', 'Наименование', 'Ad'] },
        { key: 'phone', labels: ['Phone', 'Телефон', 'Telefon'] },
      ],
    );
    expect(out).toEqual({ Наименование: 'name', Телефон: 'phone' });
  });

  it('is case-insensitive and ignores surrounding whitespace', () => {
    const out = suggestHeaderMapping(
      [' NAME ', ' E-MAIL '],
      [
        { key: 'name', labels: ['Name'] },
        { key: 'email', labels: ['Email', 'E-mail'] },
      ],
    );
    expect(out).toEqual({ ' NAME ': 'name', ' E-MAIL ': 'email' });
  });

  it('returns null for headers with no plausible match', () => {
    const out = suggestHeaderMapping(['foo', 'bar'], [{ key: 'name', labels: ['Name'] }]);
    expect(out).toEqual({ foo: null, bar: null });
  });

  it('does not double-assign the same field to two headers', () => {
    const out = suggestHeaderMapping(
      ['Name', 'Full Name'],
      [{ key: 'name', labels: ['Name', 'Full Name'] }],
    );
    expect(out.Name).toBe('name');
    expect(out['Full Name']).toBeNull();
  });
});
