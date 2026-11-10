import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { clearRegistry } from '@/platform/metadata';
import { emitNav } from './emit-nav';
import { emitSchema } from './emit-schema';
import { emitTypes } from './emit-types';
import { loadConfigs } from './load-configs';
import { spliceBlock } from './schema-block';

export type RunOptions = {
  configsDir: string;
  schemaPath: string;
  typesOut: string;
  navOut: string;
};

export async function runGenerator(opts: RunOptions): Promise<void> {
  clearRegistry();
  await loadConfigs(opts.configsDir);

  const schema = await readFile(opts.schemaPath, 'utf8');
  const spliced = spliceBlock(schema, emitSchema());
  await writeFile(opts.schemaPath, spliced, 'utf8');

  await mkdir(path.dirname(opts.typesOut), { recursive: true });
  await writeFile(opts.typesOut, emitTypes(), 'utf8');

  await mkdir(path.dirname(opts.navOut), { recursive: true });
  await writeFile(opts.navOut, emitNav(), 'utf8');
}
