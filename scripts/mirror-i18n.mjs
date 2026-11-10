#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(process.cwd(), 'messages');
const MIRROR = ['uz', 'ky', 'de', 'fr', 'zh'];

const en = JSON.parse(readFileSync(path.join(ROOT, 'en.json'), 'utf8'));

function isObject(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

function mergeMissing(target, source) {
  for (const [k, v] of Object.entries(source)) {
    if (!(k in target)) {
      target[k] = structuredClone(v);
    } else if (isObject(v) && isObject(target[k])) {
      mergeMissing(target[k], v);
    }
  }
}

for (const loc of MIRROR) {
  const file = path.join(ROOT, `${loc}.json`);
  const cur = JSON.parse(readFileSync(file, 'utf8'));
  mergeMissing(cur, en);
  writeFileSync(file, `${JSON.stringify(cur, null, 2)}\n`);
  process.stdout.write(`mirrored missing keys → ${loc}.json\n`);
}
