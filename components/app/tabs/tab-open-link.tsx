'use client';

import { type AnchorHTMLAttributes, type MouseEvent, forwardRef } from 'react';
import { useTabsOptional } from './use-tabs';

type Props = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & {
  /** Absolute, already locale-prefixed href (e.g. `/en/catalogs/products/new`). */
  href: string;
  /** Initial tab title shown in the chip (defaults to URL). */
  tabTitle?: string;
};

/**
 * Anchor that opens its href as a tab when the tab system is enabled, and
 * falls through to normal navigation otherwise. Used for in-page "New" /
 * "open as tab" actions (list toolbars, inline buttons). Sidebar navigation
 * intentionally does NOT use this — sidebar is normal app navigation.
 *
 * Cmd/Ctrl-click always opens a fresh tab, even if one exists for the URL.
 */
export const TabOpenLink = forwardRef<HTMLAnchorElement, Props>(function TabOpenLink(
  { href, tabTitle, onClick, children, ...rest },
  ref,
) {
  const tabs = useTabsOptional();

  function handleClick(e: MouseEvent<HTMLAnchorElement>) {
    onClick?.(e);
    if (e.defaultPrevented) return;
    if (!tabs) return; // flag off or mobile — fall through to normal nav
    if (e.button !== 0) return;
    if (e.shiftKey || e.altKey) return;

    e.preventDefault();
    // Capture the page the user was on at click time so closing the tab
    // returns them to that list (instead of whatever happens to be left
    // in the background top-level URL).
    const originHref =
      typeof window !== 'undefined' ? window.location.pathname + window.location.search : undefined;
    tabs.openOrFocus(href, {
      forceNew: e.metaKey || e.ctrlKey,
      title: tabTitle,
      originHref,
    });
  }

  return (
    <a ref={ref} href={href} {...rest} onClick={handleClick}>
      {children}
    </a>
  );
});
