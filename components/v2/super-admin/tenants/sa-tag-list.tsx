'use client';

import { addTag, removeTag } from '@/app/[locale]/(app)/super-admin/tenants/[id]/_actions/tags';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useRef, useState, useTransition } from 'react';

export interface SaTagListProps {
  tenantId: string;
  tags: Array<{ id: string; label: string; color: string }>;
  i18n: {
    addPlaceholder: string;
    addButton: string;
    adding: string;
    removeAria: string;
    empty: string;
    duplicate: string;
  };
}

export function SaTagList({ tenantId, tags, i18n }: SaTagListProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleAdd(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        await addTag(formData);
        if (inputRef.current) inputRef.current.value = '';
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
    });
  }

  function handleRemove(tagId: string) {
    startTransition(async () => {
      const fd = new FormData();
      fd.set('tenantId', tenantId);
      fd.set('tagId', tagId);
      await removeTag(fd);
    });
  }

  return (
    <>
      <form action={handleAdd} style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <input type="hidden" name="tenantId" value={tenantId} />
        <Input
          ref={inputRef}
          name="label"
          placeholder={i18n.addPlaceholder}
          maxLength={64}
          required
          disabled={isPending}
          style={{ flex: 1 }}
        />
        <Button type="submit" size="sm" variant="secondary" disabled={isPending}>
          {isPending ? i18n.adding : i18n.addButton}
        </Button>
      </form>

      {error ? (
        <p style={{ color: 'var(--destructive)', fontSize: 12.5, marginBottom: 10 }}>{error}</p>
      ) : null}

      {tags.length === 0 ? (
        <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>{i18n.empty}</p>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {tags.map((tag) => (
            <span
              key={tag.id}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 10px',
                background: 'var(--accent-soft)',
                color: 'var(--accent)',
                borderRadius: 999,
                fontSize: 12.5,
                fontWeight: 600,
              }}
            >
              {tag.label}
              <button
                type="button"
                onClick={() => handleRemove(tag.id)}
                disabled={isPending}
                aria-label={i18n.removeAria}
                style={{
                  background: 'transparent',
                  border: 0,
                  padding: 0,
                  color: 'inherit',
                  opacity: 0.7,
                  fontWeight: 700,
                  cursor: 'pointer',
                  lineHeight: 1,
                }}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </>
  );
}
