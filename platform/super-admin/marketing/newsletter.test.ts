import { describe, expect, it } from 'vitest';
import { subscribersToCsv } from './newsletter';

describe('subscribersToCsv', () => {
  it('produces a header even for an empty list', () => {
    const csv = subscribersToCsv([]);
    expect(csv).toBe('email,confirmed_at,unsubscribed_at,source,created_at');
  });

  it('escapes commas and quotes inside fields', () => {
    const csv = subscribersToCsv([
      {
        id: 'a',
        email: 'tricky,"quoted"@example.com',
        confirmedAt: new Date('2026-05-13T10:00:00.000Z'),
        unsubscribedAt: null,
        source: null,
        createdAt: new Date('2026-05-12T09:00:00.000Z'),
      },
    ]);
    expect(csv).toContain('"tricky,""quoted""@example.com"');
    expect(csv).toContain('2026-05-13T10:00:00.000Z');
  });

  it('renders empty cells for nullable columns', () => {
    const csv = subscribersToCsv([
      {
        id: 'a',
        email: 'foo@bar',
        confirmedAt: null,
        unsubscribedAt: null,
        source: null,
        createdAt: new Date('2026-05-12T09:00:00.000Z'),
      },
    ]);
    const [, dataLine] = csv.split('\n');
    expect(dataLine).toBe('foo@bar,,,,2026-05-12T09:00:00.000Z');
  });
});
