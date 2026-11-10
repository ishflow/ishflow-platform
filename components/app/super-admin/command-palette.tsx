'use client';

/**
 * Super Admin global command palette.
 *
 * - Triggers: ⌘K (macOS), Ctrl+K (Windows/Linux), `/`.
 * - Renders a debounced search across tenants / users / audit / addons.
 * - Each result is a `<Link>` to the relevant SA page.
 *
 * Mounted by `app/super-admin/layout.tsx` so it is available on every
 * super-admin route. The component intentionally renders nothing until the
 * user opens it — the shadcn `CommandDialog` handles its own portal.
 */

import { Building2, History, LayoutDashboard, PackagePlus, User } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react';

import { type SearchPlatformResult, searchPlatformAction } from '@/app/super-admin/_actions/search';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import type { SuperAdminDict } from '@/platform/super-admin/dict';

interface CommandPaletteProps {
  readonly dict: SuperAdminDict['shell']['palette'];
}

const EMPTY_RESULT: SearchPlatformResult = {
  query: '',
  tenants: [],
  users: [],
  audit: [],
  addons: [],
};

const DEBOUNCE_MS = 180;

/**
 * Skip the global shortcut when the user is typing in another input/textarea
 * or any contentEditable element. Without this guard, `/` would steal focus
 * mid-sentence and feel hostile.
 */
function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (target.isContentEditable) return true;
  return false;
}

export function CommandPalette({ dict }: CommandPaletteProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchPlatformResult>(EMPTY_RESULT);
  const [isPending, startTransition] = useTransition();
  const lastRequestedQuery = useRef<string>('');

  // Global hotkey: ⌘K / Ctrl+K / `/`.
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      const isCmd = e.key === 'k' && (e.metaKey || e.ctrlKey);
      const isSlash = e.key === '/' && !e.metaKey && !e.ctrlKey && !e.altKey;
      if (isCmd) {
        e.preventDefault();
        setOpen((prev) => !prev);
        return;
      }
      if (isSlash && !isTypingTarget(e.target)) {
        e.preventDefault();
        setOpen(true);
      }
    }
    window.addEventListener('keydown', handler);
    return () => {
      window.removeEventListener('keydown', handler);
    };
  }, []);

  // Debounced search — only fires when the dialog is open and the query is
  // long enough. Discards stale responses so the latest query always wins.
  useEffect(() => {
    if (!open) return;
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults(EMPTY_RESULT);
      return;
    }
    const id = setTimeout(() => {
      lastRequestedQuery.current = trimmed;
      startTransition(async () => {
        try {
          const next = await searchPlatformAction(trimmed);
          if (lastRequestedQuery.current === trimmed) {
            setResults(next);
          }
        } catch {
          // Swallow — the palette never crashes the shell.
          if (lastRequestedQuery.current === trimmed) {
            setResults({ ...EMPTY_RESULT, query: trimmed });
          }
        }
      });
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(id);
    };
  }, [open, query]);

  // Reset state on close so the next open starts clean.
  useEffect(() => {
    if (!open) {
      setQuery('');
      setResults(EMPTY_RESULT);
      lastRequestedQuery.current = '';
    }
  }, [open]);

  const navigate = useCallback(
    (href: string) => {
      setOpen(false);
      router.push(href);
    },
    [router],
  );

  const trimmed = query.trim();
  const tooShort = trimmed.length > 0 && trimmed.length < 2;
  const hasAnyHit = useMemo(
    () =>
      results.tenants.length > 0 ||
      results.users.length > 0 ||
      results.audit.length > 0 ||
      results.addons.length > 0,
    [results],
  );

  return (
    <CommandDialog open={open} onOpenChange={setOpen} title={dict.trigger} description={dict.hint}>
      <CommandInput placeholder={dict.placeholder} value={query} onValueChange={setQuery} />
      <CommandList>
        {tooShort ? (
          <CommandEmpty>{dict.typeMore}</CommandEmpty>
        ) : !hasAnyHit ? (
          <CommandEmpty>{isPending ? dict.loading : dict.empty}</CommandEmpty>
        ) : null}

        {results.tenants.length > 0 ? (
          <>
            <CommandGroup heading={dict.groups.tenants}>
              {results.tenants.map((t) => (
                <CommandItem
                  key={`tenant-${t.id}`}
                  value={`tenant ${t.name} ${t.slug}`}
                  onSelect={() => {
                    navigate(t.href);
                  }}
                  asChild
                >
                  <Link href={t.href}>
                    <Building2 />
                    <span className="truncate">{t.name}</span>
                    <span className="text-muted-foreground ml-auto truncate text-xs">{t.slug}</span>
                  </Link>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
          </>
        ) : null}

        {results.users.length > 0 ? (
          <>
            <CommandGroup heading={dict.groups.users}>
              {results.users.map((u) => (
                <CommandItem
                  key={`user-${u.id}`}
                  value={`user ${u.email} ${u.displayName} ${u.clerkId}`}
                  onSelect={() => {
                    navigate(u.href);
                  }}
                  asChild
                >
                  <Link href={u.href}>
                    <User />
                    <span className="truncate">{u.displayName}</span>
                    <span className="text-muted-foreground ml-auto truncate text-xs">
                      {u.email}
                    </span>
                  </Link>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
          </>
        ) : null}

        {results.audit.length > 0 ? (
          <>
            <CommandGroup heading={dict.groups.audit}>
              {results.audit.map((a) => (
                <CommandItem
                  key={`audit-${a.id}`}
                  value={`audit ${a.action} ${a.actorClerkId}`}
                  onSelect={() => {
                    navigate(a.href);
                  }}
                  asChild
                >
                  <Link href={a.href}>
                    <History />
                    <span className="truncate">{a.action}</span>
                    <span className="text-muted-foreground ml-auto truncate text-xs">
                      {a.actorClerkId}
                    </span>
                  </Link>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
          </>
        ) : null}

        {results.addons.length > 0 ? (
          <CommandGroup heading={dict.groups.addons}>
            {results.addons.map((addon) => (
              <CommandItem
                key={`addon-${addon.key}`}
                value={`addon ${addon.key}`}
                onSelect={() => {
                  navigate(addon.href);
                }}
                asChild
              >
                <Link href={addon.href}>
                  <PackagePlus />
                  <span className="truncate">{addon.key}</span>
                  <span className="text-muted-foreground ml-auto text-xs uppercase">
                    {addon.status}
                  </span>
                </Link>
              </CommandItem>
            ))}
          </CommandGroup>
        ) : null}

        {/*
         * Always-present "go to dashboard" affordance — useful when the user
         * opens the palette without typing anything. Lives in its own group
         * so it never mixes with search hits.
         */}
        {!trimmed ? (
          <CommandGroup heading={dict.groups.navigation}>
            <CommandItem
              value="navigation dashboard"
              onSelect={() => {
                navigate('/super-admin');
              }}
              asChild
            >
              <Link href="/super-admin">
                <LayoutDashboard />
                <span>{dict.shortcuts.open}</span>
              </Link>
            </CommandItem>
          </CommandGroup>
        ) : null}
      </CommandList>
    </CommandDialog>
  );
}
