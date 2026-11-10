'use client';

import { Search } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import './data.css';

/**
 * URL-driven search input for register views. Submitting (Enter)
 * rewrites `?q=<value>` while preserving all other query params.
 * Empty submit removes `q` from the URL.
 */
export function V2RegisterSearchInput({ placeholder }: { placeholder: string }) {
  const params = useSearchParams();
  const router = useRouter();
  const initial = params.get('q') ?? '';
  const [value, setValue] = useState(initial);

  // Live search: debounce typing and rewrite ?q= so the register filters as
  // you type (Enter still works immediately via the form submit below).
  useEffect(() => {
    const current = params.get('q') ?? '';
    const trimmed = value.trim();
    if (trimmed === current) return;
    const handle = setTimeout(() => {
      const next = new URLSearchParams(params);
      if (trimmed) next.set('q', trimmed);
      else next.delete('q');
      const qs = next.toString();
      router.push(qs ? `?${qs}` : '?', { scroll: false });
    }, 300);
    return () => clearTimeout(handle);
  }, [value, params, router]);

  return (
    <form
      className="search-input"
      onSubmit={(e) => {
        e.preventDefault();
        const next = new URLSearchParams(params);
        const trimmed = value.trim();
        if (trimmed) next.set('q', trimmed);
        else next.delete('q');
        const qs = next.toString();
        router.push(qs ? `?${qs}` : '?', { scroll: false });
      }}
    >
      <Search size={14} strokeWidth={1.75} />
      <input
        type="search"
        placeholder={placeholder}
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
    </form>
  );
}
