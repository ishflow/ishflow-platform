/**
 * Minimal CP1251 (Windows-1251) → UTF-16 decoder.
 *
 * Node has no native CP1251 codec. 1С-Bank-Client v1.02 exports are CP1251 by
 * convention. Rather than pull in `iconv-lite`, we ship the mapping inline —
 * it's a single byte page (256 codepoints) and the values are stable.
 *
 * Bytes 0x00-0x7F map identically to ASCII; bytes 0x80-0xFF map to the
 * Russian Cyrillic block, the Ukrainian/Belarusian extras, and a few symbols.
 */

// Codepoints for 0x80..0xFF, indexed by (byte - 0x80).
// Reference: https://en.wikipedia.org/wiki/Windows-1251
const CP1251_HIGH = [
  0x0402, 0x0403, 0x201a, 0x0453, 0x201e, 0x2026, 0x2020, 0x2021, 0x20ac, 0x2030, 0x0409, 0x2039,
  0x040a, 0x040c, 0x040b, 0x040f, 0x0452, 0x2018, 0x2019, 0x201c, 0x201d, 0x2022, 0x2013, 0x2014,
  0xfffd, 0x2122, 0x0459, 0x203a, 0x045a, 0x045c, 0x045b, 0x045f, 0x00a0, 0x040e, 0x045e, 0x0408,
  0x00a4, 0x0490, 0x00a6, 0x00a7, 0x0401, 0x00a9, 0x0404, 0x00ab, 0x00ac, 0x00ad, 0x00ae, 0x0407,
  0x00b0, 0x00b1, 0x0406, 0x0456, 0x0491, 0x00b5, 0x00b6, 0x00b7, 0x0451, 0x2116, 0x0454, 0x00bb,
  0x0458, 0x0405, 0x0455, 0x0457, 0x0410, 0x0411, 0x0412, 0x0413, 0x0414, 0x0415, 0x0416, 0x0417,
  0x0418, 0x0419, 0x041a, 0x041b, 0x041c, 0x041d, 0x041e, 0x041f, 0x0420, 0x0421, 0x0422, 0x0423,
  0x0424, 0x0425, 0x0426, 0x0427, 0x0428, 0x0429, 0x042a, 0x042b, 0x042c, 0x042d, 0x042e, 0x042f,
  0x0430, 0x0431, 0x0432, 0x0433, 0x0434, 0x0435, 0x0436, 0x0437, 0x0438, 0x0439, 0x043a, 0x043b,
  0x043c, 0x043d, 0x043e, 0x043f, 0x0440, 0x0441, 0x0442, 0x0443, 0x0444, 0x0445, 0x0446, 0x0447,
  0x0448, 0x0449, 0x044a, 0x044b, 0x044c, 0x044d, 0x044e, 0x044f,
];

export function decodeCp1251(buf: Buffer): string {
  const out: number[] = new Array(buf.length);
  for (let i = 0; i < buf.length; i++) {
    const byte = buf[i] ?? 0;
    if (byte < 0x80) {
      out[i] = byte;
    } else {
      out[i] = CP1251_HIGH[byte - 0x80] ?? 0xfffd;
    }
  }
  return String.fromCodePoint(...out);
}

/**
 * Heuristic encoding detection: returns `'utf-8'` when the buffer starts with
 * the UTF-8 BOM (`EF BB BF`), parses cleanly as UTF-8, OR contains no bytes in
 * the 0xC0-0xFF range; otherwise returns `'cp1251'` (the de-facto Russian
 * legacy encoding for 1С-Bank exports).
 *
 * NOT a general-purpose codec sniffer — we only care about distinguishing
 * UTF-8 from CP1251 for Russian bank statements.
 */
export function detectEncoding(buf: Buffer): 'utf-8' | 'cp1251' {
  if (buf.length >= 3 && buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) {
    return 'utf-8';
  }
  // Sniff UTF-8 validity: walk bytes and verify any 0x80-0xFF byte is part of
  // a well-formed UTF-8 sequence. A single stray high byte → CP1251.
  let i = 0;
  while (i < buf.length) {
    const b = buf[i] ?? 0;
    if (b < 0x80) {
      i++;
      continue;
    }
    if ((b & 0xe0) === 0xc0) {
      // 2-byte sequence
      if (i + 1 >= buf.length) return 'cp1251';
      if (((buf[i + 1] ?? 0) & 0xc0) !== 0x80) return 'cp1251';
      i += 2;
    } else if ((b & 0xf0) === 0xe0) {
      if (i + 2 >= buf.length) return 'cp1251';
      if (((buf[i + 1] ?? 0) & 0xc0) !== 0x80 || ((buf[i + 2] ?? 0) & 0xc0) !== 0x80)
        return 'cp1251';
      i += 3;
    } else if ((b & 0xf8) === 0xf0) {
      if (i + 3 >= buf.length) return 'cp1251';
      if (
        ((buf[i + 1] ?? 0) & 0xc0) !== 0x80 ||
        ((buf[i + 2] ?? 0) & 0xc0) !== 0x80 ||
        ((buf[i + 3] ?? 0) & 0xc0) !== 0x80
      )
        return 'cp1251';
      i += 4;
    } else {
      return 'cp1251';
    }
  }
  return 'utf-8';
}

/**
 * Best-effort decode of a CP1251-or-UTF-8 buffer to a JS string. Strips UTF-8
 * BOM when present. Used by every text parser in this folder.
 */
export function decodeText(buf: Buffer, override?: string): string {
  const enc = override ?? detectEncoding(buf);
  if (enc === 'utf-8') {
    let body = buf.toString('utf-8');
    if (body.charCodeAt(0) === 0xfeff) body = body.slice(1);
    return body;
  }
  return decodeCp1251(buf);
}
