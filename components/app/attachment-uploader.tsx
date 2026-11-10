'use client';

import { Button } from '@/components/ui/button';
import { slugifyFilename } from '@/lib/slugify-filename';
import { Upload } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRef, useTransition } from 'react';
import { toast } from 'sonner';

type UploaderProps = {
  entity: string;
  entityId: string;
  onUploaded: () => void;
};

const MAX_BYTES = 20 * 1024 * 1024;

export function AttachmentUploader({ entity, entityId, onUploaded }: UploaderProps) {
  const t = useTranslations('attachments');
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, start] = useTransition();

  async function upload(file: File) {
    if (file.size > MAX_BYTES) {
      toast.error(t('tooLarge'));
      return;
    }
    try {
      const slugged = slugifyFilename(file.name);
      const sign = await fetch('/api/attachments/sign-put', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          entity,
          entityId,
          filename: slugged,
          displayName: file.name,
          contentType: file.type || 'application/octet-stream',
          size: file.size,
        }),
      });
      if (!sign.ok) {
        toast.error(t('signFailed'));
        return;
      }
      const { putUrl } = (await sign.json()) as { putUrl: string };
      const put = await fetch(putUrl, {
        method: 'PUT',
        body: file,
        headers: { 'content-type': file.type || 'application/octet-stream' },
      });
      if (!put.ok) {
        toast.error(t('uploadFailed'));
        return;
      }
      toast.success(t('uploaded'));
      onUploaded();
    } catch (err) {
      // Most common cause: R2 CORS rejecting the browser PUT — fetch throws
      // a TypeError that React would otherwise bubble to the nearest error
      // boundary and blank the page. Catch + toast keeps the form alive.
      console.error('[attachment-uploader] upload failed', err);
      toast.error(t('uploadFailed'));
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) start(() => upload(file));
          e.target.value = '';
        }}
      />
      <Button
        variant="outline"
        size="sm"
        onClick={() => inputRef.current?.click()}
        disabled={pending}
      >
        <Upload className="size-4" />
        {pending ? t('uploading') : t('upload')}
      </Button>
    </>
  );
}
