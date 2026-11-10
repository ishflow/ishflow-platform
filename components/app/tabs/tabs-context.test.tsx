// @vitest-environment jsdom
import { act, render, renderHook } from '@testing-library/react';
import { useState } from 'react';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { TabsProvider } from './tabs-context';
import { installLocalStoragePolyfill } from './test-utils';
import { MAX_TABS } from './types';
import { useTabs } from './use-tabs';

const scope = { userId: 'u1', tenantId: 't1' };

function wrapper({ children }: { children: React.ReactNode }) {
  return <TabsProvider scope={scope}>{children}</TabsProvider>;
}

beforeAll(() => installLocalStoragePolyfill());
beforeEach(() => localStorage.clear());

describe('tabs reducer', () => {
  it('seeds with an empty state', () => {
    const { result } = renderHook(() => useTabs(), { wrapper });
    expect(result.current.tabs).toHaveLength(0);
    expect(result.current.activeId).toBe('');
  });

  it('openOrFocus creates a new tab when URL is not open', () => {
    const { result } = renderHook(() => useTabs(), { wrapper });
    act(() => result.current.openOrFocus('/en/catalogs/inventory.product'));
    expect(result.current.tabs).toHaveLength(1);
    expect(result.current.tabs[0]?.href).toBe('/en/catalogs/inventory.product');
    expect(result.current.activeId).toBe(result.current.tabs[0]?.id);
  });

  it('openOrFocus focuses an existing tab when URL matches', () => {
    const { result } = renderHook(() => useTabs(), { wrapper });
    act(() => result.current.openOrFocus('/en/a'));
    act(() => result.current.openOrFocus('/en/b'));
    expect(result.current.tabs).toHaveLength(2);
    const aId = result.current.tabs.find((t) => t.href === '/en/a')?.id;
    act(() => result.current.openOrFocus('/en/a'));
    expect(result.current.tabs).toHaveLength(2);
    expect(result.current.activeId).toBe(aId);
  });

  it('always opens a new tab when forceNew is true (Ctrl+click)', () => {
    const { result } = renderHook(() => useTabs(), { wrapper });
    act(() => result.current.openOrFocus('/en/a'));
    act(() => result.current.openOrFocus('/en/a', { forceNew: true }));
    expect(result.current.tabs).toHaveLength(2);
  });

  it('close drops the tab and auto-focuses the most-recent remaining tab when it was active', () => {
    const { result } = renderHook(() => useTabs(), { wrapper });
    act(() => result.current.openOrFocus('/en/a'));
    const aId = result.current.activeId;
    act(() => result.current.openOrFocus('/en/b'));
    const bId = result.current.activeId;
    act(() => result.current.close(bId));
    expect(result.current.tabs).toHaveLength(1);
    // Active tab closed → previous tab takes focus.
    expect(result.current.activeId).toBe(aId);
  });

  it('close the only remaining tab deselects (activeId="")', () => {
    const { result } = renderHook(() => useTabs(), { wrapper });
    act(() => result.current.openOrFocus('/en/a'));
    const aId = result.current.activeId;
    act(() => result.current.close(aId));
    expect(result.current.tabs).toHaveLength(0);
    expect(result.current.activeId).toBe('');
  });

  it('close leaves activeId alone when closing a non-active tab', () => {
    const { result } = renderHook(() => useTabs(), { wrapper });
    act(() => result.current.openOrFocus('/en/a'));
    const aId = result.current.activeId;
    act(() => result.current.openOrFocus('/en/b'));
    const bId = result.current.activeId;
    act(() => result.current.close(aId));
    expect(result.current.tabs).toHaveLength(1);
    expect(result.current.activeId).toBe(bId);
  });

  it('deselect returns to the main page without closing tabs', () => {
    const { result } = renderHook(() => useTabs(), { wrapper });
    act(() => result.current.openOrFocus('/en/a'));
    expect(result.current.activeId).not.toBe('');
    act(() => result.current.deselect());
    expect(result.current.activeId).toBe('');
    expect(result.current.tabs).toHaveLength(1);
    // Re-focus restores the chip.
    const aId = result.current.tabs[0]?.id;
    act(() => result.current.focus(aId ?? ''));
    expect(result.current.activeId).toBe(aId);
  });

  it('evicts least-recently-active non-dirty tab at cap', () => {
    const { result } = renderHook(() => useTabs(), { wrapper });
    for (let i = 0; i < MAX_TABS; i++) {
      act(() => result.current.openOrFocus(`/en/p${i}`));
    }
    expect(result.current.tabs).toHaveLength(MAX_TABS);
    act(() => result.current.openOrFocus('/en/overflow'));
    expect(result.current.tabs).toHaveLength(MAX_TABS);
    expect(result.current.tabs.some((t) => t.href === '/en/overflow')).toBe(true);
    expect(result.current.tabs.some((t) => t.href === '/en/p0')).toBe(false);
  });

  it('setDirty marks tab as dirty; close requires force when dirty', () => {
    const { result } = renderHook(() => useTabs(), { wrapper });
    act(() => result.current.openOrFocus('/en/a'));
    const aId = result.current.activeId;
    act(() => result.current.setDirty(aId, true));
    expect(result.current.tabs.find((t) => t.id === aId)?.dirty).toBe(true);
    act(() => result.current.close(aId));
    expect(result.current.tabs.some((t) => t.id === aId)).toBe(true);
    act(() => result.current.close(aId, { force: true }));
    expect(result.current.tabs.some((t) => t.id === aId)).toBe(false);
  });

  it('setTitle updates the title by id', () => {
    const { result } = renderHook(() => useTabs(), { wrapper });
    act(() => result.current.openOrFocus('/en/a'));
    const id = result.current.activeId;
    act(() => result.current.setTitle(id, 'New Title'));
    expect(result.current.tabs.find((t) => t.id === id)?.title).toBe('New Title');
  });

  it('setHref updates a tab URL (tab:navigate from /new to /[id])', () => {
    const { result } = renderHook(() => useTabs(), { wrapper });
    act(() => result.current.openOrFocus('/en/catalogs/x/new'));
    const id = result.current.activeId;
    act(() => result.current.setHref(id, '/en/catalogs/x/abc123'));
    expect(result.current.tabs.find((t) => t.id === id)?.href).toBe('/en/catalogs/x/abc123');
  });

  it('openOrFocus seeds the initial title from opts.title when opening a new tab', () => {
    const { result } = renderHook(() => useTabs(), { wrapper });
    act(() => result.current.openOrFocus('/en/catalogs/x', { title: 'Products' }));
    const opened = result.current.tabs.find((t) => t.href === '/en/catalogs/x');
    expect(opened?.title).toBe('Products');
  });

  it('persists originHref on new tab when supplied', () => {
    const { result } = renderHook(() => useTabs(), { wrapper });
    act(() =>
      result.current.openOrFocus('/en/catalogs/inventory.product/abc', {
        title: 'Widget',
        originHref: '/en/catalogs/inventory.product',
      }),
    );
    const tab = result.current.tabs.find((t) => t.href === '/en/catalogs/inventory.product/abc');
    expect(tab?.originHref).toBe('/en/catalogs/inventory.product');
  });

  it('keeps originHref of the existing tab when openOrFocus refocuses it', () => {
    const { result } = renderHook(() => useTabs(), { wrapper });
    act(() =>
      result.current.openOrFocus('/en/catalogs/inventory.product/abc', {
        originHref: '/en/catalogs/inventory.product',
      }),
    );
    act(() =>
      result.current.openOrFocus('/en/catalogs/inventory.product/abc', {
        originHref: '/en/dashboard',
      }),
    );
    const tab = result.current.tabs.find((t) => t.href === '/en/catalogs/inventory.product/abc');
    expect(tab?.originHref).toBe('/en/catalogs/inventory.product');
  });

  it('openOrFocus fills an empty title on an existing tab but never overwrites a real one', () => {
    const { result } = renderHook(() => useTabs(), { wrapper });
    act(() => result.current.openOrFocus('/en/catalogs/x')); // title=''
    const id = result.current.tabs.find((t) => t.href === '/en/catalogs/x')?.id;
    act(() => result.current.openOrFocus('/en/catalogs/x', { title: 'Products' }));
    expect(result.current.tabs.find((t) => t.id === id)?.title).toBe('Products');
    // Subsequent call with a different label must not clobber the real one.
    act(() => result.current.openOrFocus('/en/catalogs/x', { title: 'OtherLabel' }));
    expect(result.current.tabs.find((t) => t.id === id)?.title).toBe('Products');
  });

  it('resets tabs state when scope (userId:tenantId) changes', () => {
    let captured: { tabs: { href: string }[]; activeId: string } = { tabs: [], activeId: '' };
    let open = (_: string) => {};
    let swapScope = () => {};

    function Probe() {
      const tabs = useTabs();
      open = (href: string) => tabs.openOrFocus(href);
      captured = {
        tabs: tabs.tabs.map((t) => ({ href: t.href })),
        activeId: tabs.activeId,
      };
      return null;
    }

    function Host() {
      const [s, setS] = useState(scope);
      swapScope = () => setS({ userId: 'u2', tenantId: 't2' });
      return (
        <TabsProvider scope={s}>
          <Probe />
        </TabsProvider>
      );
    }

    render(<Host />);
    act(() => open('/en/catalogs/a'));
    expect(captured.tabs.some((t) => t.href === '/en/catalogs/a')).toBe(true);

    act(() => swapScope());
    // After scope flip, the new tenant starts clean — empty tabs, no active.
    expect(captured.tabs).toHaveLength(0);
    expect(captured.activeId).toBe('');
  });
});
