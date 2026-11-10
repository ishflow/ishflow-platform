/**
 * Serialize a value for safe embedding in a
 * `<script type="application/ld+json">` via `dangerouslySetInnerHTML`.
 *
 * `JSON.stringify` does NOT escape `<`, `>`, `&`, or the U+2028/U+2029 line
 * separators, so a value containing `</script>` (or those characters) can break
 * out of the script element — an XSS vector when any field is attacker- or
 * CMS-authored. We escape them to `\uXXXX`, which JSON parsers still decode to
 * the same characters (so the structured data is unchanged). Finding B3.
 */
const LINE_SEP = new RegExp(String.fromCharCode(0x2028), 'g');
const PARA_SEP = new RegExp(String.fromCharCode(0x2029), 'g');

export function jsonLdSafe(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(LINE_SEP, '\\u2028')
    .replace(PARA_SEP, '\\u2029');
}
