'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, ImageIcon, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { AttachmentUploader } from './attachment-uploader';
import { AttachmentViewer } from './attachment-viewer';

type Row = {
  id: string;
  filename: string;
  contentType: string;
  size: number;
  uploadedBy: string;
  createdAt: string;
};

type PanelProps = {
  entity: string;
  entityId: string;
};

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function AttachmentsPanel({ entity, entityId }: PanelProps) {
  const t = useTranslations('attachments');
  const [rows, setRows] = useState<Row[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [viewing, setViewing] = useState<Row | null>(null);

  const refresh = useCallback(async () => {
    const res = await fetch(
      `/api/attachments/list?entity=${encodeURIComponent(entity)}&entityId=${encodeURIComponent(entityId)}`,
    );
    if (res.ok) {
      const { items } = (await res.json()) as { items: Row[] };
      setRows(items);
    }
    setLoaded(true);
  }, [entity, entityId]);

  async function remove(id: string) {
    const res = await fetch(`/api/attachments/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setRows((r) => r.filter((x) => x.id !== id));
      toast.success(t('deleted'));
    } else {
      toast.error(t('deleteFailed'));
    }
  }

  function open(r: Row) {
    // Chrome's built-in PDF viewer is treated as a plugin and refuses to load
    // inside a sandboxed iframe — the tab system wraps every app page in a
    // `sandbox=...` iframe, so an in-modal PDF iframe stays blank with the
    // broken-document icon. Image rendering is unaffected (no plugin). For
    // PDFs in that case, skip the modal and open the file in a new top-level
    // browser tab where the viewer can load freely.
    if (
      r.contentType === 'application/pdf' &&
      typeof window !== 'undefined' &&
      window.frameElement?.hasAttribute('sandbox')
    ) {
      window.open(`/api/attachments/${r.id}/download?inline=1`, '_blank');
      return;
    }
    setViewing(r);
  }

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{t('title')}</CardTitle>
        <AttachmentUploader entity={entity} entityId={entityId} onUploaded={refresh} />
      </CardHeader>
      <CardContent>
        {!loaded ? (
          <p className="text-sm text-muted-foreground">{t('loading')}</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('empty')}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {rows.map((r) => {
              const isImage = r.contentType.startsWith('image/');
              return (
                <li
                  key={r.id}
                  className="flex items-center justify-between rounded border p-2 text-sm"
                >
                  <button
                    type="button"
                    onClick={() => open(r)}
                    className="flex min-w-0 flex-1 items-center gap-2 text-left transition-colors hover:text-foreground"
                  >
                    {isImage ? (
                      <ImageIcon className="size-4 shrink-0 text-muted-foreground" />
                    ) : (
                      <FileText className="size-4 shrink-0 text-muted-foreground" />
                    )}
                    <div className="flex min-w-0 flex-col">
                      <span className="truncate font-medium">{r.filename}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatSize(r.size)} · {new Date(r.createdAt).toLocaleString()}
                      </span>
                    </div>
                  </button>
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-label={t('delete')}
                    onClick={() => remove(r.id)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
      <AttachmentViewer
        open={viewing !== null}
        onOpenChange={(open) => {
          if (!open) setViewing(null);
        }}
        attachmentId={viewing?.id ?? null}
        filename={viewing?.filename ?? null}
        contentType={viewing?.contentType ?? null}
      />
    </Card>
  );
}
