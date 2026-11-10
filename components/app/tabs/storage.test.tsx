// @vitest-environment jsdom
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { loadTabsState, saveTabsState, storageKey } from './storage';
import { installLocalStoragePolyfill } from './test-utils';

beforeAll(() => installLocalStoragePolyfill());
beforeEach(() => {
  localStorage.clear();
});

describe('storage', () => {
  it('returns an empty state when key is absent', () => {
    const state = loadTabsState({ userId: 'u1', tenantId: 't1' });
    expect(state.tabs).toHaveLength(0);
    expect(state.activeId).toBe('');
  });

  it('round-trips via saveTabsState + loadTabsState', () => {
    const now = Date.now();
    saveTabsState(
      { userId: 'u1', tenantId: 't1' },
      {
        version: 1,
        tabs: [
          {
            id: 'abc',
            href: '/en/catalogs/inventory.product',
            title: 'Products',
            dirty: false,
            pinned: false,
            openedAt: now,
            lastActiveAt: now,
          },
        ],
        activeId: 'abc',
      },
    );
    const state = loadTabsState({ userId: 'u1', tenantId: 't1' });
    expect(state.tabs).toHaveLength(1);
    expect(state.activeId).toBe('abc');
  });

  it('resets on corrupt payload', () => {
    localStorage.setItem(storageKey({ userId: 'u1', tenantId: 't1' }), '{not json');
    const state = loadTabsState({ userId: 'u1', tenantId: 't1' });
    expect(state.tabs).toHaveLength(0);
    expect(state.activeId).toBe('');
  });

  it('isolates by user+tenant', () => {
    const now = Date.now();
    saveTabsState(
      { userId: 'u1', tenantId: 't1' },
      {
        version: 1,
        tabs: [
          {
            id: 'a',
            href: '/en/a',
            title: '',
            dirty: false,
            pinned: false,
            openedAt: now,
            lastActiveAt: now,
          },
        ],
        activeId: 'a',
      },
    );
    const other = loadTabsState({ userId: 'u2', tenantId: 't1' });
    expect(other.tabs).toHaveLength(0);
    expect(other.activeId).toBe('');
  });

  it('drops legacy pinned tabs when loading older persisted state', () => {
    const now = Date.now();
    // Simulate an older persisted state that still has the old Panel chip.
    localStorage.setItem(
      storageKey({ userId: 'u1', tenantId: 't1' }),
      JSON.stringify({
        version: 1,
        tabs: [
          {
            id: 'PANEL',
            href: '/dashboard',
            title: '',
            dirty: false,
            pinned: true,
            openedAt: now,
            lastActiveAt: now,
          },
          {
            id: 'b',
            href: '/en/catalogs/x',
            title: '',
            dirty: false,
            pinned: false,
            openedAt: now,
            lastActiveAt: now,
          },
        ],
        activeId: 'PANEL',
      }),
    );
    const state = loadTabsState({ userId: 'u1', tenantId: 't1' });
    expect(state.tabs).toHaveLength(1);
    expect(state.tabs[0]?.id).toBe('b');
    // activeId pointed to the dropped pinned tab → falls back to ''.
    expect(state.activeId).toBe('');
  });
});
