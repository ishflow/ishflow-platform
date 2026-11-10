import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { main, parseOrder } from './sync';

const HERE = dirname(fileURLToPath(import.meta.url));

describe('kaspi/sync', () => {
  it('exits 0 in --mock without network', async () => {
    const code = await main(['--mock']);
    expect(code).toBe(0);
  });

  it('parses Kaspi orders, deriving per-unit price from total / quantity', () => {
    const payload = JSON.parse(readFileSync(resolve(HERE, 'mock-payload.json'), 'utf-8'));
    const orders = payload.data.map(parseOrder);
    expect(orders).toHaveLength(2);

    // Order 1: single-line, quantity 1 → unitPrice == totalPrice
    expect(orders[0].externalId).toBe('KSP-202605-0001');
    expect(orders[0].customer.name).toBe('Бекзат Тулегенов');
    expect(orders[0].lines[0]).toMatchObject({
      code: 'SM-G991BZRDEUE',
      quantity: 1,
      unitPrice: 459000,
    });

    // Order 2: first line quantity 2 → unitPrice = 28900 / 2 = 14450
    expect(orders[1].lines[0]).toMatchObject({
      code: 'MGM-DBG-04',
      quantity: 2,
      unitPrice: 14450,
    });
  });
});
