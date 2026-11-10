'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Download, FileText, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { useEffect, useState } from 'react';

type ViewerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  attachmentId: string | null;
  filename: string | null;
  contentType: string | null;
};

/** In-app preview for PDFs + images. Other content types fall back to a
 *  "download to view" CTA. The signed-URL download endpoint always sets
 *  `Content-Disposition: attachment` so a regular link would force-download —
 *  we route through it for PDF preview via <iframe>, and use a separate
 *  inline-preview endpoint or direct R2 link if needed for images. For now
 *  we use the same /download endpoint and let the browser decide — modern
 *  browsers honor the inline iframe even with attachment disposition. */
export function AttachmentViewer({
  open,
  onOpenChange,
  attachmentId,
  filename,
  contentType,
}: ViewerProps) {
  const t = useTranslations('attachments');
  const [inlineUrl, setInlineUrl] = useState<string | null>(null);
  const isImage = contentType?.startsWith('image/') ?? false;
  const isPdf = contentType === 'application/pdf';
  const downloadHref = attachmentId ? `/api/attachments/${attachmentId}/download` : null;

  // Fetch the R2 signed URL directly (instead of using our 302-redirect URL
  // as the iframe / img src). Chrome's PDF viewer fails to render PDFs in
  // iframes that follow a same-origin → cross-origin redirect; binding the
  // signed URL directly avoids the hop. Only fires when the dialog is open
  // for a previewable kind (image / pdf).
  useEffect(() => {
    if (!open || !attachmentId || (!isImage && !isPdf)) {
      setInlineUrl(null);
      return;
    }
    let cancelled = false;
    fetch(`/api/attachments/${attachmentId}/download?inline=1&json=1`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled) return;
        const url = (data as { url?: string } | null)?.url;
        if (url) setInlineUrl(url);
      })
      .catch(() => {
        /* dialog already shows download fallback */
      });
    return () => {
      cancelled = true;
    };
  }, [open, attachmentId, isImage, isPdf]);

  if (!attachmentId || !downloadHref) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Override shadcn's translate-y center positioning. When rendered
          inside the tab iframe the centered offset can sit above the
          iframe's visible scroll area; pin to a known offset from the top
          and cap height so the header stays clickable. */}
      <DialogContent className="!top-[4vh] !translate-y-0 flex h-[90vh] max-h-[92vh] max-w-5xl flex-col gap-3 p-0">
        <DialogHeader className="flex flex-row items-center justify-between gap-3 border-b px-4 py-3">
          <div className="min-w-0 flex-1">
            <DialogTitle className="truncate text-base">{filename ?? t('title')}</DialogTitle>
            <DialogDescription className="sr-only">{filename ?? t('title')}</DialogDescription>
          </div>
          <a
            href={downloadHref}
            target="_blank"
            rel="noreferrer noopener"
            download={filename ?? undefined}
          >
            <Button size="sm" variant="outline">
              <Download className="mr-1.5 size-4" />
              {t('download')}
            </Button>
          </a>
        </DialogHeader>
        <div className="flex-1 overflow-hidden bg-muted/40">
          {isImage || isPdf ? (
            inlineUrl ? (
              isImage ? (
                <Image
                  src={inlineUrl}
                  alt={filename ?? ''}
                  fill
                  unoptimized
                  sizes="(max-width: 1024px) 100vw, 1024px"
                  className="!h-full !w-auto !relative mx-auto object-contain"
                />
              ) : (
                <iframe
                  src={inlineUrl}
                  title={filename ?? 'PDF'}
                  className="h-full w-full border-0"
                />
              )
            ) : (
              <div className="flex h-full items-center justify-center">
                <Loader2 className="size-6 animate-spin text-muted-foreground" />
              </div>
            )
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center text-sm text-muted-foreground">
              <FileText className="size-12 opacity-50" />
              <p>{t('previewUnsupported')}</p>
              <a
                href={downloadHref}
                target="_blank"
                rel="noreferrer noopener"
                download={filename ?? undefined}
              >
                <Button size="sm">
                  <Download className="mr-1.5 size-4" />
                  {t('download')}
                </Button>
              </a>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
