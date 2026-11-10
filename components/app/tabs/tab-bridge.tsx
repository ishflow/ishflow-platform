'use client';

import { useEffect } from 'react';
import { type ChildMessage, IFRAME_QUERY_FLAG } from './types';
import { subscribeTabTitle } from './use-tab-title';

export function TabBridge({
  title,
  dirty,
  children,
}: {
  title?: string;
  /**
   * Optional. When omitted, callers (e.g. CatalogFormShell/DocumentFormShell)
   * are expected to push via postDirty() themselves. Only pass this when the
   * bridge owns the dirty state directly.
   */
  dirty?: boolean;
  children?: React.ReactNode;
}) {
  // Post title from explicit prop (changes) OR from any useTabTitle() caller.
  useEffect(() => {
    if (typeof title === 'string') postChild({ type: 'tab:title', title });
  }, [title]);

  // Skip empty titles: the module-level `current` starts as '' on every iframe
  // mount, and the subscriber fires immediately with that value. Posting it
  // would clobber the real title the parent already set via openOrFocus
  // ({title: 'New Product'} etc.) whenever the page inside the iframe hasn't
  // called useTabTitle yet (e.g. BulkProductForm / BulkCurrencyPicker pages).
  useEffect(() => subscribeTabTitle((t) => t && postChild({ type: 'tab:title', title: t })), []);

  // Post dirty state only when explicitly provided.
  useEffect(() => {
    if (typeof dirty !== 'boolean') return;
    postChild({ type: 'tab:dirty', dirty });
  }, [dirty]);

  // Intercept same-origin <a> clicks and turn them into tab:open messages.
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (e.defaultPrevented) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const target = (e.target as HTMLElement | null)?.closest('a');
      if (!target || target.target === '_blank') return;
      const href = target.getAttribute('href');
      if (!href) return;
      if (href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return;
      let url: URL;
      try {
        url = new URL(href, window.location.origin);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;
      e.preventDefault();
      postChild({
        type: 'tab:open',
        href: url.pathname + url.search,
        origin: window.location.pathname + stripIframeFlag(window.location.search),
      });
    }
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, []);

  return <>{children}</>;
}

// The iframe's window.location.search carries `?__tab_iframe=1`; passing that
// back to the parent as `origin` would taint the new tab's originHref, and
// router.push(originHref) on close would navigate the parent to an iframe-
// flagged URL, which makes the layout drop the sidebar.
function stripIframeFlag(search: string): string {
  if (!search) return '';
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  params.delete(IFRAME_QUERY_FLAG);
  const rest = params.toString();
  return rest ? `?${rest}` : '';
}

function postChild(msg: ChildMessage) {
  if (typeof window === 'undefined') return;
  if (window.parent === window) return;
  window.parent.postMessage(msg, window.location.origin);
}

export function postCloseMe(reason: 'save-and-close' | 'user'): void {
  postChild({ type: 'tab:close-me', reason });
}

export function postNavigate(href: string): void {
  postChild({ type: 'tab:navigate', href });
}

/**
 * Broadcast the dirty state of the current iframe's form to the parent tab
 * shell. Called by form shells via EntityForm's onDirtyChange — the parent
 * needs this to show the amber unsaved dot, to gate tab close with the
 * confirm dialog, and to enable the beforeunload guard.
 */
export function postDirty(dirty: boolean): void {
  postChild({ type: 'tab:dirty', dirty });
}
