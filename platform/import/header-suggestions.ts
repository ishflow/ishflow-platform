export type FieldDescriptor = { key: string; labels: string[] };

export type HeaderMapping = Record<string, string | null>;

function normalise(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, '');
}

export function suggestHeaderMapping(headers: string[], fields: FieldDescriptor[]): HeaderMapping {
  const result: HeaderMapping = {};
  const taken = new Set<string>();
  for (const header of headers) {
    const n = normalise(header);
    let match: string | null = null;
    for (const field of fields) {
      if (taken.has(field.key)) continue;
      if (normalise(field.key) === n) {
        match = field.key;
        break;
      }
      if (field.labels.some((l) => normalise(l) === n)) {
        match = field.key;
        break;
      }
    }
    if (match) taken.add(match);
    result[header] = match;
  }
  return result;
}
