import type { PrismaClient } from '@prisma/client';

export type PrismaQueryCounter = {
  start: () => void;
  stop: () => number;
};

export function attachCounter(prisma: PrismaClient): PrismaQueryCounter {
  let count = 0;
  let active = false;
  // @ts-expect-error — the typed event union on $on is intentionally narrow;
  // 'query' is supported when the client is constructed with `log: ['query']`.
  prisma.$on('query', () => {
    if (active) count += 1;
  });
  return {
    start: () => {
      count = 0;
      active = true;
    },
    stop: () => {
      active = false;
      return count;
    },
  };
}
