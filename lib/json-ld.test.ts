import { describe, expect, it } from 'vitest';
import { jsonLdSafe } from './json-ld';

/**
 * Finding B3: JSON.stringify output embedded in a <script type="application/
 * ld+json"> via dangerouslySetInnerHTML does NOT escape `<`/`>`/`&`, so a value
 * containing `</script>` can break out of the element.
 */
describe('jsonLdSafe', () => {
  it('escapes </script> so it cannot break out of the script tag', () => {
    const out = jsonLdSafe({ name: '</script><script>alert(1)</script>' });
    expect(out).not.toContain('</script>');
    expect(out).not.toContain('<script>');
    expect(out).toContain('\\u003c');
  });

  it('round-trips to the original value', () => {
    const obj = { a: '</script>', b: 1, c: ['x>y', 'a<b', 'p&q'] };
    expect(JSON.parse(jsonLdSafe(obj))).toEqual(obj);
  });

  it('escapes the U+2028/U+2029 line separators', () => {
    const sep = String.fromCharCode(0x2028) + String.fromCharCode(0x2029);
    const out = jsonLdSafe({ s: sep });
    expect(out).toContain('\\u2028');
    expect(out).toContain('\\u2029');
  });
});
