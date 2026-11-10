'use client';

import { V2CommandPalette } from '@/components/v2/settings/shared/command-palette';
import { useEffect, useState } from 'react';

/**
 * Mounts the global command palette and binds ⌘K / Ctrl+K to toggle it.
 * Rendered once in the app shell so the shortcut works on every page
 * (QA #68 — the palette existed but was never mounted, so ⌘K did nothing).
 */
export function V2CommandPaletteMount() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((o) => !o);
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  return <V2CommandPalette open={open} onClose={() => setOpen(false)} />;
}
