#!/usr/bin/env node
/**
 * Audit script: walks app locale platform page.tsx files and reports
 * any page lacking an assertCan or notFound permission gate.
 */

// biome-ignore lint/style/useNodejsImportProtocol: scripts run with plain node
const fs = require('fs');
// biome-ignore lint/style/useNodejsImportProtocol: scripts run with plain node
const path = require('path');

function walkPages(dir: string): string[] {
  const results: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkPages(full));
    } else if (entry.name === 'page.tsx') {
      results.push(full);
    }
  }
  return results;
}

const pages = walkPages('app/[locale]/(platform)').sort();
const patterns = [/assertCan\(/, /notFound\(/, /PermissionDeniedError/];

let flagged = 0;
for (const page of pages) {
  const content = fs.readFileSync(page, 'utf-8');
  if (!patterns.some((p) => p.test(content))) {
    // biome-ignore lint/suspicious/noConsoleLog: CLI output
    console.log(`MISSING GATE: ${page}`);
    flagged++;
  }
}

if (flagged === 0) {
  // biome-ignore lint/suspicious/noConsoleLog: CLI output
  console.log('All pages have a permission gate.');
} else {
  // biome-ignore lint/suspicious/noConsoleLog: CLI output
  console.log(`\n${flagged} page(s) missing a permission gate.`);
  process.exit(1);
}
