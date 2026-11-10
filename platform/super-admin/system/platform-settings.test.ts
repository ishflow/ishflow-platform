import { describe, expect, it } from 'vitest';
import { parseJsonValue } from './platform-settings';

describe('parseJsonValue', () => {
  it('accepts a valid JSON boolean', () => {
    const r = parseJsonValue('true');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toBe(true);
  });

  it('accepts a JSON object', () => {
    const r = parseJsonValue('{"a":1}');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toEqual({ a: 1 });
  });

  it('rejects empty input', () => {
    const r = parseJsonValue('');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/empty/);
  });

  it('rejects whitespace-only input', () => {
    const r = parseJsonValue('   ');
    expect(r.ok).toBe(false);
  });

  it('rejects malformed JSON', () => {
    const r = parseJsonValue('{bad');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/invalid JSON/);
  });

  it('rejects bare `undefined`', () => {
    // JSON.parse throws on the literal `undefined`, treated as invalid.
    const r = parseJsonValue('undefined');
    expect(r.ok).toBe(false);
  });

  it('accepts a JSON string', () => {
    const r = parseJsonValue('"hello"');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toBe('hello');
  });
});
