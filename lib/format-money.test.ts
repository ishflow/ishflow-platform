import { describe, expect, it } from 'vitest';
import { formatMoney } from './format-money';

describe('formatMoney', () => {
  it('formats USD in en-US locale', () => {
    const result = formatMoney(1234.5, 'en-US', 'USD');
    expect(result).toContain('$1,234.50');
  });

  it('formats RUB in ru-RU locale — non-empty and contains RUB or ₽', () => {
    const result = formatMoney(1234.5, 'ru-RU', 'RUB');
    expect(result.length).toBeGreaterThan(0);
    expect(result.includes('RUB') || result.includes('₽')).toBe(true);
  });

  it('returns em-dash for null', () => {
    expect(formatMoney(null, 'en-US', 'USD')).toBe('—');
  });

  it('returns em-dash for undefined', () => {
    expect(formatMoney(undefined, 'en-US', 'USD')).toBe('—');
  });

  it('returns em-dash for empty string', () => {
    expect(formatMoney('', 'en-US', 'USD')).toBe('—');
  });

  it('accepts string input and formats it', () => {
    const result = formatMoney('99.99', 'en-US', 'USD');
    expect(result).toContain('99.99');
  });

  it('returns raw string for NaN input', () => {
    const result = formatMoney('not-a-number', 'en-US', 'USD');
    expect(result).toBe('not-a-number');
  });

  it('formats without currency symbol when currency is omitted', () => {
    const result = formatMoney(10, 'en-US');
    expect(result).toBe('10.00');
  });

  it('formats without currency symbol when currency is empty string', () => {
    const result = formatMoney(10, 'en-US', '');
    expect(result).toBe('10.00');
  });
});
