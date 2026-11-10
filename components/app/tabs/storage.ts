import { type TabsState, tabsStateSchema } from './types';

export type StorageScope = { userId: string; tenantId: string };

export function storageKey(s: StorageScope): string {
  return `tabs:${s.userId}:${s.tenantId}`;
}

export function seedEmptyState(): TabsState {
  return {
    version: 1,
    tabs: [],
    activeId: '',
  };
}

function hasRealLocalStorage(): boolean {
  // SSR and some Turbopack modes expose a `localStorage` object that is missing
  // real Storage methods. Treat anything without `getItem` as absent.
  return (
    typeof globalThis !== 'undefined' &&
    typeof (globalThis as { localStorage?: { getItem?: unknown } }).localStorage?.getItem ===
      'function'
  );
}

export function loadTabsState(scope: StorageScope): TabsState {
  if (!hasRealLocalStorage()) return seedEmptyState();
  const raw = localStorage.getItem(storageKey(scope));
  if (!raw) return seedEmptyState();
  try {
    const parsed = tabsStateSchema.parse(JSON.parse(raw));
    // Drop legacy pinned tabs (e.g. the old Panel tab) so existing users don't
    // end up with a stuck chip after the redesign.
    const tabs = parsed.tabs.filter((t) => !t.pinned);
    const activeId = tabs.some((t) => t.id === parsed.activeId) ? parsed.activeId : '';
    return { ...parsed, tabs, activeId };
  } catch {
    localStorage.removeItem(storageKey(scope));
    return seedEmptyState();
  }
}

export function saveTabsState(scope: StorageScope, state: TabsState): void {
  if (!hasRealLocalStorage()) return;
  try {
    localStorage.setItem(storageKey(scope), JSON.stringify(state));
  } catch {
    // quota exceeded or SecurityError — silently ignore; in-memory copy still works
  }
}

export function clearTabsState(scope: StorageScope): void {
  if (!hasRealLocalStorage()) return;
  localStorage.removeItem(storageKey(scope));
}
