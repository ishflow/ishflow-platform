'use client';

import { Search } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

/**
 * V2 middle-panel search. Decoupled from V2Panel via a custom DOM event so
 * this widget stays presentational. V2Panel mounts a window listener for
 * `v2-panel-search` and re-filters its rendered items against the dispatched
 * lowercase query.
 */
export function PanelSearch() {
  const t = useTranslations('v2_common');
  const [q, setQ] = useState('');

  useEffect(() => {
    const event = new CustomEvent('v2-panel-search', { detail: { q: q.trim().toLowerCase() } });
    window.dispatchEvent(event);
  }, [q]);

  return (
    <div className="panel-search">
      <span className="search-icon">
        <Search size={16} strokeWidth={1.75} />
      </span>
      <input
        type="text"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={t('search')}
      />
      <span className="kbd">⌘K</span>
    </div>
  );
}
