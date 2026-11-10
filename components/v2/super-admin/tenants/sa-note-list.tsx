'use client';

import { addNote, deleteNote } from '@/app/[locale]/(app)/super-admin/tenants/[id]/_actions/notes';
import { Button } from '@/components/ui/button';
import { useRef, useState, useTransition } from 'react';
import { SaConfirmDialog } from './sa-confirm-dialog';

export interface SaNoteListProps {
  tenantId: string;
  notes: Array<{
    id: string;
    body: string;
    when: string;
    author: string;
  }>;
  i18n: {
    addPlaceholder: string;
    addButton: string;
    adding: string;
    empty: string;
    deleteAria: string;
    confirmTitle: string;
    confirmDescription: string;
    cancel: string;
    confirmDelete: string;
  };
}

export function SaNoteList({ tenantId, notes, i18n }: SaNoteListProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function handleAdd(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        await addNote(formData);
        if (textareaRef.current) textareaRef.current.value = '';
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
    });
  }

  async function handleDelete(noteId: string) {
    const fd = new FormData();
    fd.set('tenantId', tenantId);
    fd.set('noteId', noteId);
    await deleteNote(fd);
  }

  return (
    <>
      <form action={handleAdd}>
        <input type="hidden" name="tenantId" value={tenantId} />
        <textarea
          ref={textareaRef}
          name="body"
          placeholder={i18n.addPlaceholder}
          rows={3}
          required
          maxLength={16_000}
          disabled={isPending}
          style={{
            width: '100%',
            padding: '10px 12px',
            border: '1px solid var(--border)',
            borderRadius: 8,
            background: 'var(--surface)',
            fontSize: 13,
            fontFamily: 'inherit',
            marginBottom: 10,
            resize: 'vertical',
          }}
        />
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            marginBottom: 14,
          }}
        >
          <Button type="submit" size="sm" disabled={isPending}>
            {isPending ? i18n.adding : i18n.addButton}
          </Button>
        </div>
      </form>

      {error ? (
        <p style={{ color: 'var(--destructive)', fontSize: 12.5, marginBottom: 10 }}>{error}</p>
      ) : null}

      {notes.length === 0 ? (
        <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>{i18n.empty}</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {notes.map((note, i) => (
            <div
              key={note.id}
              style={{
                padding: '12px 0',
                borderTop: i === 0 ? 'none' : '1px solid var(--border)',
                fontSize: 13.5,
                display: 'grid',
                gridTemplateColumns: '1fr auto',
                gap: 14,
                alignItems: 'start',
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
                  <b style={{ fontWeight: 600 }}>{note.author}</b>
                  <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{note.when}</span>
                </div>
                <div style={{ whiteSpace: 'pre-wrap' }}>{note.body}</div>
              </div>
              <SaConfirmDialog
                trigger={
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={i18n.deleteAria}
                    style={{ color: 'var(--text-muted)' }}
                  >
                    ×
                  </Button>
                }
                title={i18n.confirmTitle}
                description={i18n.confirmDescription}
                destructive
                confirmLabel={i18n.confirmDelete}
                cancelLabel={i18n.cancel}
                onConfirm={() => handleDelete(note.id)}
              />
            </div>
          ))}
        </div>
      )}
    </>
  );
}
