import type { Dirent } from 'node:fs';
import { readdir } from 'node:fs/promises';
import path from 'node:path';

export async function loadConfigs(root: string): Promise<void> {
  const files: string[] = [];
  await walk(root, files);
  for (const f of files) {
    await import(f);
  }
}

async function walk(dir: string, acc: string[]): Promise<void> {
  let entries: Dirent[];
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) await walk(p, acc);
    else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.js'))) {
      if (entry.name.endsWith('.test.ts') || entry.name.endsWith('.test.js')) continue;
      acc.push(p);
    }
  }
}
