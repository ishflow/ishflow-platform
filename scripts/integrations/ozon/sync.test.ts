import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { main, parseOrder } from './sync';

const HERE = dirname(fileURLToPath(import.meta.url));

describe('ozon/sync', () => {
  it('exits 0 in --mock without network', async () => {
    const code = await main(['--mock']);
    expect(code).toBe(0);
  });

  it('parses Ozon postings, coercing the string price to a number', () => {
    const payload = JSON.parse(readFileSync(resolve(HERE, 'mock-payload.json'), 'utf-8'));
    const orders = payload.result.postings.map(parseOrder);
    expect(orders).toHaveLength(2);
    const first = orders[0];
    expect(first.externalId).toBe('78901234-0001-1');
    expect(first.lines[0]).toMatchObject({
      sku: 'BL-2024-RED',
      quantity: 1,
      unitPrice: 12990, // string "12990.00" → number
    });
  });
});
