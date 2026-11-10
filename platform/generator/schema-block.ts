const START = '// <generator:start>';
const END = '// <generator:end>';

function findRange(source: string): { startLine: number; endLine: number } {
  const lines = source.split('\n');
  const startLine = lines.findIndex((l) => l.trim() === START);
  const endLine = lines.findIndex((l) => l.trim() === END);
  if (startLine < 0 || endLine < 0 || endLine <= startLine) {
    throw new Error(`schema-block: markers ${START} / ${END} not found in source`);
  }
  return { startLine, endLine };
}

export function extractBlock(source: string): string {
  const { startLine, endLine } = findRange(source);
  return source
    .split('\n')
    .slice(startLine + 1, endLine)
    .join('\n');
}

export function spliceBlock(source: string, content: string): string {
  const lines = source.split('\n');
  const { startLine, endLine } = findRange(source);
  const before = lines.slice(0, startLine + 1);
  const after = lines.slice(endLine);
  return [...before, content, ...after].join('\n');
}
