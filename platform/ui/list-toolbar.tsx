'use client';

import { Input } from '@/components/ui/input';
import { usePathname, useRouter } from '@/platform/i18n/navigation';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export function ListToolbar({
  placeholder,
  resultsLabel,
}: {
  placeholder: string;
  resultsLabel: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const initial = searchParams.get('q') ?? '';
  const [value, setValue] = useState(initial);

  useEffect(() => {
    setValue(initial);
  }, [initial]);

  useEffect(() => {
    const handle = setTimeout(() => {
      if (value === initial) return;
      const next = new URLSearchParams(Array.from(searchParams.entries()));
      if (value) next.set('q', value);
      else next.delete('q');
      next.delete('page');
      router.replace(`${pathname}?${next.toString()}`);
    }, 250);
    return () => clearTimeout(handle);
  }, [value, initial, pathname, router, searchParams]);

  return (
    <div className="flex items-center justify-between gap-4">
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="max-w-sm"
        aria-label={placeholder}
      />
      <span className="text-sm text-muted-foreground">{resultsLabel}</span>
    </div>
  );
}
