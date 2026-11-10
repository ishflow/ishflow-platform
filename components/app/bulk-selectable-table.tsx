'use client';

import { BulkActionBar } from '@/components/app/bulk-action-bar';
import { DataTable, type DataTableColumn } from '@/components/app/data-table';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useCallback, useState, useTransition } from 'react';
import { toast } from 'sonner';

type BulkResult =
  | { ok: true; successCount: number; failedIds: string[] }
  | { ok: false; formError: string };

type Row = { id: string; status?: string };

type Props<T extends Row> = {
  columns: DataTableColumn[];
  rows: T[];
  emptyMessage: string;
  linkBasePath?: string;
  locale: string;
  entity: string;
  mode: 'catalog' | 'document';
  onBulkDelete: (locale: string, entity: string, ids: string[]) => Promise<BulkResult>;
  onBulkPost?: (locale: string, entity: string, ids: string[]) => Promise<BulkResult>;
};

/**
 * Shared client wrapper for catalog + document list pages. Manages selection
 * state, renders the BulkActionBar, and dispatches server actions. Translations
 * are resolved client-side via next-intl.
 */
export function BulkSelectableTable<T extends Row>({
  columns,
  rows,
  emptyMessage,
  linkBasePath,
  locale,
  entity,
  mode,
  onBulkDelete,
  onBulkPost,
}: Props<T>) {
  const [selected, setSelected] = useState<T[]>([]);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const tCatalog = useTranslations('catalog');
  const tDoc = useTranslations('document');

  const t = mode === 'catalog' ? tCatalog : tDoc;

  const handleSelectionChange = useCallback((next: T[]) => {
    setSelected(next);
  }, []);

  const handleDelete = () => {
    const ids = selected.map((r) => r.id);
    if (ids.length === 0) return;
    if (!confirm(t('bulkDeleteConfirm', { count: ids.length }))) return;
    startTransition(async () => {
      const result = await onBulkDelete(locale, entity, ids);
      if (!result.ok) {
        toast.error(result.formError || tCatalog('errorGeneric'));
        return;
      }
      toast.success(t('bulkDeleted', { count: result.successCount }));
      if (result.failedIds.length > 0) {
        toast.error(t('bulkFailed', { count: result.failedIds.length }));
      }
      setSelected([]);
      router.refresh();
    });
  };

  const handlePost = () => {
    if (!onBulkPost || mode !== 'document') return;
    const draftIds = selected.filter((r) => r.status === 'SAVED').map((r) => r.id);
    if (draftIds.length === 0) return;
    startTransition(async () => {
      const result = await onBulkPost(locale, entity, draftIds);
      if (!result.ok) {
        toast.error(result.formError || tCatalog('errorGeneric'));
        return;
      }
      toast.success(tDoc('bulkPosted', { count: result.successCount }));
      if (result.failedIds.length > 0) {
        toast.error(tDoc('bulkFailed', { count: result.failedIds.length }));
      }
      setSelected([]);
      router.refresh();
    });
  };

  const postableCount =
    mode === 'document' ? selected.filter((r) => r.status === 'SAVED').length : 0;

  const actions = [] as Array<{
    kind: 'delete' | 'post';
    label: string;
    onRun: () => void;
    disabled?: boolean;
  }>;
  if (mode === 'document' && onBulkPost) {
    actions.push({
      kind: 'post',
      label: tDoc('bulkPost'),
      onRun: handlePost,
      disabled: pending || postableCount === 0,
    });
  }
  actions.push({
    kind: 'delete',
    label: t('bulkDelete'),
    onRun: handleDelete,
    disabled: pending,
  });

  return (
    <div className="flex flex-col gap-3">
      <BulkActionBar
        selectedCount={selected.length}
        onClear={() => setSelected([])}
        actions={actions}
      />
      <DataTable
        columns={columns}
        rows={rows}
        emptyMessage={emptyMessage}
        linkBasePath={linkBasePath}
        selectable
        onSelectionChange={handleSelectionChange}
      />
    </div>
  );
}
