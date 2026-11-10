'use client';

import { createContext, useEffect, useMemo, useReducer, useRef } from 'react';
import { type StorageScope, loadTabsState, saveTabsState, seedEmptyState } from './storage';
import { MAX_TABS, type Tab, type TabsState } from './types';

type OpenOpts = { forceNew?: boolean; title?: string; originHref?: string };
type CloseOpts = { force?: boolean };

export type TabsContextValue = TabsState & {
  openOrFocus: (href: string, opts?: OpenOpts) => void;
  focus: (id: string) => void;
  /** Clear active tab so the main page content (children) becomes visible. */
  deselect: () => void;
  close: (id: string, opts?: CloseOpts) => boolean;
  setDirty: (id: string, dirty: boolean) => void;
  setTitle: (id: string, title: string) => void;
  setHref: (id: string, href: string) => void;
  activeTab: Tab | undefined;
  anyDirty: boolean;
};

type Action =
  | { type: 'open'; href: string; forceNew: boolean; title: string; originHref: string | undefined }
  | { type: 'focus'; id: string }
  | { type: 'deselect' }
  | { type: 'close'; id: string; force: boolean }
  | { type: 'setDirty'; id: string; dirty: boolean }
  | { type: 'setTitle'; id: string; title: string }
  | { type: 'setHref'; id: string; href: string }
  | { type: 'reset'; state: TabsState };

function newId(): string {
  return (
    globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`
  );
}

function reducer(state: TabsState, action: Action): TabsState {
  switch (action.type) {
    case 'reset':
      return action.state;
    case 'open': {
      const now = Date.now();
      if (!action.forceNew) {
        const existing = state.tabs.find((t) => t.href === action.href);
        if (existing) {
          return {
            ...state,
            activeId: existing.id,
            tabs: state.tabs.map((t) =>
              t.id === existing.id
                ? {
                    ...t,
                    lastActiveAt: now,
                    // Refresh title when caller supplied one and the existing
                    // tab has an empty placeholder — avoids "Müşteriler" tab
                    // being stuck as the URL path when navigating via sidebar.
                    title: t.title || action.title,
                  }
                : t,
            ),
          };
        }
      }
      let tabs = state.tabs;
      if (tabs.length >= MAX_TABS) {
        const candidates = tabs
          .filter((t) => !t.pinned && !t.dirty && t.id !== state.activeId)
          .sort((a, b) => a.lastActiveAt - b.lastActiveAt);
        const victim = candidates[0];
        if (victim) {
          tabs = tabs.filter((t) => t.id !== victim.id);
        } else {
          return state;
        }
      }
      const tab: Tab = {
        id: newId(),
        href: action.href,
        title: action.title,
        dirty: false,
        pinned: false,
        openedAt: now,
        lastActiveAt: now,
        originHref: action.originHref,
      };
      return { ...state, tabs: [...tabs, tab], activeId: tab.id };
    }
    case 'focus': {
      if (!state.tabs.some((t) => t.id === action.id)) return state;
      const now = Date.now();
      return {
        ...state,
        activeId: action.id,
        tabs: state.tabs.map((t) => (t.id === action.id ? { ...t, lastActiveAt: now } : t)),
      };
    }
    case 'deselect': {
      if (state.activeId === '') return state;
      return { ...state, activeId: '' };
    }
    case 'close': {
      const target = state.tabs.find((t) => t.id === action.id);
      if (!target || target.pinned) return state;
      if (target.dirty && !action.force) return state;
      const remaining = state.tabs.filter((t) => t.id !== action.id);
      // When the active tab is closed, auto-focus the most-recently-active
      // remaining tab so the user lands back on what they were doing before
      // the now-closed sub-tab. Empty remaining → deselect (return to children).
      let nextActive: string = state.activeId;
      if (state.activeId === action.id) {
        if (remaining.length === 0) {
          nextActive = '';
        } else {
          const sorted = [...remaining].sort((a, b) => b.lastActiveAt - a.lastActiveAt);
          nextActive = sorted[0]?.id ?? '';
        }
      }
      return { ...state, tabs: remaining, activeId: nextActive };
    }
    case 'setDirty':
      return {
        ...state,
        tabs: state.tabs.map((t) => (t.id === action.id ? { ...t, dirty: action.dirty } : t)),
      };
    case 'setTitle':
      return {
        ...state,
        tabs: state.tabs.map((t) => (t.id === action.id ? { ...t, title: action.title } : t)),
      };
    case 'setHref':
      return {
        ...state,
        tabs: state.tabs.map((t) => (t.id === action.id ? { ...t, href: action.href } : t)),
      };
  }
}

export const TabsContext = createContext<TabsContextValue | null>(null);

export function TabsProvider({
  scope,
  children,
}: {
  scope: StorageScope;
  children: React.ReactNode;
}) {
  // First render — on BOTH server and client — must produce identical markup
  // or React logs a hydration mismatch. So the initial state is always empty;
  // real localStorage content is loaded post-mount via the reset effect below.
  const [state, dispatch] = useReducer(reducer, undefined, () => seedEmptyState());
  const hydratedRef = useRef(false);

  // Hydrate from localStorage on mount; re-run and reset on scope flip
  // (tenant switch / account swap) so tenant A's tabs don't bleed into
  // tenant B's localStorage key. TabsProviderRoot memoizes `scope`, so
  // identity is stable until userId/tenantId actually change.
  useEffect(() => {
    dispatch({ type: 'reset', state: loadTabsState(scope) });
    hydratedRef.current = true;
  }, [scope]);

  // Skip persisting the seeded state — it would overwrite the real tabs that
  // the hydrate effect is about to load.
  useEffect(() => {
    if (!hydratedRef.current) return;
    saveTabsState(scope, state);
  }, [scope, state]);

  const value = useMemo<TabsContextValue>(() => {
    const active = state.tabs.find((t) => t.id === state.activeId);
    return {
      ...state,
      activeTab: active,
      anyDirty: state.tabs.some((t) => t.dirty),
      openOrFocus: (href, opts) =>
        dispatch({
          type: 'open',
          href,
          forceNew: opts?.forceNew ?? false,
          title: opts?.title ?? '',
          originHref: opts?.originHref,
        }),
      focus: (id) => dispatch({ type: 'focus', id }),
      deselect: () => dispatch({ type: 'deselect' }),
      close: (id, opts) => {
        const target = state.tabs.find((t) => t.id === id);
        if (!target || target.pinned) return false;
        dispatch({ type: 'close', id, force: opts?.force ?? false });
        return target.dirty ? opts?.force === true : true;
      },
      setDirty: (id, dirty) => dispatch({ type: 'setDirty', id, dirty }),
      setTitle: (id, title) => dispatch({ type: 'setTitle', id, title }),
      setHref: (id, href) => dispatch({ type: 'setHref', id, href }),
    };
  }, [state]);

  return <TabsContext.Provider value={value}>{children}</TabsContext.Provider>;
}
