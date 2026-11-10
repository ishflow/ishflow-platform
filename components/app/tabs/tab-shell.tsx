'use client';

import { useRouter } from 'next/navigation';
import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { useBeforeUnloadGuard } from './before-unload';
import { CloseConfirmDialog } from './close-confirm-dialog';
import { TabBar } from './tab-bar';
import { CHILD_MESSAGE_TYPES, type ChildMessage, IFRAME_QUERY_FLAG, type Tab } from './types';

function stripIframeFlag(href: string): string {
  const qIndex = href.indexOf('?');
  if (qIndex === -1) return href;
  const params = new URLSearchParams(href.slice(qIndex + 1));
  params.delete(IFRAME_QUERY_FLAG);
  const rest = params.toString();
  return href.slice(0, qIndex) + (rest ? `?${rest}` : '');
}
import { useTabs } from './use-tabs';

/**
 * Renders the tab bar + iframe layer on top of `children` (the normal Next.js
 * page content). When no tab is active, children are fully visible and the
 * sidebar → page flow behaves like a regular app. Tabs are created only by
 * explicit "New" / "open as tab" interactions and act as ephemeral overlays.
 */
export function TabShell({ children }: { children: ReactNode }) {
  const { tabs, activeId, close, setDirty, setTitle, setHref, openOrFocus, anyDirty } = useTabs();
  const [pendingClose, setPendingClose] = useState<Tab | null>(null);
  const iframeRefs = useRef<Map<string, HTMLIFrameElement>>(new Map());
  const router = useRouter();

  useBeforeUnloadGuard(anyDirty);

  const onCloseRequest = useCallback(
    (tab: Tab) => {
      if (tab.pinned) return;
      if (tab.dirty) {
        setPendingClose(tab);
        return;
      }
      const wasActive = tab.id === activeId;
      // Strip __tab_iframe defensively — an originHref captured from inside an
      // iframe carries the flag, and router.push(target) would otherwise
      // navigate the parent into iframe-mode (sidebar disappears).
      const target = tab.originHref ? stripIframeFlag(tab.originHref) : undefined;
      const wasLastTab = tabs.length === 1;
      close(tab.id);
      // Only navigate top-level back to the origin when we just closed the
      // LAST remaining active tab — that's the moment the user returns to
      // "no tabs open" land. With other tabs left, the reducer auto-focuses
      // the next tab, so keeping the underlying URL stable is correct.
      if (wasActive && wasLastTab && target) {
        router.push(target);
      } else {
        router.refresh();
      }
    },
    [activeId, close, router, tabs.length],
  );

  const confirmClose = useCallback(() => {
    if (!pendingClose) return;
    const wasActive = pendingClose.id === activeId;
    const target = pendingClose.originHref ? stripIframeFlag(pendingClose.originHref) : undefined;
    const wasLastTab = tabs.length === 1;
    close(pendingClose.id, { force: true });
    setPendingClose(null);
    if (wasActive && wasLastTab && target) {
      router.push(target);
    } else {
      router.refresh();
    }
  }, [pendingClose, activeId, close, router, tabs.length]);

  useEffect(() => {
    function onMessage(ev: MessageEvent) {
      if (ev.origin !== window.location.origin) return;
      const data = ev.data as ChildMessage | undefined;
      if (!data || typeof data !== 'object' || !('type' in data)) return;
      if (!CHILD_MESSAGE_TYPES.has(data.type)) return;
      const sourceId = [...iframeRefs.current.entries()].find(
        ([, el]) => el.contentWindow === ev.source,
      )?.[0];
      if (!sourceId) return;
      switch (data.type) {
        case 'tab:title':
          setTitle(sourceId, data.title);
          break;
        case 'tab:dirty':
          setDirty(sourceId, data.dirty);
          break;
        case 'tab:close-me': {
          const force = data.reason === 'save-and-close';
          // Defer the actual close so React can finish processing the child
          // iframe's server-action response BEFORE we unmount its iframe.
          // Without this delay, removing the iframe mid-flight crashes the
          // in-flight response handler with "An unexpected response was
          // received from the server."
          //
          // router.refresh() in the parent also revalidates the underlying
          // list page so the newly-saved record is visible when the iframe
          // goes away.
          setTimeout(() => {
            close(sourceId, { force });
            router.refresh();
          }, 80);
          break;
        }
        case 'tab:open':
          openOrFocus(data.href, { forceNew: data.newTab, originHref: data.origin });
          break;
        case 'tab:navigate':
          setHref(sourceId, data.href);
          break;
      }
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [setTitle, setDirty, close, openOrFocus, setHref, router]);

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <TabBar onCloseRequest={onCloseRequest} />
      <div className="relative min-h-0 flex-1 overflow-hidden">
        {/* Main page content — always mounted. Stays visible whenever no tab
            is active (activeId === ''). Iframes overlay on top when a tab is
            active. */}
        <div className="absolute inset-0 overflow-y-auto">{children}</div>
        {tabs.map((tab) => {
          const src = appendQuery(tab.href, IFRAME_QUERY_FLAG, '1');
          const isActive = tab.id === activeId;
          return (
            <iframe
              key={tab.id}
              id={`tabpanel-${tab.id}`}
              ref={(el) => {
                if (el) iframeRefs.current.set(tab.id, el);
                else iframeRefs.current.delete(tab.id);
              }}
              title={tab.title || tab.href}
              src={src}
              // `z-20` keeps the tab content above any `sticky top-0 z-10`
              // header the underlying list page renders (e.g. the
              // ListToolbar with its "New" button), which would otherwise
              // bleed through the top of the tab and confuse users about
              // which page they're on.
              className="absolute inset-0 z-20 h-full w-full border-0 bg-background"
              style={{ display: isActive ? 'block' : 'none' }}
              // `allow-popups-to-escape-sandbox` lets `window.open` calls
              // from a tab open a fully un-sandboxed top-level browser tab.
              // Required so attachments-panel can route PDFs to a real
              // popup — Chrome's PDF viewer is a plugin and refuses to load
              // inside a sandboxed iframe, and popups inherit the sandbox
              // unless this flag is set.
              sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-modals allow-downloads"
            />
          );
        })}
      </div>
      <CloseConfirmDialog
        open={pendingClose !== null}
        tabTitle={pendingClose?.title ?? ''}
        onOpenChange={(o) => !o && setPendingClose(null)}
        onConfirm={confirmClose}
      />
    </div>
  );
}

function appendQuery(href: string, key: string, value: string): string {
  const qIndex = href.indexOf('?');
  if (qIndex === -1) return `${href}?${key}=${value}`;
  return `${href}&${key}=${value}`;
}
