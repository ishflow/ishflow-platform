import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { main, parseOrder } from './sync';

const HERE = dirname(fileURLToPath(import.meta.url));

describe('wildberries/sync', () => {
  it('exits 0 in --mock without network', async () => {
    const code = await main(['--mock']);
    expect(code).toBe(0);
  });

  it('parses the bundled mock payload into the normalised shape', () => {
    const payload = JSON.parse(readFileSync(resolve(HERE, 'mock-payload.json'), 'utf-8'));
    const orders = payload.orders.map(parseOrder);
    expect(orders).toHaveLength(2);
    const first = orders[0];
    expect(first.externalId).toBe('WB-1057281');
    expect(first.customer.name).toBe('Айгуль Серикова');
    expect(first.customer.email).toBe('aigul.serikova@example.kz');
    expect(first.lines).toHaveLength(2);
    expect(first.lines[0]).toMatchObject({
      barcode: '4607056030219',
      quantity: 2,
      unitPrice: 1850,
    });
  });
});
