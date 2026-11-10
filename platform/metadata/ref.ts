import type { ReferenceToken } from './types';

export function ref(path: string): ReferenceToken {
  const parts = path.split('.');
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    throw new Error(`ref: expected "module.name", got ${JSON.stringify(path)}`);
  }
  return { kind: 'ref', module: parts[0], name: parts[1] };
}
