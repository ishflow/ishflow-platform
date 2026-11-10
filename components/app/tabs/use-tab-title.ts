'use client';

import { useEffect } from 'react';

const listeners = new Set<(t: string) => void>();
let current = '';

export function useTabTitle(title: string | undefined | null): void {
  useEffect(() => {
    const t = title ?? '';
    if (t === current) return;
    current = t;
    for (const fn of listeners) fn(t);
  }, [title]);
}

export function subscribeTabTitle(fn: (t: string) => void): () => void {
  listeners.add(fn);
  fn(current);
  return () => {
    listeners.delete(fn);
  };
}
