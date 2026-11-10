import { describe, expect, it } from 'vitest';
import { extractBlock, spliceBlock } from './schema-block';

const SAMPLE = `// header
// <generator:start>
OLD BLOCK
// <generator:end>
// footer`;

describe('schema-block', () => {
  it('extracts block content between markers', () => {
    expect(extractBlock(SAMPLE)).toBe('OLD BLOCK');
  });
  it('replaces block content preserving header and footer', () => {
    const out = spliceBlock(SAMPLE, 'NEW BLOCK');
    expect(out).toBe(`// header
// <generator:start>
NEW BLOCK
// <generator:end>
// footer`);
  });
  it('throws when markers missing', () => {
    expect(() => spliceBlock('no markers here', 'X')).toThrow(/markers/);
  });
});
