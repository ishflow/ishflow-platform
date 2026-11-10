// @vitest-environment jsdom
import { render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TabBridge, postDirty } from './tab-bridge';

const postSpy = vi.fn();

beforeEach(() => {
  postSpy.mockReset();
  Object.defineProperty(window, 'parent', {
    configurable: true,
    value: { postMessage: postSpy },
  });
});

afterEach(() => {
  Object.defineProperty(window, 'parent', { configurable: true, value: window });
});

describe('TabBridge', () => {
  it('posts tab:title when title prop changes', () => {
    const { rerender } = render(<TabBridge title="One" dirty={false} />);
    expect(postSpy).toHaveBeenCalledWith(
      { type: 'tab:title', title: 'One' },
      window.location.origin,
    );
    rerender(<TabBridge title="Two" dirty={false} />);
    expect(postSpy).toHaveBeenCalledWith(
      { type: 'tab:title', title: 'Two' },
      window.location.origin,
    );
  });

  it('posts tab:dirty when dirty prop changes', () => {
    const { rerender } = render(<TabBridge title="" dirty={false} />);
    postSpy.mockClear();
    rerender(<TabBridge title="" dirty={true} />);
    expect(postSpy).toHaveBeenCalledWith(
      { type: 'tab:dirty', dirty: true },
      window.location.origin,
    );
  });

  it('postDirty posts tab:dirty to parent', () => {
    postDirty(true);
    expect(postSpy).toHaveBeenCalledWith(
      { type: 'tab:dirty', dirty: true },
      window.location.origin,
    );
    postSpy.mockClear();
    postDirty(false);
    expect(postSpy).toHaveBeenCalledWith(
      { type: 'tab:dirty', dirty: false },
      window.location.origin,
    );
  });

  it('TabBridge without a dirty prop does NOT post tab:dirty on mount', () => {
    render(<TabBridge title="x" />);
    const dirtyPosts = postSpy.mock.calls.filter(
      ([msg]) => (msg as { type: string }).type === 'tab:dirty',
    );
    expect(dirtyPosts).toHaveLength(0);
  });

  it('intercepts same-origin link clicks and posts tab:open with origin', () => {
    render(
      <TabBridge title="" dirty={false}>
        <a href="/en/catalogs/x/1" data-testid="lnk">
          Go
        </a>
      </TabBridge>,
    );
    const link = document.querySelector('[data-testid="lnk"]') as HTMLAnchorElement;
    postSpy.mockClear();
    const ev = new MouseEvent('click', { bubbles: true, cancelable: true });
    link.dispatchEvent(ev);
    expect(ev.defaultPrevented).toBe(true);
    expect(postSpy).toHaveBeenCalledWith(
      {
        type: 'tab:open',
        href: '/en/catalogs/x/1',
        origin: window.location.pathname + window.location.search,
      },
      window.location.origin,
    );
  });

  it('strips __tab_iframe from origin when iframe URL carries the flag', () => {
    // Simulate the parent rendering the iframe at /tr/catalogs/inventory.product/abc?__tab_iframe=1
    window.history.replaceState(
      null,
      '',
      '/tr/catalogs/inventory.product/abc?__tab_iframe=1&keep=yes',
    );
    render(
      <TabBridge title="" dirty={false}>
        <a href="/tr/registers/inventory.stock_balance" data-testid="lnk2">
          Go
        </a>
      </TabBridge>,
    );
    const link = document.querySelector('[data-testid="lnk2"]') as HTMLAnchorElement;
    postSpy.mockClear();
    const ev = new MouseEvent('click', { bubbles: true, cancelable: true });
    link.dispatchEvent(ev);
    expect(postSpy).toHaveBeenCalledWith(
      {
        type: 'tab:open',
        href: '/tr/registers/inventory.stock_balance',
        // The iframe flag is stripped; other params are preserved.
        origin: '/tr/catalogs/inventory.product/abc?keep=yes',
      },
      window.location.origin,
    );
    // Reset URL so other tests start clean.
    window.history.replaceState(null, '', '/');
  });
});
