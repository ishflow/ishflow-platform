const TRANSLIT: Record<string, string> = {
  // Turkish
  ş: 's',
  Ş: 'S',
  ğ: 'g',
  Ğ: 'G',
  ı: 'i',
  İ: 'I',
  ç: 'c',
  Ç: 'C',
  ö: 'o',
  Ö: 'O',
  ü: 'u',
  Ü: 'U',
  // German
  ä: 'ae',
  Ä: 'Ae',
  ß: 'ss',
  // Cyrillic
  а: 'a',
  А: 'A',
  б: 'b',
  Б: 'B',
  в: 'v',
  В: 'V',
  г: 'g',
  Г: 'G',
  д: 'd',
  Д: 'D',
  е: 'e',
  Е: 'E',
  ё: 'yo',
  Ё: 'Yo',
  ж: 'zh',
  Ж: 'Zh',
  з: 'z',
  З: 'Z',
  и: 'i',
  И: 'I',
  й: 'y',
  Й: 'Y',
  к: 'k',
  К: 'K',
  л: 'l',
  Л: 'L',
  м: 'm',
  М: 'M',
  н: 'n',
  Н: 'N',
  о: 'o',
  О: 'O',
  п: 'p',
  П: 'P',
  р: 'r',
  Р: 'R',
  с: 's',
  С: 'S',
  т: 't',
  Т: 'T',
  у: 'u',
  У: 'U',
  ф: 'f',
  Ф: 'F',
  х: 'kh',
  Х: 'Kh',
  ц: 'ts',
  Ц: 'Ts',
  ч: 'ch',
  Ч: 'Ch',
  ш: 'sh',
  Ш: 'Sh',
  щ: 'shch',
  Щ: 'Shch',
  ъ: '',
  Ъ: '',
  ы: 'y',
  Ы: 'Y',
  ь: '',
  Ь: '',
  э: 'e',
  Э: 'E',
  ю: 'yu',
  Ю: 'Yu',
  я: 'ya',
  Я: 'Ya',
  // Ukrainian/Belarusian extras
  і: 'i',
  І: 'I',
  ї: 'yi',
  Ї: 'Yi',
  є: 'ye',
  Є: 'Ye',
  ў: 'u',
  Ў: 'U',
};

function transliterate(s: string): string {
  return s
    .split('')
    .map((ch) => (ch in TRANSLIT ? TRANSLIT[ch] : ch))
    .join('');
}

const MAX_STEM = 80;

export function slugifyFilename(input: string): string {
  // Split on last dot to separate stem and extension
  const lastDot = input.lastIndexOf('.');
  let stem: string;
  let ext: string;

  if (lastDot > 0 && lastDot < input.length - 1) {
    stem = input.slice(0, lastDot);
    ext = input.slice(lastDot + 1);
  } else {
    stem = input;
    ext = '';
  }

  function sanitize(part: string): string {
    const translit = transliterate(part);
    const normalized = translit.normalize('NFKD');
    const replaced = normalized.replace(/[^A-Za-z0-9._-]+/g, '_');
    return replaced.replace(/_+/g, '_').replace(/^_+|_+$/g, '');
  }

  let cleanStem = sanitize(stem);
  const cleanExt = ext ? sanitize(ext) : '';

  if (!cleanStem) {
    cleanStem = 'file';
  }

  if (cleanStem.length > MAX_STEM) {
    cleanStem = cleanStem.slice(0, MAX_STEM);
  }

  return cleanExt ? `${cleanStem}.${cleanExt}` : cleanStem;
}
